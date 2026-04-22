# PhD_OS —— AI 驱动的博士科研工作台

> **项目阶段**: 🚧 架构设计已完成，核心代码尚未开始编写（MVP 准备期）
> **主要语言**: 中文（所有设计文档和注释均以简体中文撰写）
> **最后更新**: 2026-04-21

---

## 项目概述

PhD_OS（PhD Workstation）是一个面向博士研究者和深度知识工作者的**本地优先、AI 原生**个人科研工作台。项目以 OpenClaw 开源 AI 助手为基座，通过 MCP（Model Context Protocol）协议统一接入 200+ 外部工具，构建覆盖文献管理、日程规划、实验记录、论文写作、番茄钟分析和 AI 助手对话的完整科研工作流。

**核心设计原则**:
- **数据主权**: 本地 SQLite 为真相源，云端仅存储同步元数据
- **AI 集成**: MCP 协议作为所有 AI 工具接入的统一总线
- **可扩展性**: OpenClaw Skills + Plugins 双层扩展系统

**当前状态**: 项目处于设计文档阶段。`docs/architecture/` 下已存放 10 章完整的系统架构设计文档，`phd-home-demo.html` 为液态玻璃风格的首页 Demo。尚未创建 `src/`、`package.json` 或其他工程代码文件。

---

## 项目结构

```
PhD_OS/
├── docs/                           # 设计文档存档
│   ├── README.md                   # 文档目录索引（中文）
│   ├── architecture/               # 系统架构设计（10 个章节）
│   │   ├── 01-overview.md          # 项目概述与核心目标
│   │   ├── 02-frontend.md          # 前端架构设计
│   │   ├── 03-backend.md           # 后端架构设计
│   │   ├── 04-database.md          # 数据库与数据模型
│   │   ├── 05-ai-service.md        # AI 服务层架构
│   │   ├── 06-sync-messaging.md    # 多设备同步与消息桥接
│   │   ├── 07-deployment.md        # 部署与运维方案
│   │   ├── 08-security.md          # 安全与隐私设计
│   │   ├── 09-repositories.md      # 核心开源仓库汇总
│   │   ├── 10-roadmap.md           # 实施路线图与风险分析
│   │   └── phd_workstation_architecture.md  # 未拆分的原始备份
│   ├── ai-integration/             # （预留，当前为空）
│   ├── api/                        # （预留，当前为空）
│   ├── database/                   # （预留，当前为空）
│   ├── deployment/                 # （预留，当前为空）
│   └── design/                     # （预留，当前为空）
├── phd-home-demo.html              # 首页静态 Demo（液态玻璃 UI）
└── AGENTS.md                       # 本文件
```

**说明**: `docs/` 下的 `ai-integration/`、`api/`、`database/`、`deployment/`、`design/` 子目录目前为空，是架构设计文档中规划的后续填充区域。

---

## 计划中的技术栈

### 前端层
| 组件 | 选型 | 版本 |
|:---|:---|:---|
| UI 框架 | React | 19.x |
| 构建工具 | Vite | 6.x |
| 类型系统 | TypeScript | 5.5+ |
| 组件库 | shadcn/ui + Tailwind CSS | latest |
| 日历 | FullCalendar | 6.x |
| 看板拖拽 | @dnd-kit/core + sortable | 7.0+ |
| 富文本编辑 | TipTap 2.x / BlockNote | v2 |
| PDF 渲染 | PDF.js | v5.4+ |
| 数据可视化 | ECharts (react-echarts) | 5.5+ |
| 客户端状态 | Zustand | 5.0+ |
| 服务端状态 | TanStack Query | 5.0+ |
| 桌面端 | Tauri | 2.x |
| PWA | Workbox + Service Worker | latest |
| 实时通信 | SSE (EventSource) | 原生 |

### API 网关层
| 组件 | 选型 | 版本 |
|:---|:---|:---|
| 后端框架 | NestJS | v10+ |
| 任务队列 | BullMQ | v5+ |
| ORM | Prisma / Drizzle ORM | v5+ / latest |
| API 文档 | OpenAPI + Swagger | v3 |
| 实时推送 | SSE / WebSocket | — |

### AI 服务层
| 组件 | 选型 | 说明 |
|:---|:---|:---|
| AI 网关 | OpenClaw Gateway | v2026.4.15+，独立进程运行 |
| Agent 运行时 | pi-mono (嵌入式) | OpenClaw 原生 |
| LLM 路由 | LiteLLM Proxy | 100+ 提供商统一接口 |
| 工具协议 | MCP (Model Context Protocol) | v2025-03-26 |
| 本地模型 | Ollama | v0.4+ |
| 记忆系统 | OpenClaw Supermemory | 原生 |

### 数据持久层
| 组件 | 选型 | 说明 |
|:---|:---|:---|
| 本地数据库 | SQLite (WAL 模式) | 零配置，单文件 |
| 云端数据库 | PostgreSQL 15+ + pgvector | 关系型 + 向量搜索 |
| 缓存 | Redis 7+ | 会话、队列、热点缓存 |
| 同步引擎 | Yjs (CRDT) / Electric SQL | 离线优先自动合并 |
| 向量嵌入 | text-embedding-3 / BGE | 1536 维度 |

---

## 计划中的代码组织

项目设计为**单体优先（Monolith-first）**的模块化架构，按 NestJS Module 划分功能域：

| 模块 | 职责 | 接口 |
|:---|:---|:---|
| `AuthModule` | JWT/OAuth2 认证、Refresh Token 轮转 | `/api/v1/auth/*` |
| `CalendarModule` | 事件 CRUD、iCal/CalDAV 同步、RRULE 展开 | REST + SSE |
| `TaskModule` | GTD 三级任务、标签、优先级、番茄数关联 | `/api/v1/tasks/*` |
| `NoteModule` | Markdown 存储、Git 版本控制、YAML Frontmatter 索引 | REST + WebSocket |
| `PomodoroModule` | 专注计时、中断追踪、高效时段分析 API | REST + SSE |
| `FileModule` | PDF 文本提取、缩略图、上传下载 | `/api/v1/files/*` |
| `AiModule` | OpenClaw Client 封装、RAG 管道、日记生成 | WebSocket / MCP |

前端按功能模块组织视图组件，状态管理遵循 **Zustand（客户端状态） + TanStack Query（服务端状态）** 分离原则。

---

## 计划中的构建与运行

**开发环境**（尚未实现）:
- Docker Compose 双文件策略：`docker-compose.yml` + `docker-compose.override.yml`
- 一键启动：`docker compose up -d`
- 前端 Dev Server：Vite（冷启动 < 500ms，HMR < 50ms）
- 后端：NestJS + Prisma（`prisma migrate dev`）

**生产部署**（规划中）:
- Docker 多阶段构建（Alpine 基础镜像）
- Caddy 反向代理（自动 HTTPS）
- 目标服务器：Hetzner CPX22（$9.49/月）或阿里云/腾讯云轻量
- 监控栈：Prometheus + Grafana + Uptime Kuma + Loki

**目前可运行的内容**:
- `phd-home-demo.html` 是一个纯静态 HTML 文件，可直接用浏览器打开，展示液态玻璃风格的首页设计

---

## 计划中的测试策略

架构文档中明确但未细化测试方案。基于技术栈推断，未来测试体系应包含：

- **单元测试**: Jest（NestJS 原生集成）+ Vitest（Vite 前端）
- **E2E 测试**: Playwright（跨浏览器，PWA/桌面端场景）
- **API 契约测试**: 利用 `@nestjs/swagger` 生成的 OpenAPI 规范
- **OpenClaw 回归测试**: 每次 OpenClaw 版本升级前在 staging 环境执行完整 MCP 调用测试套件
- **安全扫描**: Trivy 容器漏洞扫描、FOSSology/ScanCode 许可证合规检查

---

## 安全与隐私考量

安全设计是贯穿架构的核心约束，而非事后加固：

1. **数据主权**: 本地 SQLite 为真相源，同步通道端到端加密
2. **分层 AI 处理**: 敏感任务走本地 Ollama，非敏感任务走云端 LLM
3. **传输安全**: 强制 TLS 1.3 + WSS，服务间 mTLS 双向认证
4. **存储安全**: SQLite AES-256-GCM 透明加密，密钥设备本地生成
5. **API 安全**: 短期 JWT（<15 min）+ `@nestjs/throttler` 限流 + 白名单 CORS
6. **MCP 沙盒**: 所有 MCP Server 独立 Docker 容器运行，gVisor 额外隔离
7. **审计**: 全量操作日志 AES 加密写入 append-only 存储，保留 180 天活跃 + 2 年归档

**特别警示**: ClawHub 约 8% 的 Skills 含恶意代码，生产环境必须启用 OpenClaw 六层安全模型。

---

## 开发约定与规范

- **语言**: 所有代码注释、文档、变量命名优先使用**简体中文**。技术术语可保留英文（如 `WebSocket`、`CRDT`、`MCP`）。
- **类型系统**: 全栈 TypeScript，DTO 和接口类型建议在 monorepo 的 `packages/shared-types` 中单点定义，前后端与 OpenClaw 客户端共享。
- **版本控制**: 常规功能使用语义化版本；OpenClaw 采用 CalVer（如 `v2026.4.15`），生产环境 Docker 镜像须固定版本标签。
- **API 设计**: RESTful 风格，URL 前缀 `/api/v1/`，分页采用 Cursor-based。
- **数据库**: 主键使用 CUID，时间戳 UTC 存储，软删除优先于级联删除。
- **前端样式**: 液态玻璃（Liquid Glass）视觉系统，CSS 变量定义在 `:root`，支持浅色/深色双主题。

---

## 关键外部依赖

项目重度依赖以下外部开源系统，它们将作为独立进程运行，不纳入本仓库源码：

- **OpenClaw Gateway**: 独立的 AI 服务层，通过 WebSocket (`ws://127.0.0.1:18789`) 与本项目后端通信。采用"黑盒集成"——不 Fork、不修改其源码。
- **Zotero 7**: 用户自有的文献管理器，通过本地 HTTP API (`127.0.0.1:23119`) 和 zotero-mcp-server 接入。
- **PostgreSQL + pgvector**: 云端关系型数据库与向量搜索。
- **Redis**: 缓存与 BullMQ 任务队列后端。

---

## 实施路线图（规划中）

| 阶段 | 时间 | 核心任务 |
|:---|:---|:---|
| **Phase 1** | 1-2 个月 | Docker Compose 开发环境；NestJS + Prisma + PostgreSQL 后端基座；React 19 + Vite 6 前端脚手架；OpenClaw Gateway 黑盒集成；日程/待办/番茄钟三模块 |
| **Phase 2** | 2-3 个月 | RAG 管道搭建；AI 日记生成；Zotero MCP Server 集成；TipTap 笔记系统；BullMQ 任务队列 |
| **Phase 3** | 1-2 个月 | feishu-openclaw 桥接器；Yjs + Electric SQL 多端同步；Hetzner 生产部署；Caddy HTTPS + 监控告警；PWA 离线支持 |

---

## AI 编码助手须知

1. **本项目目前无实际代码**。如果你被要求进行代码修改，首先需要根据架构文档创建工程脚手架（`package.json`、目录结构、Docker Compose 等）。
2. **所有文档均为中文**。新增代码注释、README 更新、变量命名均应以中文优先。
3. **架构文档是唯一的权威来源**。技术选型、模块边界、数据模型均已在前述 10 章架构文档中详细定义。实施前务必查阅对应章节。
4. **OpenClaw 黑盒集成原则**。不要试图将 OpenClaw 源码嵌入本项目，也不要修改其内部实现。所有 AI 层交互应通过其公开的 WebSocket/MCP 协议进行。
5. **安全是架构约束**。任何涉及用户数据、AI 对话、文献内容的实现都必须先通过安全审查（本地优先、加密、最小权限）。
6. **Demo 文件可独立演化**。`phd-home-demo.html` 是纯静态展示文件，后续正式前端实现应在此基础上用 React + Vite 重构，但可保留其视觉设计体系（液态玻璃 CSS 变量）。
