# PhD_OS —— AI 驱动的博士科研工作台

> **项目阶段**: ✅ Phase 1 MVP 已完成，AI 模块接入完成
> **主要语言**: 中文（所有设计文档和注释均以简体中文撰写）
> **最后更新**: 2026-04-22

---

## 项目概述

PhD_OS（PhD Workstation）是一个面向博士研究者和深度知识工作者的**本地优先、AI 原生**个人科研工作台。项目直连 LLM API（Kimi Coding / OpenAI 兼容），通过 Function Calling 查询用户真实数据，构建覆盖文献管理、日程规划、实验记录、论文写作、番茄钟分析和 AI 助手对话的完整科研工作流。

**核心设计原则**:
- **数据主权**: 本地 PostgreSQL 为真相源，AI 对话通过 Function Calling 实时查询数据库
- **AI 集成**: 直连 LLM API，支持 Kimi Coding（Anthropic Messages API）和 OpenAI 兼容格式
- **可扩展性**: MCP Servers + 内部 Function Calling 双层工具系统

**当前状态**: Phase 1 核心模块已跑通，包含完整的 CRUD API、JWT 认证、AI 流式对话、工具调用循环。

---

## 项目结构

```
PhD_OS/
├── apps/
│   ├── backend/                    # NestJS 11 后端
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # JWT 认证（注册/登录/me）
│   │   │   │   ├── calendar/       # 日程模块（FullCalendar 对接）
│   │   │   │   ├── task/           # 任务模块（GTD 看板拖拽）
│   │   │   │   ├── pomodoro/       # 番茄钟模块（计时+热力图）
│   │   │   │   └── ai/             # AI 模块（直连 LLM + 工具调用）
│   │   │   ├── shared/             # PrismaService 等共享能力
│   │   │   ├── filters/            # 全局异常过滤器
│   │   │   ├── main.ts             # 入口
│   │   │   └── app.module.ts       # 根模块
│   │   ├── prisma/
│   │   │   └── schema.prisma       # 数据库 Schema
│   │   └── .env                    # 后端环境变量
│   └── frontend/                   # React 19 + Vite 6 前端
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/           # 登录/注册页面
│       │   │   ├── calendar/       # 日历视图
│       │   │   ├── task/           # 任务看板
│       │   │   ├── pomodoro/       # 番茄钟面板
│       │   │   └── ai/             # AI 聊天面板（液态玻璃 SSE）
│       │   ├── stores/             # Zustand 状态管理
│       │   ├── lib/                # API 工具、认证头封装
│       │   └── index.css           # 液态玻璃全局样式
│       └── vite.config.ts          # Vite 配置（含 /api 代理）
├── packages/
│   ├── shared-types/               # 前后端共享 DTO/枚举
│   └── mcp-servers/                # MCP Server（Docker 运行）
│       ├── pomodoro-mcp/
│       ├── task-mcp/
│       └── calendar-mcp/
├── docs/
│   ├── architecture/               # 系统架构设计（10 章）
│   ├── ai-integration/
│   │   └── development-plan.md     # AI 模块开发路线图
│   └── project-status.md           # 项目进度跟踪
├── phd-home-demo.html              # 首页静态 Demo（液态玻璃 UI）
└── AGENTS.md                       # 本文件
```

---

## 已实现的技术栈

### 前端层
| 组件 | 选型 | 版本 |
|:---|:---|:---|
| UI 框架 | React | 19.x |
| 构建工具 | Vite | 6.x |
| 类型系统 | TypeScript | 5.5+ |
| 组件库 | shadcn/ui + Tailwind CSS | latest |
| 日历 | FullCalendar | 6.x（液态玻璃主题覆盖） |
| 看板拖拽 | @dnd-kit/core + sortable | 7.0+ |
| 客户端状态 | Zustand | 5.0+ |
| 数据可视化 | ECharts | 5.5+ |
| Markdown 渲染 | react-markdown + remark-gfm | 10.x |
| 桌面端 | Tauri | 2.x（规划中） |
| 实时通信 | SSE (EventSource) | 原生 |

### API 网关层
| 组件 | 选型 | 版本 |
|:---|:---|:---|
| 后端框架 | NestJS | 11.x |
| ORM | Prisma | 6.6.0 |
| API 文档 | OpenAPI + Swagger | v3 |
| 限流 | @nestjs/throttler | 6.x |
| 实时推送 | SSE | — |

### AI 服务层
| 组件 | 选型 | 说明 |
|:---|:---|:---|
| LLM 提供商 | Kimi Coding | Anthropic Messages API，模型 k2p5 |
| 备选提供商 | DeepSeek / OpenAI | OpenAI 兼容格式 |
| 工具调用 | Function Calling | 内部工具：get_tasks / get_calendar_events / get_pomodoro_stats / get_today_summary |
| 流式输出 | SSE | 逐 token 流式返回 |

### 数据持久层
| 组件 | 选型 | 说明 |
|:---|:---|:---|
| 数据库 | PostgreSQL 15 | 开发环境，端口 5433 |
| 缓存 | Redis 7 | 会话、队列 |
| ORM | Prisma | CUID 主键、UTC 时间戳、软删除 |

---

## 已实现的模块

| 模块 | 状态 | 功能 |
|:---|:---|:---|
| `AuthModule` | ✅ | JWT 注册/登录/me，bcrypt 哈希，localStorage 持久化 |
| `CalendarModule` | ✅ | 事件 CRUD、RRULE、软删除 |
| `TaskModule` | ✅ | GTD 三级任务、拖拽排序、优先级、番茄数关联 |
| `PomodoroModule` | ✅ | 专注计时、中断追踪、今日/历史统计 API |
| `AiModule` | ✅ | SSE 流式对话、Function Calling 工具循环、Kimi Coding 直连 |

### AI 模块架构

```
用户输入 → AiController (SSE)
              ↓
        LlmService.chatStreamWithTools()
              ↓
        Kimi Coding API (Anthropic Messages API)
              ↓
        如需工具 → AiToolsService.execute() → Prisma 查数据库
              ↓
        工具结果回传 LLM → 最终回复 SSE 流式返回
```

**支持的工具**:
- `get_tasks`: 查询任务列表（支持状态/优先级筛选）
- `get_calendar_events`: 查询日程事件（支持日期范围）
- `get_pomodoro_stats`: 查询番茄钟统计（今日/本周/本月）
- `get_today_summary`: 获取今日综合概览

---

## 构建与运行

**开发环境**:
```bash
# 1. 启动数据库（Docker）
pnpm docker:up

# 2. 配置 AI API Key
# 编辑 apps/backend/.env，设置 KIMI_CODING_API_KEY

# 3. 一键启动前后端
pnpm dev

# 前端: http://localhost:5173
# 后端: http://localhost:3000
# Swagger: http://localhost:3000/api/docs
```

**数据库迁移**:
```bash
pnpm db:migrate
```

---

## 开发约定与规范

- **语言**: 所有代码注释、文档、变量命名优先使用**简体中文**。技术术语可保留英文。
- **类型系统**: 全栈 TypeScript，DTO 在 `packages/shared-types` 中单点定义。
- **API 设计**: RESTful 风格，URL 前缀 `/api/v1/`，分页采用 Cursor-based。
- **数据库**: 主键使用 CUID，时间戳 UTC 存储，软删除优先于级联删除。
- **前端样式**: 液态玻璃（Liquid Glass）视觉系统，CSS 变量定义在 `:root`，支持浅色/深色双主题。

---

## AI 编码助手须知

1. **本项目已有实际代码**。Phase 1 核心模块全部实现，可以直接修改和扩展。
2. **所有文档均为中文**。新增代码注释、README 更新、变量命名均应以中文优先。
3. **架构文档是权威来源**，但已实现的部分以代码为准。
4. **AI 层为直连 LLM**，不再依赖 OpenClaw Gateway。所有 LLM 调用通过 `LlmService` 统一封装。
5. **安全是架构约束**。任何涉及用户数据、AI 对话的实现都必须先通过安全审查。
6. **.env 文件不上传 Git**。`apps/backend/.env` 包含 API Key，已加入 `.gitignore`。
