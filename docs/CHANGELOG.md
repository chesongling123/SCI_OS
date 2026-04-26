# 变更日志

## 2026-04-26 — 品牌重命名：PhD → ResearchOS / 科研生活助手

### 变更背景

项目定位从"面向博士研究者的个人科研工作台"扩展为"面向广大科研工作者的科研生活助手"，不再局限于博士群体。为此对全栈代码、文档及配置文件进行了全面的品牌重命名。

### 主要变更

#### 1. 品牌与产品名称

| 原名称 | 新名称 | 影响范围 |
|:---|:---|:---|
| `PhD_OS` | `ResearchOS` | 文档、代码注释、Swagger 标题 |
| `PhD Workstation` | `科研生活助手` | UI 界面（登录页、布局导航、HTML 标题） |
| `PhD_AI` | `科研助手` | AI 聊天面板、系统提示词 |

#### 2. Monorepo 包名

| 原包名 | 新包名 |
|:---|:---|
| `@phd/shared-types` | `@research/shared-types` |
| `@phd/backend` | `@research/backend` |
| `@phd/frontend` | `@research/frontend` |
| `@phd/mcp-calendar` | `@research/mcp-calendar` |
| `@phd/mcp-pomodoro` | `@research/mcp-pomodoro` |
| `@phd/mcp-task` | `@research/mcp-task` |

- 同步更新了 `tsconfig.json` paths、`pnpm-lock.yaml`、CI Workflow 中的 filter 引用
- 全栈构建验证通过：`shared-types` → `backend` → `frontend` 零错误

#### 3. 技术标识符

- `phd-auth` / `phd-theme` / `phd-ai` → `research-auth` / `research-theme` / `research-ai`
- `phd-os-dev-secret` → `research-os-dev-secret`
- `phd-os.local` → `research-os.local`
- `PHD_USER_ID` → `RESEARCH_USER_ID`
- `PHD_OS_TOOLS` → `RESEARCH_OS_TOOLS`
- `phd:note-changed` → `research:note-changed`

#### 4. 文档与文案

- 所有 `.md` 文档中的"博士"→"科研"、"博士生"→"科研工作者"、"博士研究者"→"科研工作者"
- `README.md`、`AGENTS.md`、`docs/` 全量更新
- 文件重命名：
  - `phd-home-demo.html` → `research-home-demo.html`
  - `phd_workstation_architecture.md` → `research_workstation_architecture.md`

#### 5. 其他代码与配置

- `apps/backend/prisma/schema.prisma`、`seed.ts` 注释与数据更新
- `apps/backend/src/main.ts` Swagger 文档标题与描述
- `apps/backend/src/shared/doi-importer.service.ts` User-Agent
- `packages/mcp-servers/*` MCP Server 名称与控制台输出
- Docker Compose 容器名、数据库配置（**为兼容现有开发环境，数据库用户名/密码/库名保持原值 `phd`/`phd_dev`/`phd_os`**）

## 2026-04-26 — 设置页面 + CI 单测修复

### 新增功能

#### 1. 设置页面（SettingsModule）

前后端完整实现用户偏好设置系统，支持 8 大分类、30+ 配置项：

| 分类 | 设置项 |
|:---|:---|
| **外观** | 主题模式（浅色/深色/跟随系统）、液态玻璃强度、字体大小 |
| **AI 助手** | LLM 提供商/模型、Temperature、Max Tokens、系统提示词、Function Calling、流式输出、RAG 阈值/文档数 |
| **番茄钟** | 专注/短休息/长休息时长、自动开始休息/专注、每日目标 |
| **日程** | 周起始日、默认视图、默认提醒时间 |
| **文献** | 默认引用格式（GB/T 7714 / APA / MLA / Chicago / BibTeX） |
| **通知** | 桌面通知、番茄钟提示音、日程提醒 |
| **数据** | 自动备份、备份频率、数据导出/清除缓存（预留） |
| **关于** | 版本号、构建时间、GitHub 链接、Issue 反馈 |

**后端实现**：
- 数据库：`UserSettings` 模型（`prisma/schema.prisma`），与用户一对一关联
- API：`GET /api/v1/settings`（获取/自动创建默认设置）、`PATCH /api/v1/settings`（更新）
- DTO：`UpdateSettingsDto` 含 class-validator 校验

**前端实现**：
- 页面：`/settings` 路由，左侧玻璃导航栏 + 右侧设置面板
- Store：`useSettingsStore`（Zustand + persist），支持字段级本地更新与批量保存
- 主题联动：`theme.ts` 升级支持 `light/dark/system` 三种模式 + 系统主题自动监听

#### 2. CI 与单测修复

| 修复项 | 说明 |
|:---|:---|
| 前端包名错误 | `@researchos/shared-types` → `@research/shared-types`（2 处） |
| `import.meta.env` 类型缺失 | 新建 `src/vite-env.d.ts` 声明 |
| 未使用变量 | `theme.ts` / `settings.ts` 中移除未使用的 `get` |
| `updateField` 类型签名 | 放宽为 `(key, value: unknown)` 适配 `strict: true` |
| 后端 Settings 测试 | 新增 `settings.service.spec.ts`（6 例）+ `settings.controller.spec.ts`（2 例） |
| 前端 Settings 测试 | 新增 `settings.spec.ts`（5 例） |

**验证结果**：
- 后端：3 suites / 16 tests 全部通过
- 前端：2 suites / 8 tests 全部通过
- 前后端 `pnpm run build` 零错误

### 兼容性说明

- **数据库连接**：为兼容本地已运行的 `phd-postgres` 容器，`.env` 与 `docker-compose.yml` 中的数据库用户名、密码、库名保持原值，未随品牌名变更。
- **pnpm workspace**：lockfile 已同步更新包名引用，执行 `pnpm install` 即可正常解析。
