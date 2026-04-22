# 可扩展性与可升级性设计备忘

> **文档类型**: 设计决策备忘  
> **核心关注点**: 前端架构的可扩展性、后端架构的可升级性  
> **创建日期**: 2026-04-21  
> **关联文档**: `docs/architecture/02-frontend.md`、`docs/architecture/03-backend.md`

---

## 1. 前端可扩展性设计

### 1.1 五层分层架构（模块替换不波及全局）

前端采用严格的五层结构，各层之间通过**明确定义的接口**通信，任何一层内的组件替换或升级均不得破坏其他层的稳定性：

| 层级 | 职责 | 可替换示例 |
|:---|:---|:---|
| 运行时层 | 跨平台执行环境 | React 19 → 未来版本；Vite 6 → 下一代构建工具 |
| UI 层 | 基础视觉组件与样式系统 | shadcn/ui 组件可完全自定义，不受上游版本锁定 |
| 功能组件层 | 六大核心业务模块 | FullCalendar ↔ Schedule-X；TipTap ↔ Lexical；PDF.js ↔ 其他渲染器 |
| 状态管理层 | 客户端/服务端状态隔离 | Zustand 可替换为 Redux Toolkit；TanStack Query 保持独立 |
| 数据持久化层 | 离线存储与同步 | IndexedDB ↔ SQLite WASM + OPFS |

**设计原则**: 功能组件层中的每个模块（日历、看板、笔记、番茄钟、文献、AI 助手）必须是**自包含的**，拥有独立的目录、独立的状态切片和独立的 API 调用层。新增第七个功能模块时，不应修改任何已有模块的代码。

### 1.2 UI 层：零供应商锁定（shadcn/ui）

shadcn/ui 的组件源代码**直接复制到项目仓库**，开发者拥有 100% 代码所有权。这意味着：

- 上游组件库发布 Breaking Change 时，本项目不受影响。
- 可根据科研场景的视觉语言（液态玻璃）任意修改组件内部实现。
- 无障碍性（a11y）由 Radix UI 底层保证，但表现层完全可控。

**升级策略**: 当 shadcn/ui 发布新版本时，可选择性地通过 `npx shadcn add <component>` 合并更新，而非强制全量升级。

### 1.3 功能组件层：每个模块预留替代方案

| 当前选型 | 备选方案 | 迁移触发条件 |
|:---|:---|:---|
| FullCalendar 6 | Schedule-X | Schedule-X 社区规模达到临界 mass，或 FullCalendar 停止维护 |
| TipTap 2.x | Lexical | 包体积要求更严格（Lexical 核心 ~25KB vs TipTap ~80KB+） |
| @dnd-kit/core | react-beautiful-dnd 的下一个继任者 | @dnd-kit 停止维护或出现更好的无障碍方案 |
| ECharts | D3.js / Victory | 需要更细粒度的自定义图表控制 |

**关键决策**: 所有功能组件的封装必须隐藏底层库的具体 API。例如，日历模块对外暴露 `<CalendarView events={...} onEventDrop={...} />`，内部使用 FullCalendar，但外部调用方不感知 FullCalendar 的存在。未来替换底层库时，只需修改封装层。

### 1.4 状态管理：客户端与服务端状态严格分离

```
Zustand（客户端状态）
├── 主题设置（浅色/深色）
├── 侧边栏展开状态
├── 番茄钟运行状态（本地计时器）
└── 全局 UI 状态（模态框、Toast）

TanStack Query（服务端状态）
├── 日历事件列表
├── 看板卡片数据
├── 笔记列表与内容
├── 文献元数据
└── AI 对话历史
```

**扩展性收益**: 新增模块时，只需在该模块目录内创建独立的 Zustand Store 切片和 TanStack Query Key 空间，不会与已有状态产生命名冲突或数据竞争。

### 1.5 跨平台：PWA + Tauri 双轨并行

前端业务逻辑全部以 TypeScript 编写，平台差异通过**条件编译/运行时检测**隔离：

- **PWA 路径**: Service Worker（Workbox）+ IndexedDB → 覆盖浏览器端
- **Tauri 路径**: Rust 层仅负责窗口管理和系统 API 桥接 → 覆盖桌面端（Windows/macOS/Linux）及移动端（iOS/Android）

**升级策略**: Tauri 2.x 的移动端支持目前处于迭代期，前端代码应尽量避免调用 Tauri 专属的 API。必须通过 `@tauri-apps/api` 调用的功能，需封装为 `src/platform/tauri.ts`，并提供浏览器端的空实现 `src/platform/web.ts`，通过构建时别名切换。

---

## 2. 后端可升级性设计

### 2.1 NestJS 模块化架构：单体优先，边界清晰

后端采用**单体优先（Monolith-first）**的模块化架构，每个功能域以 NestJS Module 为单位组织：

```
src/
├── modules/
│   ├── auth/           # AuthModule —— 认证授权
│   ├── calendar/       # CalendarModule —— 日程管理
│   ├── task/           # TaskModule —— 待办任务
│   ├── note/           # NoteModule —— 笔记系统
│   ├── pomodoro/       # PomodoroModule —— 番茄钟
│   ├── file/           # FileModule —— 文件处理
│   └── ai/             # AiModule —— OpenClaw 集成
├── shared/             # SharedModule —— 通用能力（Prisma、Redis、OpenClawClient）
└── main.ts
```

**升级性收益**:
- 每个 Module 拥有独立的 Controller、Service、Entity/DTO 和单元测试，可独立演进。
- 当某个模块成为性能瓶颈时，可按照预设边界**无损拆分为微服务**。
- 新增功能域时，只需复制模块模板并注册到 `AppModule`，不触碰已有代码。

### 2.2 HTTP 引擎可切换：Express ↔ Fastify

NestJS 支持在 Express 与 Fastify 两个底层 HTTP 引擎间切换。当前默认使用 Express（生态最成熟），当性能成为瓶颈时可**无感迁移**到 Fastify 适配器：

```typescript
// 当前（Express）
const app = await NestFactory.create(AppModule);

// 未来升级（Fastify）
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
```

**约束**: 所有 Controller 必须仅使用 NestJS 标准装饰器（`@Get()`、`@Post()`、`@Body()` 等），禁止直接操作 Express 的 `req/res` 对象，以确保引擎切换时业务代码零改动。

### 2.3 API 版本控制：为不兼容升级预留迁移窗口

所有 RESTful API 通过 URL 前缀 `/api/v1/` 进行版本控制。未来发布 v2 时：

- v1 端点保持至少 6 个月的兼容期。
- 前端和第三方集成方有明确的迁移窗口。
- 版本号由全局路由前缀控制，Controller 内部不硬编码版本。

```typescript
// app.module.ts
app.setGlobalPrefix('api/v1');

// 未来升级到 v2 时，只需修改前缀并并行部署两套路由
```

### 2.4 OpenClaw 黑盒集成：AI 层完全解耦

OpenClaw Gateway 作为**独立进程**运行，通过 WebSocket (`ws://127.0.0.1:18789`) 与本项目后端通信。核心原则：

- **不 Fork、不修改** OpenClaw 源码。
- 所有 AI 层交互通过其公开的 **WebSocket / MCP 协议**进行。
- OpenClaw 版本更新仅需执行 `npm update openclaw-node`，工作台业务逻辑不受影响。
- NestJS 后端通过 `openclaw-node` 客户端库封装连接，将 Gateway 的流式响应转换为前端可消费的 SSE/WebSocket 消息。

**升级性收益**: OpenClaw 从 2025 年 11 月到 2026 年 4 月已历经三次更名和数十个版本迭代。黑盒集成模式使工作台无需承担维护一个 361k stars 项目 Fork 的沉重负担。

### 2.5 任务队列解耦：BullMQ 异步化耗时操作

以下操作**禁止**在 HTTP 请求-响应周期内同步执行，必须通过 BullMQ 队列异步处理：

| 队列名称 | 职责 | 优先级 |
|:---|:---|:---|
| `reminder` | 日程提醒的精确调度 | 高 |
| `sync` | 外部日历增量同步 | 中 |
| `ai-index` | 笔记和文献的向量索引更新 | 中 |
| `backup` | 定期数据快照 | 低 |
| `pdf-parse` | 批量 PDF 解析和文本提取 | 低 |

**扩展性收益**:
- 新增后台作业类型时，只需创建新的 Queue + Processor，不修改已有队列。
- 队列消费者可独立水平扩展（增加 Worker 进程数）。
- 若未来从 BullMQ 迁移到其他队列系统（如 RabbitMQ / Apache Kafka），只需替换 `@nestjs/bullmq` 的封装层。

### 2.6 全栈类型共享：DTO 单点定义

前后端与 OpenClaw 客户端共享同一套 TypeScript 类型系统，DTO 和接口类型在 monorepo 的 `packages/shared-types` 中**单点定义**：

```
packages/
├── shared-types/       # 前后端 + OpenClaw Client 共享
│   ├── dto/
│   ├── enums/
│   └── interfaces/
├── frontend/           # React + Vite
└── backend/            # NestJS
```

**升级性收益**:
- 修改字段类型时，TypeScript 编译器自动检测前后端所有引用点，消除类型漂移导致的运行时错误。
- 新增 API 接口时，前端立即获得类型提示，无需手动同步接口文档。

### 2.7 数据库抽象：Prisma ORM + 闭包表模型

数据访问通过 Prisma ORM 抽象，禁止在业务代码中直接编写 SQL。复杂查询场景（如任务树的闭包表模型）通过 Prisma 的 `$queryRaw` 或 Prisma Client Extensions 封装，确保：

- 底层数据库从 SQLite 迁移到 PostgreSQL 时，业务代码无需修改。
- 数据库版本升级（如 PostgreSQL 15 → 16）仅影响 ORM 连接配置。

---

## 3. 升级风险与缓解策略

| 风险领域 | 具体风险 | 缓解策略 |
|:---|:---|:---|
| React 大版本升级 | React 19 → 20 引入 Breaking Change | 严格遵循 React 官方升级指南；利用 TypeScript 类型检查捕获废弃 API |
| Tauri 移动端不成熟 | Tauri 2.x iOS/Android 支持仍在迭代 | 前端避免调用 Tauri 专属 API；平台能力封装为可切换的抽象层 |
| OpenClaw 协议变更 | WebSocket/MCP 协议在快速演进中 | 封装 OpenClaw Client 适配器；协议变更时仅修改适配器层 |
| NestJS 微服务拆分 | 单体拆分微服务时引入分布式复杂度 | 单体阶段即保持 Module 边界清晰；共享状态仅通过 SharedModule 暴露 |
| shadcn/ui 上游更新 | 新组件或样式系统变化 | 选择性合并更新；核心组件已内嵌到项目仓库，不受上游强制影响 |
| 数据库迁移 | SQLite → PostgreSQL 或版本升级 | 全量使用 Prisma ORM；迁移脚本由 `prisma migrate` 自动生成 |

---

## 4. 新增模块 checklist

当未来需要新增功能模块（如实验记录、经费管理、合作者网络）时，遵循以下 checklist 确保可扩展性：

- [ ] 在 `src/modules/` 下创建独立目录，目录内包含 `*.module.ts`、`*.controller.ts`、`*.service.ts`、`*.dto.ts`、`*.spec.ts`
- [ ] 在 `packages/shared-types/` 中定义该模块的 DTO 和接口类型
- [ ] 前端在 `src/modules/` 下创建对应视图目录，包含独立的 Zustand Store 和 TanStack Query hooks
- [ ] 若需要后台异步处理，在 BullMQ 中注册新的队列和处理器
- [ ] 若需要 AI 助手访问该模块数据，通过 MCP Server 暴露工具接口
- [ ] 更新 Swagger 文档（`@nestjs/swagger` 装饰器自动生成）
- [ ] 确保新模块不引入对已有模块的循环依赖

---

## 5. 关键引用（来自架构文档）

> "各层之间通过明确定义的接口通信，模块替换和升级可在不破坏整体架构的前提下独立完成。"  
> —— `docs/architecture/02-frontend.md` §2.3.3

> "这种设计保留了后续微服务拆分的清晰边界，同时避免了分布式系统带来的运维复杂度。"  
> —— `docs/architecture/03-backend.md` §3.3

> "双通道架构实现了 AI 层与工作台层的完全解耦：OpenClaw 的版本更新仅需 `npm update`，不影响工作台业务逻辑。"  
> —— `docs/architecture/03-backend.md` §3.2.2
