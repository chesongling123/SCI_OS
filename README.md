# ResearchOS —— AI 驱动的科研工作台

> **项目阶段**: ✅ Phase 1 MVP 已完成，进入 Phase 2 扩展  
> **主要语言**: 中文（文档与注释）  
> **最后更新**: 2026-04-23

---

## 项目简介

ResearchOS（科研生活助手）是一个面向科研工作者和深度知识工作者的**本地优先、AI 原生**个人科研工作台。以 OpenClaw 开源 AI 助手为基座，通过 MCP（Model Context Protocol）协议统一接入外部工具，构建覆盖文献管理、日程规划、实验记录、论文写作、番茄钟分析和 AI 助手对话的完整科研工作流。

**核心设计原则**: 数据主权 · AI 集成 · 可扩展性

---

## 技术栈

| 层级 | 技术选型 | 版本 |
|:---|:---|:---|
| 前端 | React + Vite + TypeScript + shadcn/ui + Tailwind CSS | v19 / v6 / v5.5 |
| 后端 | NestJS + Prisma + PostgreSQL + Redis | v11 / v6 / v15 / v7 |
| AI 层 | OpenClaw Gateway + LiteLLM + MCP | v2026.4.15 |
| 同步 | Yjs (CRDT) + Electric SQL | v13+ / v1.x |
| 桌面端 | Tauri 2.x（Phase 3）| v2.x |

---

## 项目结构

```
ResearchOS/
├── apps/
│   ├── frontend/              # React 19 + Vite 6 前端
│   │   ├── src/
│   │   │   ├── modules/       # 功能模块（日历/待办/番茄钟）
│   │   │   ├── stores/        # Zustand 状态管理
│   │   │   ├── pages/         # 页面级组件
│   │   │   └── lib/           # 工具函数
│   │   └── ...
│   └── backend/               # NestJS 11 后端
│       ├── src/
│       │   ├── modules/       # 业务模块（日历/待办/番茄钟/认证）
│       │   └── shared/        # 共享能力（PrismaService）
│       └── prisma/
│           └── schema.prisma  # 数据库模型定义
├── packages/
│   └── shared-types/          # 前后端共享类型（DTO / 枚举 / 接口）
├── docs/
│   ├── architecture/          # 10 章系统架构设计文档
│   ├── design/                # 设计备忘（可扩展性等）
│   └── ...
├── docker-compose.yml         # 开发环境一键启动
├── research-home-demo.html         # 液态玻璃首页静态 Demo
└── pnpm-workspace.yaml        # Monorepo 工作区定义
```

---

## 快速开始

### 前置要求

- **Node.js** >= 20（建议通过 nvm 管理）
- **pnpm** >= 9
- **Docker** + Docker Compose（用于 PostgreSQL / Redis / OpenClaw）

### 1. 克隆与安装

```bash
# 进入项目目录
cd ResearchOS

# 安装 monorepo 依赖（自动处理 workspace 链接）
pnpm install
```

### 2. 启动基础设施

```bash
# 一键启动 PostgreSQL + Redis + OpenClaw Gateway
pnpm docker:up

# 查看日志
pnpm docker:logs
```

> **注意**: 若未安装 Docker，需先安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或使用本地 PostgreSQL + Redis。

### 3. 数据库迁移

```bash
# 生成 Prisma Client
pnpm db:generate

# 执行首次迁移（创建表结构）
pnpm db:migrate

# 可视化查看数据库（可选）
pnpm db:studio
```

### 4. 启动开发服务器

```bash
# 方式一：同时启动前后端
pnpm dev

# 方式二：分别启动（推荐，开两个终端）
pnpm dev:backend   # http://localhost:3000
pnpm dev:frontend  # http://localhost:5173
```

启动后访问：
- 前端界面: http://localhost:5173
- Swagger API 文档: http://localhost:3000/api/docs
- OpenClaw Gateway: ws://localhost:18789

---

## Phase 1 开发任务（当前）

| 模块 | 状态 | 关键依赖 |
|:---|:---|:---|
| 工程脚手架 | ✅ 完成 | pnpm workspace + Vite + NestJS |
| 数据库 Schema | ✅ 完成 | Prisma + PostgreSQL |
| Docker 开发环境 | ✅ 完成 | Compose 三服务 |
| 共享类型包 | ✅ 完成 | DTO / 枚举 / 接口 |
| 液态玻璃 UI 系统 | ✅ 完成 | CSS 变量 + Tailwind |
| 日程管理（日历）| ✅ 已完成 | FullCalendar + 拖拽调整 |
| 任务看板（待办）| ✅ 已完成 | @dnd-kit + 乐观更新 |
| 番茄钟 | ✅ 已完成 | Web Audio API + Canvas 热力图 |
| 认证系统 | ✅ 已完成 | JWT Access Token + 登录/注册页 |
| AI 助手集成 | ✅ 已完成 | SSE 流式对话 + Function Calling |

---

## 常用命令

```bash
# 依赖管理
pnpm install              # 安装全部依赖
pnpm add -F @research/frontend <pkg>   # 向前端添加依赖
pnpm add -F @research/backend <pkg>    # 向后端添加依赖

# 构建
pnpm build                # 构建全部项目
pnpm -F @research/frontend build
pnpm -F @research/backend build

# 数据库
pnpm db:generate          # 生成 Prisma Client
pnpm db:migrate           # 执行迁移
pnpm db:studio            # Prisma Studio 可视化
pnpm db:seed              # 种子数据

# Docker
pnpm docker:up            # 启动基础设施
pnpm docker:down          # 停止
pnpm docker:logs          # 查看日志

# 代码质量
pnpm lint                 # ESLint 检查
pnpm typecheck            # TypeScript 类型检查
pnpm test                 # 运行测试
```

---

## 设计文档索引

| 文档 | 内容 |
|:---|:---|
| `docs/architecture/01-overview.md` | 项目概述与核心目标 |
| `docs/architecture/02-frontend.md` | 前端架构设计 |
| `docs/architecture/03-backend.md` | 后端架构设计 |
| `docs/architecture/04-database.md` | 数据库与数据模型 |
| `docs/architecture/05-ai-service.md` | AI 服务层架构 |
| `docs/architecture/06-sync-messaging.md` | 多设备同步与消息桥接 |
| `docs/architecture/07-deployment.md` | 部署与运维方案 |
| `docs/architecture/08-security.md` | 安全与隐私设计 |
| `docs/architecture/09-repositories.md` | 核心开源仓库汇总 |
| `docs/architecture/10-roadmap.md` | 实施路线图与风险分析 |
| `docs/design/extensibility-notes.md` | 可扩展性与可升级性设计备忘 |

---

## 许可证

MIT License
