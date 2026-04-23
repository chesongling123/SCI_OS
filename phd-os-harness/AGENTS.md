# PhD_OS — AI Agent Development Harness

> Repository-local knowledge base for AI coding agents working on the PhD_OS research assistant platform.
> Last updated: 2026-04-22

## Project Identity

PhD_OS is a monorepo research workstation for PhD students. It provides task kanban, calendar management, pomodoro timer, AI assistant (via OpenClaw), note-taking, and literature management — all behind a liquid-glass UI design system.

## Tech Stack (Immutable)

- **Runtime**: Node.js 20 (`.nvmrc` locked), pnpm workspace
- **Frontend**: React 19 + Vite 6 + TypeScript 5.5 + Tailwind CSS 3.4 + TanStack Query v5
- **Backend**: NestJS 11 + Prisma 6.6.0 + PostgreSQL 15 (port 5433) + Redis 7
- **AI Layer**: OpenClaw Gateway (WebSocket port 18789) + LiteLLM Proxy
- **Shared**: `@phd/shared-types` package in `packages/shared-types/`

## Workspace Layout

```
phd-os/
├── AGENTS.md                 ← You are here
├── apps/
│   ├── frontend/             ← React app (port 5173)
│   │   └── AGENTS.md         ← Frontend-specific rules
│   └── backend/              ← NestJS API (port 3000)
│       └── AGENTS.md         ← Backend-specific rules
├── packages/shared-types/    ← Shared DTOs, enums, interfaces
├── docker-compose.yml        ← PostgreSQL + Redis only
├── docs/openclaw/            ← OpenClaw integration deep docs
└── docs/harness/             ← Coding conventions & ADRs
```

## Build Commands

Run these from repo root:

```bash
pnpm install                  # Install all deps
pnpm -F @phd/shared-types build   # Compile shared types
pnpm -F @phd/frontend dev     # Start frontend dev server
pnpm -F @phd/backend start:dev  # Start backend dev server
pnpm docker:up                # Start PostgreSQL + Redis
pnpm db:migrate               # Run Prisma migrations
pnpm -F @phd/backend build    # Build backend
pnpm -F @phd/frontend build   # Build frontend
```

## Architecture Constraints

1. **Dependency direction**: `shared-types` → `backend` & `frontend` (no reverse deps)
2. **API versioning**: All routes under `/api/v1/`
3. **Database**: CUID primary keys, `Timestamptz(3)`, soft delete via `deletedAt`
4. **AI integration**: OpenClaw Gateway runs externally; backend connects via WebSocket (NOT HTTP)
5. **Liquid glass UI**: All UI surfaces use CSS variables from `frontend/src/styles/glass-theme.css`

## Working with OpenClaw

Before implementing any AI feature, read `docs/openclaw/01-integration-guide.md`.

For OpenClaw-specific development (MCP Servers, Skills), read `docs/openclaw/` in order:
1. `01-integration-guide.md` — Gateway setup, connection, first agent call
2. `02-architecture-decisions.md` — Why OpenClaw, why not pure LLM API
3. `03-mcp-server-dev.md` — Building custom MCP Servers for our data
4. `04-skill-development.md` — Writing Skills for research workflows
5. `05-client-implementation.md` — NestJS WebSocket client code patterns

## Coding Rules

- See `docs/harness/rules.md` for full conventions
- Use ES modules (`import/export`) everywhere
- Backend: NestJS module-per-domain pattern (Controller → Service → Repository)
- Frontend: Feature-based colocation (`modules/task/`, `modules/calendar/`)
- Types: Never use `any`. Prefer `unknown` with type guards.

## Anti-Patterns (Prohibited)

- Do NOT hardcode the demo user (`demo@phd-os.local`) in new code — auth system is coming
- Do NOT use `prisma.$queryRaw` without explicit type annotations
- Do NOT create new API routes without Swagger `@ApiOperation` decorators
- Do NOT modify `shared-types` without rebuilding (`pnpm -F @phd/shared-types build`)
- Do NOT commit `.env` files or API keys
