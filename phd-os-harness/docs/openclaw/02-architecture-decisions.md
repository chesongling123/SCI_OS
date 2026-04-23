# Architecture Decisions: Why OpenClaw, Why Not Pure LLM API

> ADR-001 through ADR-004: The rationale behind choosing OpenClaw as the AI infrastructure for PhD_OS Phase 2.

---

## ADR-001: AI Service Layer Selection

**Status**: Accepted
**Date**: 2026-04-22
**Decision**: Use OpenClaw Gateway as the AI service layer, with a hybrid fallback to direct LLM API for simple tasks.

### Context

PhD_OS needs AI capabilities across multiple features:
- Research literature search and summarization
- AI diary generation (fusing calendar, pomodoro, notes)
- Smart scheduling recommendations
- Note content enhancement and linking
- Paper abstract translation

Two architectural approaches were evaluated:

| Approach | Description |
|----------|-------------|
| **A: Pure LLM API** | NestJS backend directly calls OpenAI/DeepSeek APIs for each AI feature |
| **B: OpenClaw Gateway** | External OpenClaw Gateway provides agent runtime, MCP tools, memory, channels |

### Decision

Adopt **Approach B (OpenClaw)** as the primary AI infrastructure, with **direct LLM API** as a fast-path for simple single-step tasks.

### Rationale

#### Why OpenClaw Wins for Complex Tasks

| Capability | OpenClaw | Pure LLM API | Winner |
|------------|----------|--------------|--------|
| Agent reasoning loop (ReAct/Plan) | Built-in pi-mono | Must build from scratch | OpenClaw |
| MCP tool ecosystem | 200+ servers via MCPorter | Must build every integration | OpenClaw |
| Cross-session memory | Supermemory | Must build memory system | OpenClaw |
| Scheduled automation | Cron + Heartbeat | Must use node-cron separately | OpenClaw |
| Multi-channel push | 14+ channels built-in | Must integrate each channel API | OpenClaw |
| Skill system | Markdown SKILL.md | Must code every workflow | OpenClaw |

The killer features for PhD_OS are:

1. **MCP Integration**: Zotero, arXiv, calendar, notes — all connect via standardized MCP protocol. Without OpenClaw, each integration requires custom adapter code.

2. **Agent Runtime**: Literature search requires multi-step reasoning (search → filter → summarize → store). ReAct pattern implementation is battle-tested in pi-mono.

3. **Persistent Memory**: AI diary generation requires remembering past interactions, user preferences, and research themes across sessions.

#### Why Keep Direct LLM API

| Task Type | Latency | Complexity | Path |
|-----------|---------|------------|------|
| Abstract translation | ~300ms | Single call | Direct LLM API |
| Text polishing | ~400ms | Single call | Direct LLM API |
| Literature search workflow | ~3s | Multi-step agent | OpenClaw |
| AI diary generation | ~5s | Multi-source fusion | OpenClaw |

Direct LLM API provides 10x lower latency for simple tasks. We use it as a "fast path" bypassing OpenClaw's agent overhead.

### Consequences

**Positive**:
- Immediate access to 200+ tool integrations via MCP
- No need to build agent reasoning framework
- Memory and scheduling out of the box
- Community Skill ecosystem (ClawHub)

**Negative**:
- Additional service to operate (Gateway on port 18789)
- Node.js version mismatch (PhD_OS uses 20, OpenClaw requires 22+)
- Context window overhead for WebSocket protocol
- Security surface area (must sandbox MCP Servers)

### Three-Layer Calling Strategy

```
┌─────────────────────────────────────────────┐
│  Layer 3: Orchestration (NestJS Controller)   │
│  Decides which path to use per request        │
├─────────────────┬───────────────────────────┤
│  Layer 2A:      │  Layer 2B:                │
│  Direct LLM     │  OpenClaw Gateway         │
│  (simple tasks) │  (complex agent tasks)    │
│                 │                           │
│  axios →        │  WebSocket →              │
│  LiteLLM →      │  Agent Runtime →          │
│  OpenAI API     │  MCP → Tools              │
├─────────────────┴───────────────────────────┤
│  Layer 1: LLM Providers (via LiteLLM)       │
│  OpenAI / Anthropic / DeepSeek / Local      │
└─────────────────────────────────────────────┘
```

### Implementation

- NestJS `LlmService` handles direct API calls
- NestJS `OpenClawService` handles WebSocket gateway connection
- Controller logic decides which service to use per endpoint

---

## ADR-002: Communication Protocol — WebSocket vs HTTP

**Status**: Accepted
**Date**: 2026-04-22
**Decision**: Use WebSocket (not HTTP) for OpenClaw communication.

### Context

OpenClaw supports two protocols:
- **WebSocket**: Full agent streaming, bidirectional, event-driven
- **HTTP REST**: Limited subset, polling-based

### Decision

Use WebSocket via `@telegraphic-dev/openclaw-gateway-client`.

### Rationale

| Requirement | WebSocket | HTTP |
|-------------|-----------|------|
| Streaming responses | Native | Requires SSE proxy |
| Agent thinking events | Real-time push | Polling |
| Tool call interleaving | Bidirectional | Request/response only |
| Session persistence | Connection state | Stateless |
| Server-initiated messages | Native | Webhook complexity |

PhD_OS requires streaming AI responses to the frontend (word-by-word rendering). WebSocket provides this natively without SSE proxy overhead.

### Consequences

- Must handle reconnection logic (exponential backoff)
- WebSocket connection state must be managed in NestJS lifecycle
- Gateway restart requires client reconnection

---

## ADR-003: OpenClaw Deployment Model

**Status**: Accepted
**Date**: 2026-04-22
**Decision**: Run OpenClaw Gateway as a separate Node.js process, NOT in Docker.

### Context

Docker image `openclaw/gateway` is not publicly available. Three options:

| Option | Pros | Cons |
|--------|------|------|
| A: Wait for Docker image | Clean containerization | Blocked on upstream |
| B: Build from Dockerfile | Full control | Complex build process |
| C: npm global install + daemon | Immediate, simple | Manual setup required |

### Decision

Use **Option C**: `npm install -g openclaw@latest` with `openclaw onboard --install-daemon`.

### Rationale

- OpenClaw team recommends this path for development
- `openclaw gateway install` creates platform-native service (launchd/systemd)
- No build complexity
- Port 18789 binds to loopback for security

### Setup Steps

```bash
# One-time setup (run manually, not in docker-compose)
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw config set gateway.bind loopback
openclaw config set gateway.port 18789

# Start service
openclaw gateway start

# Verify
openclaw doctor
openclaw gateway status
```

---

## ADR-004: MCP Server Security Model

**Status**: Accepted
**Date**: 2026-04-22
**Decision**: All MCP Servers run in Docker sandbox containers.

### Context

Cornell University 2025 research found 5.5% of open-source MCP Servers contain tool-poisoning vulnerabilities. CVE-2026-25253 revealed one-click RCE in unprotected Gateway deployments.

### Decision

Every MCP Server in `openclaw.json` must use `docker run` command instead of direct `npx`:

```json
{
  "mcpServers": {
    "zotero-read": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "mcp/zotero:latest"]
    },
    "arxiv-search": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "mcp/arxiv:latest"]
    }
  }
}
```

### Rationale

- Container isolation prevents tool-poisoning attacks from accessing host filesystem
- `docker run --rm -i` is the standard pattern for MCP Server sandboxing
- Network access can be restricted with `--network=none` for offline tools

### Consequences

- Docker must be running on the development machine
- Slight cold-start latency for first MCP tool call (~500ms)
- Image management required (periodic `docker pull` for updates)
