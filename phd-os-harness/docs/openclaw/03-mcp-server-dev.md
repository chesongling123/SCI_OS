# MCP Server Development Guide for PhD_OS

> How to build custom MCP Servers that expose PhD_OS internal data to the OpenClaw agent.

---

## 1. What is MCP

MCP (Model Context Protocol) is the standard protocol for AI tools. An MCP Server:
- Exposes a set of **tools** (functions the AI can call)
- Communicates via stdio (Server) ↔ OpenClaw Gateway's MCPorter (Client)
- Uses JSON-RPC 2.0 message format
- Each tool has a JSON Schema input definition

## 2. When to Build a Custom MCP Server

Build one when OpenClaw needs access to PhD_OS's internal data:

| Data Source | MCP Server Purpose | Example Tools |
|-------------|-------------------|---------------|
| Pomodoro sessions | Focus time analysis | `get_today_sessions`, `get_focus_stats` |
| Tasks | Research task context | `get_active_tasks`, `get_recently_completed` |
| Calendar events | Schedule awareness | `get_today_events`, `get_week_overview` |
| Notes (future) | Knowledge base queries | `search_notes`, `get_related_notes` |
| User preferences | Personalization | `get_user_profile`, `get_research_interests` |

## 3. Project Setup

Create MCP Servers in a dedicated directory:

```
packages/mcp-servers/
├── pomodoro-mcp/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── task-mcp/
└── calendar-mcp/
```

### package.json Template

```json
{
  "name": "@phd/mcp-pomodoro",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

### tsconfig.json Template

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

## 4. Complete MCP Server Example: Pomodoro

This is the reference implementation. All other MCP Servers follow this pattern.

```typescript
// packages/mcp-servers/pomodoro-mcp/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// ── Database Connection ──
// MCP Servers connect to the same PostgreSQL instance as the backend
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://phd:phd@127.0.0.1:5433/phd_os';

// Simple query helper (in production, use a connection pool)
async function query(sql: string, params?: any[]): Promise<any[]> {
  // Implementation uses pg client or Prisma
  // For standalone MCP Servers, use `pg` package directly
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const result = await client.query(sql, params);
  await client.end();
  return result.rows;
}

// ── Tool Definitions ──
const TOOLS = [
  {
    name: 'get_today_sessions',
    description: 'Get the user\'s pomodoro sessions for today',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_focus_stats',
    description: 'Get focus statistics for a date range',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        granularity: {
          type: 'string',
          enum: ['daily', 'weekly'],
          description: 'Aggregation granularity',
          default: 'daily',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_optimal_focus_hours',
    description: 'Analyze which hours of the day the user is most productive',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Number of past days to analyze',
          default: 30,
        },
      },
    },
  },
  {
    name: 'get_current_focus_status',
    description: 'Check if there is an active pomodoro session right now',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
] as const;

// ── Server Setup ──
const server = new Server(
  {
    name: 'phd-pomodoro-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Handler: List Available Tools ──
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// ── Handler: Execute Tool ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_today_sessions': {
        const rows = await query(`
          SELECT task_name, duration, completed_at, interruption_count, notes
          FROM pomodoro_sessions
          WHERE user_id = (SELECT id FROM users WHERE email = 'demo@phd-os.local')
            AND DATE(completed_at) = CURRENT_DATE
            AND deleted_at IS NULL
          ORDER BY completed_at DESC
        `);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ date: new Date().toISOString().split('T')[0], sessions: rows }, null, 2),
          }],
        };
      }

      case 'get_focus_stats': {
        const startDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args?.start_date);
        const endDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args?.end_date);
        const granularity = z.enum(['daily', 'weekly']).parse(args?.granularity || 'daily');

        const dateTrunc = granularity === 'weekly' ? 'week' : 'day';
        const rows = await query(`
          SELECT
            DATE_TRUNC($1, completed_at)::date AS period,
            SUM(duration) AS total_minutes,
            COUNT(*) AS session_count,
            AVG(interruption_count)::float AS avg_interruptions,
            COUNT(DISTINCT task_name) AS unique_tasks
          FROM pomodoro_sessions
          WHERE user_id = (SELECT id FROM users WHERE email = 'demo@phd-os.local')
            AND completed_at BETWEEN $2 AND $3
            AND deleted_at IS NULL
          GROUP BY DATE_TRUNC($1, completed_at)
          ORDER BY period DESC
        `, [dateTrunc, startDate, endDate]);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ granularity, startDate, endDate, stats: rows }, null, 2),
          }],
        };
      }

      case 'get_optimal_focus_hours': {
        const days = z.number().int().min(1).max(365).parse(args?.days || 30);

        const rows = await query(`
          SELECT
            EXTRACT(HOUR FROM completed_at)::int AS hour,
            COUNT(*) AS session_count,
            AVG(duration)::float AS avg_duration,
            AVG(CASE WHEN interruption_count = 0 THEN 1 ELSE 0 END)::float AS focus_rate
          FROM pomodoro_sessions
          WHERE user_id = (SELECT id FROM users WHERE email = 'demo@phd-os.local')
            AND completed_at >= CURRENT_DATE - INTERVAL '${days} days'
            AND deleted_at IS NULL
          GROUP BY EXTRACT(HOUR FROM completed_at)
          ORDER BY focus_rate DESC, session_count DESC
          LIMIT 5
        `);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ analysis_period_days: days, optimal_hours: rows }, null, 2),
          }],
        };
      }

      case 'get_current_focus_status': {
        const rows = await query(`
          SELECT
            id, task_name, started_at, duration,
            CASE
              WHEN completed_at IS NULL
               AND started_at + (duration || ' minutes')::interval > NOW()
              THEN 'active'
              WHEN completed_at IS NULL THEN 'expired'
              ELSE 'completed'
            END AS status
          FROM pomodoro_sessions
          WHERE user_id = (SELECT id FROM users WHERE email = 'demo@phd-os.local')
            AND deleted_at IS NULL
          ORDER BY started_at DESC
          LIMIT 1
        `);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ current_session: rows[0] || null }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2),
      }],
      isError: true,
    };
  }
});

// ── Start Server ──
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('PhD Pomodoro MCP Server running on stdio');
```

## 5. Register MCP Server in OpenClaw

Add to `~/.openclaw/openclaw.json`:

```json
{
  "mcpServers": {
    "phd-pomodoro": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "DATABASE_URL=postgresql://phd:phd@host.docker.internal:5433/phd_os",
        "-v", "/path/to/phd-os/packages/mcp-servers/pomodoro-mcp/dist:/app",
        "-w", "/app",
        "node:20-alpine",
        "node", "/app/index.js"
      ]
    }
  }
}
```

**Note**: The `docker` command pattern is required for security sandboxing. Never use direct `node` commands in production.

## 6. Testing the MCP Server

### 6.1 Direct stdio Test

```bash
cd packages/mcp-servers/pomodoro-mcp
pnpm build

# Test with MCP inspector (npm package)
npx @modelcontextprotocol/inspector node dist/index.js
```

### 6.2 Via OpenClaw Gateway

```bash
# Restart gateway to pick up config changes
openclaw gateway restart

# List available tools
openclaw tools list

# Call a tool directly
openclaw tools call phd-pomodoro get_today_sessions
```

### 6.3 Via PhD_OS Backend

```bash
curl -X POST http://localhost:3000/api/v1/ai/tools/discover \
  -H "Content-Type: application/json"

# Expected response:
# { "tools": ["phd-pomodoro/get_today_sessions", "phd-pomodoro/get_focus_stats", ...] }
```

## 7. MCP Server Pattern Checklist

Every new MCP Server MUST follow this checklist:

- [ ] `name` field uses `phd-` prefix (e.g., `phd-task-mcp`)
- [ ] `DATABASE_URL` read from environment variable
- [ ] All queries filter by `deleted_at IS NULL`
- [ ] All queries filter by user (via subquery until auth system is ready)
- [ ] Input parameters validated with Zod schemas
- [ ] Error responses set `isError: true` flag
- [ ] Tool descriptions are clear enough for an AI to understand when to use them
- [ ] Docker sandbox command used in `openclaw.json`
- [ ] `package.json` uses `"type": "module"`

## 8. MCP Servers to Build

Priority order for PhD_OS Phase 2:

| Priority | MCP Server | Key Tools | Data Source |
|----------|-----------|-----------|-------------|
| P0 | `phd-pomodoro` | `get_today_sessions`, `get_focus_stats`, `get_optimal_focus_hours` | `pomodoro_sessions` table |
| P0 | `phd-task` | `get_active_tasks`, `get_recently_completed`, `get_tasks_by_status` | `tasks` table |
| P1 | `phd-calendar` | `get_today_events`, `get_week_overview`, `get_upcoming_deadlines` | `events` table |
| P1 | `phd-note` | `search_notes`, `get_related_notes`, `create_note` | Notes system (Phase 2) |
| P2 | `phd-literature` | `get_recent_papers`, `search_by_keyword`, `get_paper_notes` | Zotero + notes |
