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

### 兼容性说明

- **数据库连接**：为兼容本地已运行的 `phd-postgres` 容器，`.env` 与 `docker-compose.yml` 中的数据库用户名、密码、库名保持原值，未随品牌名变更。
- **pnpm workspace**：lockfile 已同步更新包名引用，执行 `pnpm install` 即可正常解析。
