import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'pg';
import { z } from 'zod';

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
  const rows = await query<{ id: string }>('SELECT id FROM users ORDER BY "createdAt" LIMIT 1');
  if (!rows.length) throw new Error('No user found');
  return rows[0].id;
}

const TOOLS = [
  {
    name: 'get_today_events',
    description: '获取用户今日的日程事件',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_week_overview',
    description: '获取本周的日程概览',
    inputSchema: {
      type: 'object' as const,
      properties: {
        week_start: { type: 'string', description: '周一开始日期 YYYY-MM-DD，默认本周一' },
      },
    },
  },
  {
    name: 'get_upcoming_deadlines',
    description: '获取未来即将到期的事件和截止日期',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: '未来多少天内', default: 7 },
      },
    },
  },
  {
    name: 'get_busy_hours',
    description: '获取指定日期的忙碌时段',
    inputSchema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: '日期 YYYY-MM-DD，默认今天' },
      },
    },
  },
] as const;

const server = new Server(
  { name: 'phd-calendar-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const userId = await getUserId();

  try {
    switch (name) {
      case 'get_today_events': {
        const rows = await query(
          `SELECT id, title, "startAt", "endAt", location, description, color, "isAllDay"
           FROM events
           WHERE "userId" = $1 AND "deletedAt" IS NULL AND DATE("startAt") = CURRENT_DATE
           ORDER BY "startAt" ASC`,
          [userId]
        );
        return { content: [{ type: 'text', text: JSON.stringify({ date: new Date().toISOString().split('T')[0], events: rows }, null, 2) }] };
      }

      case 'get_week_overview': {
        const weekStart = args?.week_start
          ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args.week_start)
          : null;
        const sql = weekStart
          ? `SELECT id, title, "startAt", "endAt", location, color, "isAllDay"
             FROM events
             WHERE "userId" = $1 AND "deletedAt" IS NULL
               AND "startAt" >= $2::date AND "startAt" < ($2::date + INTERVAL '7 days')
             ORDER BY "startAt" ASC`
          : `SELECT id, title, "startAt", "endAt", location, color, "isAllDay"
             FROM events
             WHERE "userId" = $1 AND "deletedAt" IS NULL
               AND "startAt" >= DATE_TRUNC('week', CURRENT_DATE)
               AND "startAt" < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
             ORDER BY "startAt" ASC`;
        const params = weekStart ? [userId, weekStart] : [userId];
        const rows = await query(sql, params);
        return { content: [{ type: 'text', text: JSON.stringify({ week_start: weekStart || 'this week', events: rows }, null, 2) }] };
      }

      case 'get_upcoming_deadlines': {
        const days = z.number().int().min(1).max(90).parse(args?.days || 7);
        const rows = await query(
          `SELECT id, title, "startAt", "endAt", location, description, color
           FROM events
           WHERE "userId" = $1 AND "deletedAt" IS NULL
             AND "startAt" >= NOW()
             AND "startAt" < NOW() + INTERVAL '${days} days'
           ORDER BY "startAt" ASC`,
          [userId]
        );
        return { content: [{ type: 'text', text: JSON.stringify({ days, upcoming_events: rows }, null, 2) }] };
      }

      case 'get_busy_hours': {
        const date = args?.date
          ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args.date)
          : new Date().toISOString().split('T')[0];
        const rows = await query<{ start_at: string; end_at: string; title: string }>(
          `SELECT "startAt" AS start_at, "endAt" AS end_at, title
           FROM events
           WHERE "userId" = $1 AND "deletedAt" IS NULL AND DATE("startAt") = $2::date
           ORDER BY "startAt" ASC`,
          [userId, date]
        );
        const busyBlocks = rows.map((r) => ({
          title: r.title,
          start: new Date(r.start_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          end: new Date(r.end_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }));
        return { content: [{ type: 'text', text: JSON.stringify({ date, busy_blocks: busyBlocks }, null, 2) }] };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: JSON.stringify({ error: msg }, null, 2) }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('PhD Calendar MCP Server running on stdio');
