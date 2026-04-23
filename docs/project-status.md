# PhD_OS 项目状态追踪

> **文档类型**: 项目进度备忘  
> **最后更新**: 2026-04-23  
> **当前阶段**: ✅ Phase 1 MVP 已完成，进入 Phase 2 扩展

---

## 一、已完成内容

### 1.1 Monorepo 工程脚手架

| 项目 | 状态 | 说明 |
|:---|:---|:---|
| pnpm workspace 配置 | ✅ | `apps/*` + `packages/*` 双工作区 |
| 根级统一脚本 | ✅ | `pnpm dev` / `pnpm build` / `pnpm docker:up` / `pnpm db:migrate` |
| `.nvmrc` | ✅ | Node.js 20 锁定 |
| `.env.example` | ✅ | 全部环境变量模板（已更新端口 5433） |
| `.gitignore` | ✅ | 排除 node_modules / dist / .env / 上传文件等 |
| `.npmrc` | ✅ | `ignore-build-scripts=false`，允许 Prisma/bcrypt/esbuild 构建 |
| `pnpm-workspace.yaml` | ✅ | 包含 `onlyBuiltDependencies` 白名单 |

### 1.2 前端（`apps/frontend`）

| 组件 | 状态 | 验证结果 |
|:---|:---|:---|
| React 19 + Vite 6 + TypeScript 5.5 | ✅ | 生产构建通过（~91KB JS gzip，代码分割后） |
| Tailwind CSS 3.4 + tailwindcss-animate | ✅ | 配置完成 |
| 液态玻璃设计系统 | ✅ | CSS 变量完整迁移自 `phd-home-demo.html`，含浅色/深色双主题 |
| shadcn/ui 基础工具（`cn` 函数） | ✅ | `clsx` + `tailwind-merge` |
| 路由系统（React Router v6） | ✅ | `/` 首页、`/calendar`、`/tasks`、`/pomodoro`、`/ai` |
| 主题状态管理（Zustand） | ✅ | `data-theme="dark"` 切换 + localStorage 持久化 |
| TanStack Query v5 客户端 | ✅ | staleTime 5 分钟、窗口聚焦不刷新 |
| Vite 代理配置 | ✅ | `/api` → `localhost:3000` |
| 核心页面占位 | ✅ | Home（液态玻璃 Hero + 功能卡片）、Layout（玻璃导航栏） |
| dev server 启动测试 | ✅ | `localhost:5173`，211ms 启动 |

### 1.3 后端（`apps/backend`）

| 组件 | 状态 | 说明 |
|:---|:---|:---|
| NestJS 11 模块化架构 | ✅ | AppModule 挂载 6 个子模块 |
| Swagger/OpenAPI 文档 | ✅ | `http://localhost:3000/api/docs`，带 BearerAuth |
| API 版本前缀 | ✅ | `/api/v1` |
| 全局限流 | ✅ | `@nestjs/throttler`，60 秒 100 请求 |
| CORS | ✅ | 开发环境允许 `localhost:5173` |
| 全局 ValidationPipe | ✅ | whitelist + transform + forbidNonWhitelisted |
| PrismaService（共享模块） | ✅ | `@Global()` 导出，OnModuleInit/OnModuleDestroy 生命周期 |
| 模块骨架 | ✅ | AuthModule / CalendarModule / TaskModule / PomodoroModule / AiModule / SharedModule |
| NestJS 编译 | ✅ | `nest build` 零错误通过 |
| 数据库连接测试 | ✅ | 所有模块初始化成功，Prisma 连接 PostgreSQL 正常 |

### 1.4 共享类型包（`packages/shared-types`）

| 类型 | 状态 | 内容 |
|:---|:---|:---|
| 枚举 | ✅ | `TaskStatus` / `Priority` / `InterruptionType` / `AiMessageRole` |
| DTO | ✅ | Event（Create/Update/Response）、Task（Create/Update/Response/Move）、Pomodoro（Create/End/Response/Stats）、ChatRequest |
| 接口 | ✅ | `JwtPayload`、`GlassTheme`、`AiStreamEvent` |
| 编译 | ✅ | `tsc` 生成 `dist/` |

### 1.5 数据库（Prisma 6.6.0）

| 组件 | 状态 | 说明 |
|:---|:---|:---|
| Prisma Schema | ✅ | `User` / `Event` / `Task` / `PomodoroSession` 四表 + `TaskStatus` 枚举 |
| 设计规范 | ✅ | CUID 主键、UTC 时间戳（`Timestamptz(3)`）、软删除（`deletedAt`）、自引用子任务 |
| 索引 | ✅ | `[userId, startAt]`、`[userId, status]`、`[userId, sortOrder]`、`[deletedAt]` |
| Prisma Client 生成 | ✅ | `prisma generate` 成功 |
| 首次迁移 | ✅ | `20260422032721_init_phase1` 已应用，4 张表 + `_prisma_migrations` |
| 环境变量 | ✅ | `apps/backend/.env` 已配置 `DATABASE_URL`（端口 5433） |

### 1.6 Docker Compose 开发环境

| 服务 | 状态 | 配置 |
|:---|:---|:---|
| PostgreSQL 15 + pgvector | ✅ | `pgvector/pgvector:pg15`，端口 **5433** → 5432，健康检查通过 |
| Redis 7 | ✅ | `redis:7-alpine`，端口 6379，健康检查通过 |
| OpenClaw Gateway | ⏸️ 注释 | 镜像未发布到公开仓库，AI 层已改为直连 LLM（Kimi Coding） |

### 1.7 认证系统（AuthModule）

| 组件 | 状态 | 说明 |
|:---|:---|:---|
| JWT Access Token | ✅ | `@nestjs/jwt` + `passport-jwt` |
| 注册 API | ✅ | `POST /api/v1/auth/register`，bcrypt 哈希存储 |
| 登录 API | ✅ | `POST /api/v1/auth/login`，返回 JWT Token |
| 个人信息 API | ✅ | `GET /api/v1/auth/me`，Bearer Token 鉴权 |
| 前端登录/注册页面 | ✅ | 液态玻璃表单，localStorage Token 持久化 |
| API 请求自动带 Token | ✅ | Axios 拦截器注入 `Authorization: Bearer <token>` |

### 1.8 AI 助手模块（AiModule）

| 组件 | 状态 | 说明 |
|:---|:---|:---|
| LLM 直连服务 | ✅ | `LlmService` 统一封装 Kimi Coding（Anthropic Messages API） |
| SSE 流式对话 | ✅ | `AiController` 逐 token 流式返回，前端 `EventSource` 接收 |
| Function Calling 工具循环 | ✅ | LLM 返回工具调用 → `AiToolsService.execute()` → 结果回传 |
| 前端聊天面板 | ✅ | `AiChatPanel` + `AiMessageBubble` + `ToolCallIndicator` |
| 工具：get_tasks | ✅ | 查询任务列表，支持 status / priority 筛选 |
| 工具：get_calendar_events | ✅ | 查询日程事件，支持日期范围 |
| 工具：get_pomodoro_stats | ✅ | 查询番茄钟统计（今日/本周/本月） |
| 工具：get_today_summary | ✅ | 获取今日综合概览 |

### 1.9 问题排查记录

| 问题 | 原因 | 解决方案 |
|:---|:---|:---|
| `docker compose` 不可用 | Docker Desktop 未启动 | `open -a Docker` 启动后解决 |
| `pull access denied for openclaw/gateway` | 镜像不存在于公开仓库 | 注释掉 docker-compose.yml 中的 openclaw 服务；AI 改为直连 LLM |
| `P1010: User phd was denied access` | 宿主机 PostgreSQL 14 占用 5432 端口 | 将 Docker PostgreSQL 映射到 **5433:5432**，同步更新 `.env` |
| `EADDRINUSE: address already in use :::3000` | 之前测试的后端进程未退出 | 执行 `kill $(lsof -t -i:3000)` 即可 |

---

## 二、验证记录

### 2.1 构建测试

```bash
# 2026-04-22
$ pnpm install          # ✅ 成功，bcrypt/Prisma 编译通过
$ pnpm -F @phd/shared-types build   # ✅ tsc 零错误
$ pnpm -F @phd/frontend build       # ✅ Vite 零错误，~91KB JS gzip
$ pnpm -F @phd/backend build        # ✅ NestJS 零错误
```

### 2.2 运行时测试

```bash
# 前端 dev server
$ pnpm -F @phd/frontend dev
# ✅ VITE v6.4.2 ready in 211 ms
# ✅ Local: http://localhost:5173/

# 后端 dev server（数据库连接成功后）
$ pnpm -F @phd/backend start:dev
# ✅ [NestFactory] Starting Nest application...
# ✅ SharedModule dependencies initialized    ← Prisma 连接 PostgreSQL 成功
# ✅ AppModule / AuthModule / CalendarModule / TaskModule / PomodoroModule / AiModule 全部初始化
# ✅ Nest application successfully started

# Docker 服务
$ pnpm docker:up
# ✅ Container phd-postgres Started
# ✅ Container phd-redis Started

# 数据库连接验证
$ psql -h 127.0.0.1 -p 5433 -U phd -d phd_os -c "\dt"
# ✅ events / pomodoro_sessions / tasks / users / _prisma_migrations

# Prisma 迁移
$ pnpm db:migrate
# ✅ Applying migration `20260422032721_init_phase1`
# ✅ Your database is now in sync with your schema.
```

---

## 三、核心模块实现记录

### 3.1 任务看板模块（✅ 已完成）

选择任务看板作为首个完整模块的原因：
1. **数据模型最简单** —— 只有 `Task` 一张核心表，无复杂关联
2. **交互最直观** —— 三列拖拽看板，用户可立即感知功能价值
3. **技术栈覆盖全** —— 同时锻炼后端 API、前端状态管理、拖拽交互、乐观更新

#### 后端实现（`apps/backend/src/modules/task/`）

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 1 | `TaskController` + `TaskService` 骨架 | ✅ | NestJS 三层架构，Prisma 数据库访问 |
| 2 | `GET /api/v1/tasks` 列表查询 | ✅ | 支持 `status` 过滤、按 `sortOrder` 排序、软删除过滤 |
| 3 | `POST /api/v1/tasks` 创建任务 | ✅ | ValidationPipe DTO 校验，自动计算 `sortOrder` |
| 4 | `PATCH /api/v1/tasks/:id` 更新任务 | ✅ | 支持更新标题/状态/优先级 |
| 5 | `PATCH /api/v1/tasks/:id/move` 拖拽移动 | ✅ | **核心接口**：更新 `status` + `sortOrder`，支持跨列/同列重排 |
| 6 | `DELETE /api/v1/tasks/:id` 软删除 | ✅ | `deletedAt = new Date()`，非物理删除 |
| 7 | Swagger 文档注解 | ✅ | `@ApiTags` / `@ApiOperation` / `@ApiResponse` |

#### 前端实现（`apps/frontend/src/modules/task/`）

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 8 | API 客户端封装 | ✅ | TanStack Query：`useTasks` / `useCreateTask` / `useMoveTask` / `useDeleteTask` |
| 9 | 三列看板布局 | ✅ | 液态玻璃卡片样式，列头显示任务计数 |
| 10 | `@dnd-kit` 拖拽集成 | ✅ | `DndContext` + `SortableContext` + `DragOverlay`，跨列拖拽 |
| 11 | 拖拽排序算法 | ✅ | 自动计算 `sortOrder`（首项-1、末项+1、中间取中值） |
| 12 | 任务创建弹窗 | ✅ | 液态玻璃 Dialog，标题输入 + P1-P4 优先级选择 |
| 13 | 任务删除 | ✅ | 悬停显示删除按钮，confirm 确认 |

#### 工程完善

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 14 | 全局异常过滤器 | ✅ | `AllExceptionsFilter`，统一 `{ statusCode, message, timestamp }` 格式 |
| 15 | 种子数据 | ✅ | `prisma/seed.ts` 生成 10 条示例任务 + 1 个演示用户 |

#### 联调验证（2026-04-22）

```bash
# 后端启动日志
✅ [RoutesResolver] TaskController {/api/v1/tasks}
✅ Mapped {/api/v1/tasks, GET}
✅ Mapped {/api/v1/tasks, POST}
✅ Mapped {/api/v1/tasks/:id, PATCH}
✅ Mapped {/api/v1/tasks/:id/move, PATCH}
✅ Mapped {/api/v1/tasks/:id, DELETE}

# API 测试
GET  /api/v1/tasks           → ✅ 返回 10 条种子数据
POST /api/v1/tasks           → ✅ 创建成功，sortOrder 自动递增
PATCH /api/v1/tasks/:id/move → ✅ 跨列拖拽，sortOrder 重新计算
DELETE /api/v1/tasks/:id     → ✅ 软删除，deletedAt 标记

# 构建测试
pnpm -F @phd/backend build   → ✅ 零错误
pnpm -F @phd/frontend build  → ✅ 零错误
```

### 3.2 日程管理模块（✅ 已完成）

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 1 | 后端 Event CRUD API | ✅ | 5 个 REST 路由：列表/详情/创建/更新/删除 |
| 2 | 后端时间范围过滤 | ✅ | `startFrom` / `startTo` 查询参数 |
| 3 | 前端 FullCalendar 集成 | ✅ | 月/周/日三视图、点击创建、拖拽调整时间 |
| 4 | 前端事件编辑弹窗 | ✅ | 液态玻璃 Dialog：标题/时间/全天/地点/描述/颜色标签 |
| 5 | 前端事件删除 | ✅ | 编辑模式下底部显示删除按钮 |

#### 联调验证（2026-04-22）

```bash
# 后端启动日志
✅ [RoutesResolver] CalendarController {/api/v1/calendar/events}
✅ Mapped {/api/v1/calendar/events, GET}
✅ Mapped {/api/v1/calendar/events/:id, GET}
✅ Mapped {/api/v1/calendar/events, POST}
✅ Mapped {/api/v1/calendar/events/:id, PATCH}
✅ Mapped {/api/v1/calendar/events/:id, DELETE}

# API 测试
GET  /api/v1/calendar/events  → ✅ 返回 6 条日程种子数据
POST /api/v1/calendar/events  → ✅ 创建成功
PATCH /api/v1/calendar/events/:id → ✅ 拖拽调整时间后更新

# 种子数据
✅ 6 条示例日程：组会汇报、文献阅读、番茄钟写作、导师讨论、学术研讨会、论文 Deadline
```

### 3.3 番茄钟模块（✅ 已完成）

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 1 | 后端 Session CRUD | ✅ | 6 个路由：开始/结束/今日列表/历史/今日统计/每日聚合 |
| 2 | 后端统计 API | ✅ | `stats/today`（总时长/完成数/中断数）+ `stats/daily`（热力图数据） |
| 3 | 前端计时器核心 | ✅ | 圆形 SVG 进度条，25/5/15 三种模式，开始/暂停/结束/重置 |
| 4 | 前端 Web Audio API 白噪声 | ✅ | 实时生成棕噪声（Brown Noise），低通滤波 400Hz，柔和不刺耳 |
| 5 | 前端 Canvas 52 周热力图 | ✅ | 365 天数据矩阵，颜色深浅映射专注时长，月份标签 |
| 6 | 前端今日统计卡片 | ✅ | 总专注时长、完成番茄数、中断次数 |
| 7 | 前端今日记录列表 | ✅ | 每条记录显示时长、开始时间、中断次数 |

#### 联调验证（2026-04-22）

```bash
# 后端启动日志
✅ [RoutesResolver] PomodoroController {/api/v1/pomodoro}
✅ Mapped {/api/v1/pomodoro/sessions, POST}
✅ Mapped {/api/v1/pomodoro/sessions/:id/end, PATCH}
✅ Mapped {/api/v1/pomodoro/sessions/today, GET}
✅ Mapped {/api/v1/pomodoro/sessions/history, GET}
✅ Mapped {/api/v1/pomodoro/stats/today, GET}
✅ Mapped {/api/v1/pomodoro/stats/daily, GET}

# API 测试
GET /api/v1/pomodoro/stats/today  → ✅ {"totalDuration":2767,"completedCount":2,"interruptionCount":0}
GET /api/v1/pomodoro/stats/daily?days=7 → ✅ 7 天聚合数据

# 种子数据
✅ 234 条番茄钟历史记录（90 天随机分布，用于热力图展示）
```

### 3.4 AI 助手模块（✅ 已完成）

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 1 | LLM 服务封装 | ✅ | `LlmService` 支持 Kimi Coding（Anthropic Messages API） |
| 2 | SSE 流式接口 | ✅ | `POST /api/v1/ai/chat` 返回 `text/event-stream` |
| 3 | 工具注册与执行 | ✅ | `AiToolsService` 统一管理内部工具，执行后结果回传 LLM |
| 4 | 前端聊天面板 | ✅ | 液态玻璃侧边栏，消息气泡 + 流式打字机效果 |
| 5 | 工具调用指示器 | ✅ | 显示 AI 正在查询哪个工具（如"正在查看今日番茄钟统计..."） |
| 6 | 前端 SSE Hook | ✅ | `useAiChat` 管理 EventSource 生命周期 + 消息状态 |

#### UI 打磨记录（2026-04-23）

| # | 改动 | 说明 |
|:---|:---|:---|
| 1 | 笔记列表卡片精简 | 去掉 `plainText` 内容预览，仅展示标题 + 标签 + 相对时间，卡片更紧凑 |
| 2 | 删除弹窗统一 | `NotePage` 从 `window.confirm()` 迁移到项目统一的 `ConfirmDialog`（Portal + 液态玻璃样式） |
| 3 | 侧边栏可收起 | `FolderTree` 和 `NoteSidebar` 新增 `collapsed` / `onToggleCollapse` props，支持独立折叠 |
| 4 | 收起动画 | `transition-all duration-200` 平滑过渡，收起后仅显示 40px 窄条 + 展开按钮 |

#### 联调验证（2026-04-23）

```bash
# 后端启动日志
✅ [RoutesResolver] AiController {/api/v1/ai}
✅ Mapped {/api/v1/ai/chat, POST}

# API 测试
POST /api/v1/ai/chat (SSE) → ✅ 流式返回 token，工具调用正常触发
工具: get_tasks              → ✅ 返回当前任务列表
工具: get_calendar_events    → ✅ 返回指定日期范围日程
工具: get_pomodoro_stats     → ✅ 返回今日/本周/本月统计
工具: get_today_summary      → ✅ 返回综合概览
工具: search_notes           → ✅ 搜索笔记内容
工具: get_note_detail        → ✅ 获取笔记详情
```

### 3.5 笔记系统模块（✅ 已完成）

| # | 任务 | 状态 | 说明 |
|:---|:---|:---|:---|
| 1 | 数据库 Schema（Note + NoteFolder） | ✅ | CUID / JSON content / plainText / tags / vector 预留 / 软删除 |
| 2 | 后端 CRUD API | ✅ | 6 个路由：列表/搜索/详情/创建/更新/删除 + 4 个文件夹路由 |
| 3 | 前端 TipTap 编辑器 | ✅ | StarterKit + Link + TaskList + Placeholder |
| 4 | 前端笔记列表 + 搜索 | ✅ | 侧边栏列表、关键词过滤、标签展示 |
| 5 | AI 工具集成 | ✅ | get_notes / search_notes / get_note_detail |
| 6 | 标签系统 | ✅ | 增删标签、标签过滤 |
| 7 | 置顶/归档 | ✅ | API 支持，前端 UI 已展示置顶图标 |
| 8 | 文件夹管理 | ✅ | 树形 UI、新建/重命名/删除、笔记按文件夹筛选 |
| 9 | 侧边栏收起/展开 | ✅ | 文件夹列和笔记列表均可独立折叠，给编辑器更大空间 |
| 10 | UI 统一 | ✅ | 删除确认使用项目标准 `ConfirmDialog`（与 TaskPage 一致） |
| 11 | 笔记列表卡片精简 | ✅ | 仅显示标题 + 标签 + 时间，去除内容预览 |
| 12 | 种子数据 | ✅ | 5 条示例笔记 + 3 个文件夹 + 笔记内容 |

#### 联调验证（2026-04-23）

```bash
# 后端启动日志
✅ [RoutesResolver] NoteController {/api/v1/notes}
✅ Mapped {/api/v1/notes, GET}
✅ Mapped {/api/v1/notes/search, GET}
✅ Mapped {/api/v1/notes/:id, GET}
✅ Mapped {/api/v1/notes, POST}
✅ Mapped {/api/v1/notes/:id, PATCH}
✅ Mapped {/api/v1/notes/:id, DELETE}

# 构建测试
pnpm -F @phd/backend build  → ✅ 零错误
pnpm -F @phd/frontend build → ✅ 零错误
```

---

## 四、Phase 1 完成总结

### 4.1 五大核心模块全部交付

| 模块 | 后端 API | 前端功能 | 种子数据 |
|:---|:---|:---|:---|
| **任务看板** | 5 个 REST 路由 | 三列拖拽看板 + 乐观更新 + 创建弹窗 | 10 条任务 |
| **日程管理** | 5 个 REST 路由 | FullCalendar 月/周/日 + 拖拽调整 + 编辑弹窗 | 6 条日程 |
| **番茄钟** | 6 个 REST 路由 | 计时器 + 白噪声 + Canvas 热力图 + 统计卡片 | 234 条记录 |
| **认证系统** | 3 个 REST 路由 | 登录/注册页面 + Token 持久化 + API 拦截器 | 1 个演示用户 |
| **AI 助手** | 1 个 SSE 路由 | 聊天面板 + 流式消息 + 工具调用指示器 | — |

### 4.2 工程基础设施

| 组件 | 状态 |
|:---|:---|
| Monorepo（pnpm workspace） | ✅ |
| Docker Compose（PostgreSQL + Redis） | ✅ |
| Prisma ORM + 迁移 | ✅ |
| NestJS 全局异常过滤器 | ✅ |
| Swagger/OpenAPI 文档 | ✅ |
| 共享类型包（前后端共用） | ✅ |
| 液态玻璃 UI 设计系统 | ✅ |
| JWT 认证 + API 守卫 | ✅ |
| SSE 流式通信 | ✅ |

### 4.3 已知问题与技术债务

| 问题 | 影响 | 解决计划 |
|:---|:---|:---|
| Prisma 自引用关系类型推断 | 需 `as any` 绕过 | 锁定 Prisma 6.6.0，Phase 2 评估升级 |
| ~~前端 chunk > 500KB~~ | ~~构建警告~~ | ~~Phase 2 用 `React.lazy` 代码分割~~ ✅ **已解决**：路由级 `React.lazy` + `manualChunks` 拆 vendor，首屏 JS 从 191KB 降至 ~91KB gzip |
| 默认用户硬编码 | 所有数据关联 demo@phd-os.local | Phase 2 完善用户系统后移除 |
| OpenClaw 未通过 Docker 集成 | 镜像不存在于公开仓库 | ✅ **已解决**：AI 层改为直连 LLM（Kimi Coding），不再依赖 OpenClaw Gateway |

### 4.4 Phase 2 规划

| 优先级 | 模块 | 核心工作 |
|:---|:---|:---|
| 高 | **笔记系统** | ✅ 已完成：TipTap 编辑器、CRUD、搜索、标签、文件夹树形 UI、AI 工具集成、UI 打磨 |
| 高 | **文献管理** | ✅ 已完成：PDF 上传与解析、文献库列表/筛选/搜索、阅读器（PDF.js + 批注）、文件夹树、AI 工具集成、语义检索骨架 |
| 中 | **工程优化** | 单元测试、E2E 测试、CI/CD、PWA 支持 |
| 中 | **数据同步** | Yjs CRDT 多设备同步、Electric SQL 实时同步 |
| 低 | **桌面端** | Tauri 2.x 打包、本地文件系统访问、离线模式 |

---

## 五、技术债务与已知问题

| 问题 | 影响 | 解决计划 |
|:---|:---|:---|
| `prisma.config.ts` 新配置格式 | Prisma 7+ 将废弃 schema 中的 `url` | 当前锁定 Prisma 6.6.0，Phase 2 评估升级 |
| `@dnd-kit/core` 实际最新版为 6.x | 架构文档写 7.0+，实际不存在 | 已修正为 `^6.3.0`，后续跟进官方发布 |
| 宿主机 PostgreSQL 14 占用 5432 | 需要记住开发端口是 5433 | 已在文档和 `.env` 中明确标注 |
| 端口 3000 残留进程 | 后端异常退出后可能残留 | `kill $(lsof -t -i:3000)` 即可恢复 |
| `create_task` AI 工具未注册 | LLM 无法通过工具调用创建任务 | ✅ 已修复：补全 `PHD_OS_TOOLS` 定义 |
| 前端 TS 编译错误 | `ReferenceReader`/`PdfViewer`/`TaskPage`/`useReferences` 有类型/未使用错误 | ✅ 已修复：`tsc -b && vite build` 全量通过 |

---

## 六、里程碑检查清单

### Phase 2 验收标准（进行中）

- [x] 笔记模块数据库迁移成功，pgvector 扩展已启用
- [x] 后端 Note CRUD API 可调用，Swagger 文档更新
- [x] 前端 `/notes` 页面可访问，TipTap 编辑器正常工作
- [x] 笔记支持创建/编辑/删除/搜索
- [x] AI 助手可查询笔记（search_notes / get_notes / get_note_detail）
- [x] 文件夹树形管理 UI
- [x] 文献管理模块数据库迁移（Reference / ReferenceFolder / ReferenceNote）
- [x] 文献后端 REST API（CRUD + 上传 + 列表 + 搜索 + 状态更新 + 文件夹）
- [x] 前端 `/references` 文献库页面（列表/筛选/搜索/上传/详情弹窗 + 文件夹树）
- [x] PDF.js 阅读器 + 高亮批注系统
- [x] AI 文献工具集成（get_references / search_references / get_reference_detail / create_reference）
- [x] 语义检索 API（骨架，fallback 到全文搜索）
- [x] RAG 语义检索（pgvector embedding，已接入豆包 Ark Embedding API）
- [x] 文献 ↔ 任务/笔记联动（Task↔Reference、Note↔Reference）
- [x] DOI 导入 + 引用导出（CrossRef API + 5 种引用格式）
- [ ] Pomodoro ↔ 任务/文献联动（Schema 就绪，API/前端未接入）

---

## 七、历史版本记录

| 日期 | 更新内容 |
|:---|:---|
| 2026-04-22 | 初始版本：Phase 1 三大模块（任务/日程/番茄钟）完成 |
| 2026-04-23 | 更新：补充认证系统与 AI 助手模块，修正 Phase 1 完成状态，调整 Phase 2 规划 |
| 2026-04-24 | Phase 2 笔记系统完成：TipTap 编辑器、CRUD、搜索、标签、文件夹树、AI 工具集成、UI 打磨（收起/ConfirmDialog/卡片精简） |
| 2026-04-23 | Phase 2 文献管理模块完成：数据库 Schema（Reference/ReferenceFolder/ReferenceNote）、后端 18 个 REST API、前端文献库（列表/筛选/搜索/上传/文件夹树）、PDF.js 阅读器（翻页/缩放/文本选择/高亮批注）、AI 工具（get_references/search_references/get_reference_detail/create_reference）、语义检索骨架、删除手动录入功能 |
| 2026-04-23 | 跨模块联动 Phase 1/2：Task↔Reference（任务卡片显示文献标题、任务弹窗可选文献、文献详情可创建精读任务）、Note↔Reference（笔记编辑器可选关联文献、文献详情可写读书笔记） |
| 2026-04-23 | RAG 语义检索完成：EmbeddingService（豆包 Ark API）、notes/references 的 `vector(1024)` 字段、`semanticSearch` API、AI 工具 `search_notes`/`search_references` 支持 `semantic` 标志 |
| 2026-04-23 | DOI 导入 + 引用导出完成：`DoiImporterService`（CrossRef API）、`CitationService`（5 种格式：bibtex/gb7714/apa/mla/chicago）、前端 DOI 导入弹窗、文献详情页引用复制按钮、AI 工具 `import_reference_by_doi` |
| 2026-04-23 | 编译错误修复：`create_task` AI 工具补注册到 `PHD_OS_TOOLS`、前端 `ReferenceReader.tsx`/`PdfViewer.tsx`/`TaskPage.tsx`/`useReferences.ts` TypeScript 错误清零、前后端 `pnpm run build` 全量通过 |
