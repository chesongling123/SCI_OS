# PhD_OS AI 助手开发计划

> 基于 `phd-os-harness` 工程框架，为 PhD_OS 科研工作台集成 OpenClaw AI 能力。
> **适用场景**：本地单机使用，无上线部署需求。
> **最后更新**：2026-04-22

---

## 一、总体目标

在 PhD_OS 中构建一个**本地优先、AI 原生**的科研助手，能够：

1. **自然语言对话** —— 用户通过聊天界面与 AI 交流
2. **数据感知** —— AI 能读取用户的任务、日程、番茄钟数据（通过 MCP）
3. **研究工作流** —— 通过 Skill 实现日记生成、文献搜索、智能排程
4. **流式体验** —— 前端打字机效果，工具调用过程可视化

---

## 二、技术架构（基于 Harness ADR）

### 2.1 三层调用策略

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: 编排层（NestJS Controller）                        │
│  根据任务复杂度决定走哪条路径                                  │
├─────────────────┬───────────────────────────────────────────┤
│  Layer 2A:      │  Layer 2B:                                │
│  Direct LLM     │  OpenClaw Gateway                         │
│  简单单步任务    │  复杂多步 Agent 任务                       │
│                 │                                           │
│  axios →        │  WebSocket →                              │
│  LiteLLM Proxy  │  Agent Runtime →                          │
│  → LLM API      │  MCPorter → 自定义 MCP Servers            │
├─────────────────┴───────────────────────────────────────────┤
│  Layer 1: LLM 提供商（通过 LiteLLM 统一路由）                │
│  Anthropic Claude / OpenAI / 本地 Ollama                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流向

```
用户输入 → React 前端 → POST /api/v1/ai/chat
                              ↓
                    NestJS OpenClawController
                              ↓
                    ┌─────────────────────┐
                    │   任务类型判断       │
                    └─────────────────────┘
                    ↓                    ↓
            简单任务(翻译/润色)      复杂任务(分析/生成)
                    ↓                    ↓
            DirectLLMService      OpenClawService
                    ↓                    ↓
            HTTP → LiteLLM       WebSocket → Gateway
                    ↓                    ↓
            快速返回(~300ms)      Agent推理 → MCP调用
                                          ↓
                                   phd-pomodoro / phd-task
                                          ↓
                                    SSE 流式返回前端
```

### 2.3 本地部署拓扑

```
本地机器 (localhost)
│
├─ PostgreSQL  :5433    ← 已有，PhD_OS 数据
├─ Redis       :6379    ← 已有，缓存/队列
├─ PhD_OS Frontend :5173  ← 已有，React dev server
├─ PhD_OS Backend  :3000  ← 已有，NestJS API
│
└─ OpenClaw Gateway :18789  ← 新增，需单独安装
     │
     ├─ Agent Runtime (pi-mono)
     ├─ MCPorter ──→ phd-pomodoro MCP (Docker)
     │             → phd-task MCP (Docker)
     │             → phd-calendar MCP (Docker)
     │             → zotero-mcp (Docker, 可选)
     │             → arxiv-mcp (Docker, 可选)
     ├─ Supermemory (跨会话记忆)
     └─ Skills: phd-ai-diary, phd-literature-search, phd-smart-schedule
```

---

## 三、实施路线图

| 阶段 | 名称 | 核心交付物 | 预估工时 |
|:---|:---|:---|:---|
| **Phase A** | 环境搭建 + 基础连接 | Gateway 安装、后端 WebSocket Client、健康检查接口 | 1-1.5h |
| **Phase B** | 前端聊天面板 | SSE 流式对话 UI、液态玻璃风格、打字机效果 | 1.5-2h |
| **Phase C** | MCP Servers | phd-pomodoro、phd-task、phd-calendar 三个 MCP Server | 2-2.5h |
| **Phase D** | Skills | phd-ai-diary、phd-literature-search、phd-smart-schedule | 1-1.5h |
| **Phase E** | 工具调用可视化 | 前端展示 AI 正在调用的工具、加载状态、结果 | 1h |
| **Phase F** | Direct LLM 快路径 | 简单任务绕过 OpenClaw，直接调用 LiteLLM | 1h |

**总计**：约 **8-10 小时** 完成 MVP。

---

## 四、Phase A：环境搭建 + 基础连接（1-1.5h）

### 4.1 OpenClaw Gateway 安装

```bash
# PhD_OS 用 Node.js 20，OpenClaw 需要 Node.js 22+
# 使用 nvm 切换到 22+ 后执行
npm install -g openclaw@latest

# 初始化配置（生成 ~/.openclaw/openclaw.json）
openclaw onboard --install-daemon

# 绑定到本地回环，禁止外部访问
openclaw config set gateway.bind loopback
openclaw config set gateway.port 18789

# 启动服务
openclaw gateway start

# 验证
openclaw doctor
openclaw gateway status
```

**配置说明**：
- `gateway.bind` 必须设为 `loopback`，因为不做上线，仅本地使用
- 需配置 LLM API Key（Anthropic/OpenAI）到 `~/.openclaw/openclaw.json`
- MCP Servers 后续在 Phase C 配置

### 4.2 后端 OpenClaw 模块

**新增文件清单**：

```
apps/backend/src/modules/openclaw/
├── openclaw.module.ts
├── openclaw.service.ts          ← WebSocket Client 封装
├── openclaw.controller.ts       ← REST + SSE 接口
├── direct-llm.service.ts        ← 简单任务快路径
├── openclaw.gateway.ts          ← WebSocket 网关（未来扩展用）
├── dto/
│   ├── chat-request.dto.ts
│   ├── stream-response.dto.ts
│   └── direct-llm-request.dto.ts
└── types/
    └── openclaw.types.ts
```

**实现要点**：

1. **OpenClawService** —— 封装 `@telegraphic-dev/openclaw-gateway-client`
   - `OnModuleInit` 中建立 WebSocket 连接
   - `OnModuleDestroy` 中清理连接
   - 指数退避重连（1s → 2s → 4s → 8s → max 30s）
   - `sendMessage()` 返回 `AsyncGenerator<string>` 供 SSE 消费
   - `getAvailableTools()` 发现已注册的 MCP 工具
   - `healthCheck()` 检测 Gateway 连通性

2. **OpenClawController** —— 暴露 REST 接口
   - `POST /api/v1/ai/chat` —— SSE 流式对话（核心接口）
   - `POST /api/v1/ai/tools/discover` —— 列出可用 MCP 工具
   - `GET /api/v1/ai/health` —— Gateway 健康检查

3. **环境变量**（追加到 `apps/backend/.env`）：
   ```env
   OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
   OPENCLAW_GATEWAY_TOKEN=your-gateway-auth-token
   OPENCLAW_DEFAULT_SKILL=phd-research-assistant
   LITELLM_API_KEY=your-litellm-key
   ```

4. **AppModule 注册**：
   ```typescript
   imports: [
     // ... existing modules
     OpenClawModule,
   ]
   ```

### 4.3 验证 checklist

- [ ] `openclaw doctor` 无报错
- [ ] `openclaw gateway status` 显示 `running`
- [ ] NestJS 启动日志显示 `OpenClawService connected`
- [ ] `GET /api/v1/ai/health` 返回 `{"status":"connected","latency":xx}`
- [ ] Swagger `/api/docs` 显示 `AI Assistant` tag

---

## 五、Phase B：前端聊天面板（1.5-2h）

### 5.1 设计原则

- **液态玻璃风格**：使用 CSS 变量 `--glass-bg`、`--glass-border` 等
- **浮动面板**：不独占整页，以浮动窗口/侧边栏形式存在，不破坏现有页面布局
- **全局可访问**：从任意页面都能呼出 AI 助手

### 5.2 新增文件清单

```
apps/frontend/src/modules/ai/
├── hooks/
│   └── useAiChat.ts             ← SSE 流式对话 Hook
├── components/
│   ├── AiChatPanel.tsx          ← 聊天面板主体
│   ├── AiChatButton.tsx         ← 浮动触发按钮
│   ├── AiMessageBubble.tsx      ← 消息气泡
│   └── ToolCallIndicator.tsx    ← 工具调用可视化
├── types/
│   └── ai.types.ts
└── index.ts                     ← 模块导出
```

### 5.3 实现要点

1. **useAiChat Hook**
   - `sendMessage(userMessage, options)` —— 发送消息，处理 SSE 流
   - `cancel()` —— AbortController 中断当前流
   - `clear()` —— 清空对话历史
   - 消息状态：`streaming` | `complete` | `error`
   - 自动滚动到底部

2. **AiChatPanel 组件**
   - 高度约 `600px`，宽度 `400px`（桌面端可拖拽调整）
   - 消息列表区 + 输入区
   - 空状态提示：展示可用功能示例（"帮我总结今天的专注数据"、"查找关于深度学习的最新论文"）
   - 液态玻璃圆角卡片，带阴影

3. **AiChatButton 浮动按钮**
   - 右下角固定位置（`fixed bottom-6 right-6`）
   - 点击展开/收起面板
   - 有新消息时显示小红点
   - 液态玻璃圆形按钮，带 Sparkles 图标

4. **与现有路由集成**
   - 不新增路由（AI 不是独立页面，是全局浮动组件）
   - 在 `Layout.tsx` 中全局挂载 `<AiChatButton />`
   - 所有子页面共享同一个 AI 面板实例

### 5.4 验证 checklist

- [ ] 从任意页面点击浮动按钮展开面板
- [ ] 输入消息后前端显示用户气泡
- [ ] AI 回复以打字机效果逐字显示
- [ ] 点击取消按钮中断流
- [ ] 关闭面板后重新打开保留对话历史
- [ ] 深色/浅色主题切换时面板样式正确

---

## 六、Phase C：自定义 MCP Servers（2-2.5h）

### 6.1 为什么需要自定义 MCP Servers

OpenClaw Gateway 自带的 MCP Servers（如 arXiv、Zotero）是通用工具，无法直接访问 PhD_OS 的本地数据库。需要自建 MCP Servers 来暴露用户的**任务、日程、番茄钟**数据。

### 6.2 项目结构

```
packages/mcp-servers/            ← 新增 workspace package
├── pomodoro-mcp/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── task-mcp/
│   └── ...
└── calendar-mcp/
    └── ...
```

**pnpm-workspace.yaml** 中需添加 `packages/mcp-servers/*`。

### 6.3 phd-pomodoro MCP Server

**暴露工具**：

| 工具名 | 功能 | 输入参数 |
|:---|:---|:---|
| `get_today_sessions` | 获取今日番茄钟记录 | 无 |
| `get_focus_stats` | 获取某日期范围的专注统计 | `start_date`, `end_date`, `granularity` |
| `get_optimal_focus_hours` | 分析最佳专注时段 | `days` |
| `get_current_focus_status` | 检查是否有进行中的番茄钟 | 无 |

**数据库连接**：直接连接 PostgreSQL（`DATABASE_URL` 环境变量），使用 `pg` 包。

**注意**：当前为本地单机使用，用户筛选暂时用 `userId` 子查询（从 JWT token 解析），后续如需多用户可升级。

### 6.4 phd-task MCP Server

**暴露工具**：

| 工具名 | 功能 | 输入参数 |
|:---|:---|:---|
| `get_active_tasks` | 获取进行中/待办任务 | `status?` |
| `get_recently_completed` | 获取最近完成的任务 | `limit?`, `days?` |
| `get_tasks_by_status` | 按状态获取任务列表 | `status` |
| `get_task_stats` | 获取任务统计（完成率/延期率） | `days?` |

### 6.5 phd-calendar MCP Server

**暴露工具**：

| 工具名 | 功能 | 输入参数 |
|:---|:---|:---|
| `get_today_events` | 获取今日日程 | 无 |
| `get_week_overview` | 获取本周日程概览 | `week_start?` |
| `get_upcoming_deadlines` | 获取临近截止日期 | `days?` |
| `get_busy_hours` | 获取忙碌时段 | `date` |

### 6.6 OpenClaw 配置

在 `~/.openclaw/openclaw.json` 中注册三个 MCP Server：

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
    },
    "phd-task": { "...": "类似结构" },
    "phd-calendar": { "...": "类似结构" }
  }
}
```

**使用 Docker 沙盒**：即使本地使用，也遵循 harness 安全规范，防止 MCP 工具被污染后影响主机。

### 6.7 验证 checklist

- [ ] `pnpm build` 每个 MCP Server 零错误
- [ ] `npx @modelcontextprotocol/inspector node dist/index.js` 可列出工具
- [ ] `openclaw tools list` 显示 `phd-pomodoro/get_today_sessions` 等
- [ ] `openclaw tools call phd-pomodoro get_today_sessions` 返回正确数据
- [ ] `POST /api/v1/ai/tools/discover` 返回完整工具列表

---

## 七、Phase D：Skill 开发（1-1.5h）

### 7.1 Skill 存放位置

```
~/.openclaw/workspace/skills/
├── phd-research-assistant/      ← 默认通用 Skill
│   └── SKILL.md
├── phd-ai-diary/                ← AI 日记生成
│   └── SKILL.md
├── phd-literature-search/       ← 文献搜索
│   └── SKILL.md
└── phd-smart-schedule/          ← 智能排程
    └── SKILL.md
```

### 7.2 phd-research-assistant（默认通用 Skill）

这是 AI 助手的默认行为模式，用户未指定 Skill 时使用。

**核心能力**：
- 回答关于用户研究数据的问题（通过 MCP 工具查询）
- 提供研究建议
- 帮助规划实验

**Prompt 要点**：
- "你是一个科研助手，帮助用户管理研究工作"
- "在回答之前，先判断是否需要查询用户的任务/日程/番茄钟数据"
- "使用中文回答，保持专业但友好的语气"

### 7.3 phd-ai-diary

**触发方式**：
- 用户说"帮我写今天的日记"
- 每晚 22:00 定时触发（cron）

**工作流**：
1. 查询今日番茄钟数据 → 了解专注时长和任务
2. 查询今日日程 → 了解会议和事件
3. 查询最近完成任务 → 了解进展
4. 查询活跃任务 → 了解当前方向
5. 生成结构化日记 → Markdown 格式
6. （可选）保存到笔记系统

### 7.4 phd-literature-search

**触发方式**：用户说"帮我找关于 XX 的论文"

**工作流**：
1. 查询用户活跃任务 → 了解研究方向
2. 调用 arXiv MCP 搜索（限制 30 天内、前 10 条）
3. 调用 Semantic Scholar MCP 搜索（去重）
4. 按相关性打分（关键词匹配 40%、引用数 30%、语义相关性 30%）
5. 生成结构化摘要（问题/方法/结果/与用户研究的关联）
6. 提供"加入 Zotero"/"做笔记"/"找相关"操作选项

### 7.5 phd-smart-schedule

**触发方式**：用户说"帮我安排下周的计划"

**工作流**：
1. 查询历史专注数据 → 找到最佳时段
2. 查询临近截止日期 → 确定优先级
3. 查询现有日程 → 避开冲突
4. 查询活跃任务 → 分配时间块
5. 生成推荐日程表（含番茄钟数量建议）

### 7.6 Cron 配置

在 `~/.openclaw/openclaw.json` 中添加定时任务：

```json
{
  "cron": {
    "jobs": [
      {
        "name": "daily-diary",
        "schedule": "0 22 * * *",
        "skill": "phd-ai-diary",
        "message": "Generate today's research diary"
      },
      {
        "name": "weekly-literature",
        "schedule": "0 9 * * 1",
        "skill": "phd-literature-search",
        "message": "Find papers related to active research tasks"
      }
    ]
  }
}
```

### 7.7 验证 checklist

- [ ] `openclaw agent --skill phd-ai-diary --message "生成今天的日记"` 成功执行
- [ ] Skill 正确调用了多个 MCP 工具
- [ ] 输出格式符合 SKILL.md 中定义的模板
- [ ] 无幻觉数据（缺失数据处显示"暂无数据"）

---

## 八、Phase E：工具调用可视化（1h）

### 8.1 用户体验问题

当 AI 调用 MCP 工具时（如"查询今日番茄钟数据"），用户需要等待 1-3 秒。如果前端没有任何反馈，用户会觉得"AI 卡住了"。

### 8.2 设计方案

在 AI 回复气泡下方显示工具调用状态条：

```
[AI 正在思考...]
  📊 查询今日番茄钟数据  ✓
  📅 查询今日日程        ✓
  ✅ 查询最近完成任务    ⟳ (loading)
```

**实现方式**：
- 后端 SSE 除了发送 `token` 类型外，增加 `tool_call` 类型
- OpenClaw Gateway 的 `agent.thinking` 事件包含工具调用信息
- 前端解析 `tool_call` 事件，更新 UI 状态

**SSE 协议扩展**：

```typescript
// tool_call 事件
{ type: 'tool_call', tool: 'phd-pomodoro/get_today_sessions', status: 'running' }
{ type: 'tool_call', tool: 'phd-pomodoro/get_today_sessions', status: 'complete', result: '...' }

// thinking 事件（可选，显示 AI 的推理过程）
{ type: 'thinking', content: '用户问了今日总结，我需要先查番茄钟数据...' }
```

### 8.3 UI 组件

- `ToolCallIndicator`：水平排列的工具标签，带图标和状态
- 状态图标：`Loader2` (running) / `Check` (complete) / `X` (error)
- 完成后可点击展开查看工具返回的原始数据（调试用，也可帮助用户理解 AI 的依据）

---

## 九、Phase F：Direct LLM 快路径（1h）

### 9.1 为什么需要快路径

OpenClaw Gateway 的 Agent Runtime 有推理开销（~1-2s）。对于简单任务（翻译一段摘要、润色一句话），直接调用 LLM API 快 10 倍。

### 9.2 实现

**新增 DirectLlmService**：

```typescript
@Injectable()
export class DirectLlmService {
  async translate(text: string, targetLang: string): Promise<string> { ... }
  async polish(text: string): Promise<string> { ... }
  async summarize(text: string, maxLength?: number): Promise<string> { ... }
}
```

**通过 LiteLLM Proxy 调用**（统一路由到 OpenAI/Anthropic/本地 Ollama）：

```typescript
const response = await axios.post('http://localhost:4000/v1/chat/completions', {
  model: 'claude-sonnet-4',
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 500,
});
```

**前端快捷入口**：

在 AI 聊天面板中，用户输入前加 `/` 触发快捷命令：

| 命令 | 功能 | 路径 |
|:---|:---|:---|
| `/translate 一段英文` | 翻译成中文 | Direct LLM |
| `/polish 一段文字` | 润色表达 | Direct LLM |
| `/summarize 一段文字` | 生成摘要 | Direct LLM |
| 普通输入 | 默认走 OpenClaw Agent | OpenClaw Gateway |

### 9.3 验证 checklist

- [ ] `/translate` 响应时间 < 1s
- [ ] 普通对话仍走 OpenClaw Agent（可查询 MCP 数据）
- [ ] 快捷命令不在对话历史中留下复杂推理过程

---

## 十、共享类型扩展

### 10.1 需要新增的类型（`packages/shared-types`）

```typescript
// dto/index.ts
export interface ChatRequestDto {
  message: string;
  skill?: string;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'streaming' | 'complete' | 'error';
  toolCalls?: ToolCallDto[];
}

export interface ToolCallDto {
  tool: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  params?: Record<string, unknown>;
  result?: string;
}

export interface DirectLlmRequestDto {
  text: string;
  operation: 'translate' | 'polish' | 'summarize';
  targetLang?: string;
  maxLength?: number;
}

// enums/index.ts
export enum AiMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum ToolCallStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETE = 'complete',
  ERROR = 'error',
}
```

**修改后必须执行**：`pnpm -F @phd/shared-types build`

---

## 十一、数据库扩展（可选）

### 11.1 AI 对话持久化

如果需要保存对话历史（非必须，本地工具可选做）：

```prisma
model AiConversation {
  id        String   @id @default(cuid())
  userId    String
  title     String?
  skill     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages AiMessage[]
  user     User        @relation(fields: [userId], references: [id])

  @@map("ai_conversations")
}

model AiMessage {
  id             String        @id @default(cuid())
  conversationId String
  role           AiMessageRole
  content        String
  toolCalls      Json?         // 存储工具调用记录
  createdAt      DateTime      @default(now())

  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@map("ai_messages")
}
```

**建议 Phase 2 后期再做**，先让对话保存在前端内存/localStorage 中。

---

## 十二、安全与隐私（本地场景）

作为本地工具，安全需求降低，但仍需遵循 harness 框架的基本规范：

| 措施 | 本地场景处理 |
|:---|:---|
| Gateway 绑定 loopback | ✅ 必须，防止局域网内其他设备访问 |
| MCP Server Docker 沙盒 | ✅ 建议保留，防止工具被污染 |
| API Key 管理 | `.env` 文件存储，不提交 Git |
| `openclaw doctor` | 开发前运行一次检查配置 |
| ClawHub Skills 安全 | 本地使用可放宽，但避免安装来源不明的 Skill |

---

## 十三、联调测试清单

### 13.1 端到端测试用例

| # | 场景 | 操作 | 预期结果 |
|:---|:---|:---|:---|
| 1 | 基础对话 | 打开 AI 面板，输入"你好" | AI 回复问候语，流式显示 |
| 2 | 数据查询 | 输入"我今天专注了多久" | AI 调用 `phd-pomodoro/get_today_sessions`，返回今日专注时长 |
| 3 | 任务查询 | 输入"我还有哪些待办任务" | AI 调用 `phd-task/get_active_tasks`，列出待办 |
| 4 | 快捷翻译 | 输入 `/translate Abstract: Deep learning...` | 快速返回中文翻译，无工具调用 |
| 5 | 日记生成 | 输入"帮我写今天的日记" | AI 调用多个 MCP，生成结构化日记 |
| 6 | 工具可视化 | 输入"分析我这周的专注情况" | 前端显示多个工具调用的进度状态 |
| 7 | 取消流式 | AI 回复过程中点击取消 | 流式中断，显示已接收的部分内容 |
| 8 | 主题切换 | 切换深色/浅色模式 | AI 面板样式同步变化 |

### 13.2 命令速查

```bash
# 启动全部服务（4 个终端）
pnpm docker:up                    # Terminal 1: PostgreSQL + Redis
openclaw gateway start            # Terminal 2: OpenClaw Gateway
pnpm -F @phd/backend start:dev    # Terminal 3: NestJS
pnpm -F @phd/frontend dev         # Terminal 4: React

# 调试 MCP Server
openclaw tools list
openclaw tools call phd-pomodoro get_today_sessions
openclaw agent --skill phd-ai-diary --message "生成日记"

# 测试 SSE 接口
curl -N -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"我今天专注了多久"}'
```

---

## 十四、与现有模块的协作

### 14.1 AI 能操作什么

| 现有模块 | AI 能力（通过 MCP） | 未来扩展 |
|:---|:---|:---|
| 任务看板 | 查询任务列表、完成状态、统计 | 创建/更新任务（需写权限 MCP）|
| 日程管理 | 查询今日/本周事件、截止日期 | 创建事件（需写权限 MCP）|
| 番茄钟 | 查询专注数据、最佳时段分析 | 开始/结束计时（需实时接口）|
| 笔记系统 | 查询/搜索笔记内容（Phase 2 后）| 创建/编辑笔记 |
| 文献管理 | 查询 Zotero 库（通过 zotero-mcp）| 导入新文献 |

### 14.2 AI 不能做什么（当前限制）

- **不能修改数据**：当前 MCP Servers 仅提供读工具，写工具在后续版本中逐步开放
- **不能访问文件系统**：需要通过文件系统 MCP Server 额外配置
- **不能访问互联网**：除非配置 arXiv/搜索引擎 MCP Server

---

## 十五、后续迭代方向

完成本计划后，AI 助手已具备基础对话 + 数据感知能力。后续可按需扩展：

1. **RAG 笔记检索** —— 笔记系统完成后，接入向量搜索，AI 能基于笔记内容回答
2. **文献深度阅读** —— 接入 PDF 解析 MCP，AI 能总结论文内容
3. **多轮对话持久化** —— 将对话保存到数据库，支持跨会话历史
4. **语音输入** —— Web Speech API，解放双手
5. **AI 主动建议** —— 基于时间/数据触发（如"你已连续工作 2 小时，建议休息"）

---

*本计划由 AI 编码助手基于 `phd-os-harness` 框架生成，实施过程中可根据实际情况调整优先级和范围。*
