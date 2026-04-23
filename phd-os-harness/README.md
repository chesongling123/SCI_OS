# PhD_OS AI Agent Harness — OpenClaw Development Guide

> Complete development guide for integrating OpenClaw AI capabilities into the PhD_OS research workstation.

---

## What's Inside

This documentation suite provides everything needed for AI coding agents to implement OpenClaw-based AI features in PhD_OS. It follows **harness engineering** principles: progressive disclosure, feedforward guides, and repository-local knowledge.

### Document Map

```
phd-os-harness/
├── AGENTS.md                           ← Start here (root entry point)
├── README.md                           ← This file (overview)
├── docs/
│   ├── openclaw/
│   │   ├── 01-integration-guide.md     ← Gateway setup + NestJS connection
│   │   ├── 02-architecture-decisions.md ← Why OpenClaw, hybrid architecture
│   │   ├── 03-mcp-server-dev.md        ← Building custom MCP Servers
│   │   ├── 04-skill-development.md     ← Writing AI agent Skills
│   │   └── 05-client-implementation.md ← Frontend chat UI patterns
│   └── harness/
│       └── rules.md                    ← Coding conventions & constraints
```

## Quick Start for AI Agents

**First time working on PhD_OS AI features? Read in this order:**

1. **Read `AGENTS.md`** — Project identity, tech stack, build commands, architecture constraints
2. **Read `docs/openclaw/01-integration-guide.md`** — How to install and connect OpenClaw Gateway
3. **Read `docs/harness/rules.md`** — Coding conventions specific to PhD_OS

**Then read based on your task:**

| Task | Read This |
|------|-----------|
| Build a new MCP Server | `03-mcp-server-dev.md` |
| Write a research Skill | `04-skill-development.md` |
| Integrate AI chat into frontend | `05-client-implementation.md` |
| Understand architectural rationale | `02-architecture-decisions.md` |

## Key External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| **OpenClaw GitHub** | https://github.com/openclaw/openclaw | Source code, issues, releases |
| **OpenClaw npm** | `npm install -g openclaw@latest` | CLI + Gateway installation |
| **Gateway Client** | `npm install @telegraphic-dev/openclaw-gateway-client` | WebSocket client library |
| **Control Dashboard** | http://localhost:18789 | Gateway management UI |
| **Skill Marketplace** | `npx clawhub@latest install <skill>` | Community Skills (ClawHub) |
| **MCP Protocol** | https://modelcontextprotocol.io | Model Context Protocol spec |
| **OpenClaw Security** | Run `openclaw doctor` | Security audit and config check |

## PhD_OS Project Context

- **Monorepo**: pnpm workspace with `apps/*` + `packages/*`
- **Frontend**: React 19 + Vite 6 + TypeScript 5.5 + Tailwind CSS (liquid glass UI)
- **Backend**: NestJS 11 + Prisma 6.6.0 + PostgreSQL 15 + Redis 7
- **AI Layer**: OpenClaw Gateway (WebSocket port 18789) + LiteLLM Proxy
- **Completed Modules**: Task Kanban, Calendar, Pomodoro Timer
- **Phase 2 Goals**: Auth system, OpenClaw AI integration, Notes, Literature management

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     PhD_OS Architecture                       │
├──────────────────────┬──────────────────────────────────────┤
│  Frontend (port 5173)│  Backend (port 3000)                  │
│  React 19 + Vite     │  NestJS 11 + Prisma                   │
│                      │                                       │
│  ┌─────────────────┐ │  ┌──────────────┐  ┌──────────────┐  │
│  │ AI Chat Panel   │ │  │ OpenClaw     │  │ Direct LLM   │  │
│  │ (SSE streaming) │◄┼─►│ Service (WS) │  │ Service (HTTP│  │
│  └─────────────────┘ │  └──────┬───────┘  └──────┬───────┘  │
│                      │         │                   │          │
└──────────────────────┴─────────┼───────────────────┼──────────┘
                                 │                   │
                    WebSocket    │      HTTP         │  OpenAI API
                    ws://127.0.0.1:18789   LiteLLM Proxy
                                 │                   │
                        ┌────────┴───────────────────┴────────┐
                        │      OpenClaw Gateway               │
                        │      (port 18789)                   │
                        │                                     │
                        │  ┌──────────┐  ┌─────────────────┐ │
                        │  │ Agent    │  │ MCPorter        │ │
                        │  │ Runtime  │  │ (MCP Servers)   │ │
                        │  └──────────┘  └─────────────────┘ │
                        │                                     │
                        │  ┌──────────┐  ┌─────────────────┐ │
                        │  │Supermemo-│  │ Channel Router  │ │
                        │  │   ry     │  │ (14+ channels)  │ │
                        │  └──────────┘  └─────────────────┘ │
                        └─────────────────────────────────────┘
```

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| `AGENTS.md` | Active | 2026-04-22 |
| `01-integration-guide.md` | Active | 2026-04-22 |
| `02-architecture-decisions.md` | Active | 2026-04-22 |
| `03-mcp-server-dev.md` | Active | 2026-04-22 |
| `04-skill-development.md` | Active | 2026-04-22 |
| `05-client-implementation.md` | Active | 2026-04-22 |
| `rules.md` | Active | 2026-04-22 |

## How to Update This Harness

When the agent encounters a new pattern or makes a mistake:

1. Identify which document needs updating
2. Add the rule or pattern to the appropriate file
3. If it's a recurring mistake across multiple tasks, add to `AGENTS.md`
4. If it's coding convention specific, add to `docs/harness/rules.md`
5. If it's OpenClaw specific, add to the relevant `docs/openclaw/` file

**Rule of thumb**: "Every time an agent makes a mistake, add the instruction that prevents that mistake from repeating."

## License

This harness documentation is part of PhD_OS and follows the same license terms.
