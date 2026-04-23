# OpenClaw Integration Guide for PhD_OS

> Complete setup and integration guide for connecting PhD_OS backend to OpenClaw Gateway.
> Target audience: AI coding agents implementing AI features in PhD_OS.

---

## 1. What is OpenClaw

OpenClaw is an open-source AI agent gateway that provides:

- **Agent Runtime** (pi-mono): Core reasoning loop (prompt assembly → tool calling → memory search → streaming response)
- **MCP Integration** (MCPorter): 200+ MCP Servers for tool connectivity (Zotero, calendar, notes, arXiv, etc.)
- **Persistent Memory** (Supermemory): Cross-session context compression and memory
- **Multi-Channel Routing**: 14+ messaging channels (Feishu/Lark, Telegram, Slack, etc.)
- **Scheduled Tasks**: Cron-based automation triggers
- **Skill System**: Reusable agent capability definitions via Markdown (SKILL.md)

## 2. Source Repository

| Resource | URL |
|----------|-----|
| **GitHub Repository** | https://github.com/openclaw/openclaw |
| **npm Package (CLI)** | `openclaw` (global install) |
| **WebSocket Client** | `@telegraphic-dev/openclaw-gateway-client` |
| **Control Dashboard** | http://localhost:18789 |
| **Skill Marketplace** | ClawHub (`npx clawhub@latest install <skill>`) |
| **Protocol Reference** | WebSocket JSON-RPC 2.0 over `ws://127.0.0.1:18789` |

## 3. System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 22 | 24 |
| RAM | 4GB | 8-16GB for multi-agent |
| OS | macOS 12+ / Ubuntu 20.04+ / WSL2 | Ubuntu 22.04 LTS |
| API Key | Anthropic or OpenAI | Anthropic for best agent quality |

**Note**: PhD_OS itself uses Node.js 20 (`.nvmrc`). OpenClaw Gateway requires Node.js 22+ and should be installed separately or via a Node version manager.

## 4. Installation Options

### Option A: Global npm Install (Recommended for Development)

```bash
# Install OpenClaw CLI globally (requires Node.js 22+)
npm install -g openclaw@latest

# Run onboarding wizard — creates ~/.openclaw/ config
openclaw onboard --install-daemon

# Start Gateway in foreground (for development)
openclaw gateway --port 18789 --verbose

# Or install as background service
openclaw gateway install --force
openclaw gateway start
```

The onboarding wizard creates:
- `~/.openclaw/openclaw.json` — Gateway configuration
- `~/.openclaw/workspace/` — Agent workspace (skills, memory)
- `~/.openclaw/workspace/skills/` — Custom skill definitions

### Option B: Clone from Source (For Customization)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm openclaw setup          # First run only
pnpm ui:build                # Build Control UI
pnpm gateway:watch           # Dev loop with auto-reload
```

### Option C: Docker (Not Currently Available)

The `openclaw/gateway` Docker image is **not published to public registries** as of 2026-04. The Docker service in PhD_OS's `docker-compose.yml` is commented out. Use Option A or B instead.

## 5. Gateway Configuration

After onboarding, edit `~/.openclaw/openclaw.json` for PhD_OS integration:

```json
{
  "gateway": {
    "bind": "loopback",
    "port": 18789,
    "auth": {
      "password": "your-secure-password"
    }
  },
  "models": {
    "default": "claude-sonnet-4",
    "providers": {
      "anthropic": {
        "apiKey": "${ANTHROPIC_API_KEY}"
      },
      "openai": {
        "apiKey": "${OPENAI_API_KEY}"
      }
    }
  },
  "mcpServers": {
    "zotero-read": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-zotero"]
    }
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace"
    }
  }
}
```

**Security critical**: Always set `gateway.bind` to `"loopback"` to prevent public access. Never expose port 18789 to the internet.

## 6. PhD_OS Backend Integration

### 6.1 Install WebSocket Client

```bash
# In apps/backend/
pnpm add @telegraphic-dev/openclaw-gateway-client
```

### 6.2 Create OpenClaw Client Module

Create `apps/backend/src/modules/openclaw/`:

```
openclaw/
├── openclaw.module.ts
├── openclaw.service.ts
├── openclaw.controller.ts
├── openclaw.gateway.ts        ← WebSocket gateway for SSE
├── dto/
│   ├── chat-request.dto.ts
│   └── stream-response.dto.ts
└── types/
    └── openclaw.types.ts
```

### 6.3 Core Service Implementation

```typescript
// openclaw.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OpenClawGatewayClient,
  ROLE_SCOPE_MAP,
  fileStoreAdapter,
} from '@telegraphic-dev/openclaw-gateway-client';
import { Subject } from 'rxjs';

@Injectable()
export class OpenClawService implements OnModuleDestroy {
  private client: OpenClawGatewayClient | null = null;
  private connected = false;
  public readonly eventStream$ = new Subject<any>();

  constructor(private config: ConfigService) {}

  async connect(): Promise<void> {
    const gatewayUrl = this.config.get('OPENCLAW_GATEWAY_URL') || 'ws://127.0.0.1:18789';
    const gatewayToken = this.config.get('OPENCLAW_GATEWAY_TOKEN');

    if (!gatewayToken) {
      throw new Error('OPENCLAW_GATEWAY_TOKEN not configured');
    }

    this.client = new OpenClawGatewayClient({
      url: gatewayUrl,
      token: gatewayToken,
      store: fileStoreAdapter('.openclaw-gateway-client'),
      client: {
        id: 'phd-os-backend',
        version: '1.0.0',
        platform: 'node',
        mode: 'backend',
      },
      role: 'operator',
      scopes: ROLE_SCOPE_MAP.operator,
    });

    await this.client.connect();
    this.connected = true;

    // Subscribe to agent events
    this.client.onEvent((event) => {
      this.eventStream$.next(event);
    });
  }

  async sendMessage(message: string, options?: { skill?: string }): Promise<AsyncGenerator<string>> {
    if (!this.connected || !this.client) {
      throw new Error('OpenClaw Gateway not connected');
    }

    // Use agent method for streaming response
    return this.client.agent({
      message,
      skill: options?.skill,
      thinking: 'high',
    });
  }

  async getAvailableTools(): Promise<string[]> {
    if (!this.client) return [];
    const tools = await this.client.discoverMcpTools();
    return tools.map((t: any) => t.name);
  }

  async invokeTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.client) throw new Error('Not connected');
    return this.client.callTool(toolName, args);
  }

  onModuleDestroy() {
    this.eventStream$.complete();
    this.client?.close();
  }
}
```

### 6.4 NestJS Module Registration

```typescript
// openclaw.module.ts
import { Module } from '@nestjs/common';
import { OpenClawService } from './openclaw.service';
import { OpenClawController } from './openclaw.controller';

@Module({
  controllers: [OpenClawController],
  providers: [OpenClawService],
  exports: [OpenClawService],
})
export class OpenClawModule {}
```

Register in `AppModule`:

```typescript
import { OpenClawModule } from './modules/openclaw/openclaw.module';

@Module({
  imports: [
    // ... existing modules
    OpenClawModule,
  ],
})
export class AppModule {}
```

### 6.5 Environment Variables

Add to `apps/backend/.env`:

```env
# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-gateway-auth-token
OPENCLAW_DEFAULT_SKILL=research-assistant
```

Add validation schema in `apps/backend/src/config/`:

```typescript
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const openclawConfigSchema = z.object({
  OPENCLAW_GATEWAY_URL: z.string().default('ws://127.0.0.1:18789'),
  OPENCLAW_GATEWAY_TOKEN: z.string().min(1),
  OPENCLAW_DEFAULT_SKILL: z.string().default('research-assistant'),
});

export default registerAs('openclaw', () => ({
  gatewayUrl: process.env.OPENCLAW_GATEWAY_URL,
  gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN,
  defaultSkill: process.env.OPENCLAW_DEFAULT_SKILL,
}));
```

### 6.6 SSE Streaming Controller

```typescript
// openclaw.controller.ts
import { Controller, Post, Body, Sse, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { OpenClawService } from './openclaw.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('AI Assistant')
@Controller('api/v1/ai')
export class OpenClawController {
  constructor(private readonly openClawService: OpenClawService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send message to AI assistant (SSE streaming)' })
  async chat(@Body() dto: ChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await this.openClawService.sendMessage(dto.message, {
        skill: dto.skill,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }

  @Post('tools/discover')
  @ApiOperation({ summary: 'List available MCP tools' })
  async discoverTools() {
    return { tools: await this.openClawService.getAvailableTools() };
  }
}
```

### 6.7 DTO Definitions

```typescript
// dto/chat-request.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ description: 'User message to the AI assistant' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Optional skill to use' })
  @IsOptional()
  @IsString()
  skill?: string;
}
```

## 7. WebSocket Protocol Overview

The PhD_OS backend connects to OpenClaw Gateway via WebSocket JSON-RPC 2.0:

```
PhD_OS Backend (NestJS) ←──WebSocket──→ OpenClaw Gateway (localhost:18789)
    │                                           │
    │  connect handshake                        │  Agent Runtime (pi-mono)
    │  → challenge/response                     │  │
    │  → device auth                            │  ├── MCPorter (MCP tool router)
    │                                           │  ├── Supermemory (persistent memory)
    │  chat.send(message)                       │  └── Channel Router (14+ channels)
    │  ← agent.thinking (events)                │
    │  ← agent.response (tokens)                │
```

### Connection Lifecycle

1. **Connect**: Backend establishes WebSocket to `ws://127.0.0.1:18789`
2. **Handshake**: Gateway sends `connect.challenge`; client signs with device key
3. **Auth**: Client sends `hello-ok.auth.deviceToken` for persistent auth
4. **Agent Request**: Client sends `agent` message with user prompt
5. **Event Stream**: Gateway streams `agent.thinking` → `agent.response` events
6. **Tool Calls**: If agent needs tools, Gateway calls MCP Servers and returns results
7. **Completion**: Final response delivered; connection stays open for next request

## 8. Health Check & Monitoring

```typescript
// Add to OpenClawService
async healthCheck(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    await this.client?.listSessions({ limit: 1 });
    return { status: 'connected', latency: Date.now() - start };
  } catch {
    return { status: 'disconnected', latency: -1 };
  }
}
```

Gateway diagnostics:

```bash
openclaw doctor              # Check configuration and connectivity
openclaw gateway status      # Check gateway process status
openclaw logs --follow       # Stream gateway logs
```

## 9. Security Checklist

- [ ] Gateway bound to `loopback` (127.0.0.1) only
- [ ] Auth token set and stored in `.env` (never committed)
- [ ] MCP Servers run in Docker sandbox (security audit: 5.5% have tool-poisoning vulnerabilities)
- [ ] `openclaw doctor` passes without warnings
- [ ] DM pairing policy set to `"pairing"` (not `"open"`)

## 10. Next Steps

After completing integration:

1. Read `02-architecture-decisions.md` — Understand why we chose OpenClaw over pure LLM API
2. Read `03-mcp-server-dev.md` — Build custom MCP Servers for PhD_OS data (pomodoro, tasks)
3. Read `04-skill-development.md` — Write research-focused Skills
4. Read `05-client-implementation.md` — Frontend chat UI integration patterns
