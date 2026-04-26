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
  if (process.env.RESEARCH_USER_ID) return process.env.RESEARCH_USER_ID;
  const rows = await query<{ id: string }>('SELECT id FROM users ORDER BY "createdAt" LIMIT 1');
  if (!rows.length) throw new Error('No user found');
  return rows[0].id;
}

const TOOLS = [
  {
    name: 'get_active_tasks',
    description: '获取用户当前进行中和待办的任务列表',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'], description: '按状态过滤' },
        limit: { type: 'number', description: '返回数量上限', default: 20 },
      },
    },
  },
  {
    name: 'get_recently_completed',
    description: '获取用户最近完成的任务',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: '返回数量', default: 10 },
        days: { type: 'number', description: '最近多少天内', default: 7 },
      },
    },
  },
  {
    name: 'get_task_stats',
    description: '获取用户的任务统计概览',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: '统计最近多少天', default: 30 },
      },
    },
  },
  {
    name: 'get_high_priority_tasks',
    description: '获取用户的高优先级（P1/P2）任务',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
] as const;

const server = new Server(
  { name: 'research-task-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const userId = await getUserId();

  try {
    switch (name) {
      case 'get_active_tasks': {
        const statusFilter = args?.status ? z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).parse(args.status) : null;
        const limit = z.number().int().min(1).max(100).parse(args?.limit || 20);
        const sql = statusFilter
          ? `SELECT id, title, status, priority, "pomodoroCount", "dueDate", "createdAt"
             FROM tasks WHERE "userId" = $1 AND "deletedAt" IS NULL AND status = $2
             ORDER BY priority ASC, "createdAt" DESC LIMIT $3`
          : `SELECT id, title, status, priority, "pomodoroCount", "dueDate", "createdAt"
             FROM tasks WHERE "userId" = $1 AND "deletedAt" IS NULL AND status IN ('TODO', 'IN_PROGRESS')
             ORDER BY priority ASC, "sortOrder" ASC LIMIT $2`;
        const params = statusFilter ? [userId, statusFilter, limit] : [userId, limit];
        const rows = await query(sql, params);
        return { content: [{ type: 'text', text: JSON.stringify({ tasks: rows }, null, 2) }] };
      }

      case 'get_recently_completed': {
        const limit = z.number().int().min(1).max(100).parse(args?.limit || 10);
        const days = z.number().int().min(1).max(365).parse(args?.days || 7);
        const rows = await query(
          `SELECT id, title, priority, "pomodoroCount", "createdAt", "updatedAt"
           FROM tasks
           WHERE "userId" = $1 AND "deletedAt" IS NULL AND status = 'DONE'
             AND "updatedAt" >= CURRENT_DATE - INTERVAL '${days} days'
           ORDER BY "updatedAt" DESC LIMIT $2`,
          [userId, limit]
        );
        return { content: [{ type: 'text', text: JSON.stringify({ days, tasks: rows }, null, 2) }] };
      }

      case 'get_task_stats': {
        const days = z.number().int().min(1).max(365).parse(args?.days || 30);
        const rows = await query<{ status: string; count: number }>(
          `SELECT status, COUNT(*)::int AS count
           FROM tasks
           WHERE "userId" = $1 AND "deletedAt" IS NULL
             AND "createdAt" >= CURRENT_DATE - INTERVAL '${days} days'
           GROUP BY status`,
          [userId]
        );
        const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
        const done = Number(rows.find((r) => r.status === 'DONE')?.count || 0);
        return {
          content: [{ type: 'text', text: JSON.stringify({ days, total, completed: done, completion_rate: total ? (done / total).toFixed(2) : '0.00', breakdown: rows }, null, 2) }],
        };
      }

      case 'get_high_priority_tasks': {
        const rows = await query(
          `SELECT id, title, status, priority, "dueDate", "pomodoroCount"
           FROM tasks
           WHERE "userId" = $1 AND "deletedAt" IS NULL AND priority <= 2 AND status IN ('TODO', 'IN_PROGRESS')
           ORDER BY priority ASC, "dueDate" ASC NULLS LAST`,
          [userId]
        );
        return { content: [{ type: 'text', text: JSON.stringify({ high_priority_tasks: rows }, null, 2) }] };
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
console.error('Research Task MCP Server running on stdio');
