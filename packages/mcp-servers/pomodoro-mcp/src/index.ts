import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'pg';
import { z } from 'zod';

// ── 数据库连接 ──
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://phd:phd@127.0.0.1:5433/phd_os';

async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

async function getUserId(): Promise<string> {
  if (process.env.PHD_USER_ID) return process.env.PHD_USER_ID;
  const rows = await query<{ id: string }>('SELECT id FROM users ORDER BY createdAt LIMIT 1');
  if (!rows.length) throw new Error('No user found in database');
  return rows[0].id;
}

// ── 工具定义 ──
const TOOLS = [
  {
    name: 'get_today_sessions',
    description: '获取用户今日的番茄钟专注记录',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_focus_stats',
    description: '获取指定日期范围内的专注统计数据',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: '开始日期 YYYY-MM-DD' },
        end_date: { type: 'string', description: '结束日期 YYYY-MM-DD' },
        granularity: { type: 'string', enum: ['daily', 'weekly'], description: '聚合粒度', default: 'daily' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_optimal_focus_hours',
    description: '分析用户一天中哪些时段专注效率最高',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: '分析最近多少天的数据', default: 30 },
      },
    },
  },
  {
    name: 'get_current_focus_status',
    description: '检查当前是否有进行中的番茄钟会话',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_today_focus_summary',
    description: '获取今日专注摘要（总时长、完成数、中断数）',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
] as const;

// ── Server 设置 ──
const server = new Server(
  { name: 'phd-pomodoro-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const userId = await getUserId();

  try {
    switch (name) {
      case 'get_today_sessions': {
        const rows = await query(
          `SELECT id, duration, plannedDuration, interruptions, startedAt, endedAt, notes
           FROM pomodoro_sessions
           WHERE "userId" = $1 AND DATE("startedAt") = CURRENT_DATE
           ORDER BY "startedAt" DESC`,
          [userId]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify({ date: new Date().toISOString().split('T')[0], sessions: rows }, null, 2) }],
        };
      }

      case 'get_focus_stats': {
        const startDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args?.start_date);
        const endDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args?.end_date);
        const granularity = z.enum(['daily', 'weekly']).parse(args?.granularity || 'daily');
        const dateTrunc = granularity === 'weekly' ? 'week' : 'day';

        const rows = await query(
          `SELECT DATE_TRUNC($1, "startedAt")::date AS period,
                  SUM(duration) AS total_seconds,
                  COUNT(*) AS session_count,
                  AVG(interruptions)::float AS avg_interruptions
           FROM pomodoro_sessions
           WHERE "userId" = $2 AND "startedAt" BETWEEN $3 AND $4
           GROUP BY DATE_TRUNC($1, "startedAt")
           ORDER BY period DESC`,
          [dateTrunc, userId, startDate, endDate]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify({ granularity, startDate, endDate, stats: rows }, null, 2) }],
        };
      }

      case 'get_optimal_focus_hours': {
        const days = z.number().int().min(1).max(365).parse(args?.days || 30);
        const rows = await query(
          `SELECT EXTRACT(HOUR FROM "startedAt")::int AS hour,
                  COUNT(*) AS session_count,
                  AVG(duration)::float AS avg_duration_seconds,
                  AVG(CASE WHEN interruptions = 0 THEN 1 ELSE 0 END)::float AS focus_rate
           FROM pomodoro_sessions
           WHERE "userId" = $1 AND "startedAt" >= CURRENT_DATE - INTERVAL '${days} days'
           GROUP BY EXTRACT(HOUR FROM "startedAt")
           ORDER BY focus_rate DESC, session_count DESC
           LIMIT 5`,
          [userId]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify({ analysis_period_days: days, optimal_hours: rows }, null, 2) }],
        };
      }

      case 'get_current_focus_status': {
        const rows = await query(
          `SELECT id, duration, "plannedDuration", "startedAt", interruptions,
                  CASE WHEN "endedAt" IS NULL AND "startedAt" + ("plannedDuration" || ' seconds')::interval > NOW()
                       THEN 'active'
                       WHEN "endedAt" IS NULL THEN 'expired'
                       ELSE 'completed'
                  END AS status
           FROM pomodoro_sessions
           WHERE "userId" = $1
           ORDER BY "startedAt" DESC
           LIMIT 1`,
          [userId]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify({ current_session: rows[0] || null }, null, 2) }],
        };
      }

      case 'get_today_focus_summary': {
        const rows = await query<{ total_seconds: number; session_count: number; total_interruptions: number }>(
          `SELECT COALESCE(SUM(duration), 0) AS total_seconds,
                  COUNT(*) AS session_count,
                  COALESCE(SUM(interruptions), 0) AS total_interruptions
           FROM pomodoro_sessions
           WHERE "userId" = $1 AND DATE("startedAt") = CURRENT_DATE`,
          [userId]
        );
        const s = rows[0];
        const minutes = Math.floor(s.total_seconds / 60);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return {
          content: [{ type: 'text', text: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            total_duration: `${hours}h ${mins}m`,
            session_count: Number(s.session_count),
            total_interruptions: Number(s.total_interruptions),
          }, null, 2) }],
        };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: JSON.stringify({ error: msg }, null, 2) }], isError: true };
  }
});

// ── 启动 ──
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('PhD Pomodoro MCP Server running on stdio');
