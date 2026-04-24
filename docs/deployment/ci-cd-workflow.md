# CI/CD 工作流与代码质量门禁

> **文档类型**: 工程化运维指南  
> **最后更新**: 2026-04-23  
> **适用范围**: 所有参与 PhD_OS 开发的贡献者

---

## 一、整体架构：三层防护网

PhD_OS 采用**「本地拦截 + 云端兜底」**的双重质量保障体系，由三个工具协同构成：

| 层级 | 工具 | 作用 | 触发时机 |
|:---|:---|:---|:---|
| 第一层 | **husky** | Git 钩子管理器 | `git commit` 执行前 |
| 第二层 | **lint-staged** | 只对暂存区文件跑检查 | 被 husky 的 `pre-commit` 调用 |
| 第三层 | **GitHub Actions** | 云端 CI 流水线 | `push` 到 `main` 或提交 PR 时 |

```
你本地写代码
    ↓
git add . && git commit -m "feat: xxx"
    ↓
┌─────────────────────────────────────────┐
│  【husky pre-commit】本地第一道防线      │
│  → lint-staged 检查暂存区文件             │
│  → 后端 typecheck？ 前端 typecheck？      │
│  → ❌ 失败 → commit 被驳回，原地修复      │
│  → ✅ 通过 → commit 成功                  │
└─────────────────────────────────────────┘
    ↓
git push origin main
    ↓
┌─────────────────────────────────────────┐
│  【GitHub Actions】云端第二道防线         │
│  → 分配 Ubuntu 虚拟机                     │
│  → 后端：test + build 并行               │
│  → 前端：test + build 并行               │
│  → ❌ 失败 → PR 显示红叉，禁止合并        │
│  → ✅ 通过 → 代码正式进入 main            │
└─────────────────────────────────────────┘
```

---

## 二、GitHub Actions 云端 CI

### 2.1 配置文件

**文件位置**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: Backend Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build shared types
        run: pnpm -F @phd/shared-types build

      - name: Backend tests
        run: pnpm -F @phd/backend test

      - name: Backend build
        run: pnpm -F @phd/backend build

  frontend:
    name: Frontend Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build shared types
        run: pnpm -F @phd/shared-types build

      - name: Frontend tests
        run: pnpm -F @phd/frontend test

      - name: Frontend build
        run: pnpm -F @phd/frontend build
```

### 2.2 关键设计说明

| 设计点 | 说明 |
|:---|:---|
| **并行 Job** | `backend` 和 `frontend` 是两个独立 Job，在 GitHub Actions 中**并行执行**，总耗时 ≈ max(后端时间, 前端时间) |
| **Node 版本锁定** | 通过 `node-version-file: .nvmrc` 确保 CI 使用的 Node 版本与本地一致 |
| **pnpm 缓存** | `actions/setup-node` 的 `cache: pnpm` 自动缓存 `node_modules`，加速后续构建 |
| **先 build shared-types** | 前后端都依赖 `@phd/shared-types` 的 `dist/` 产物，必须先编译 |

### 2.3 查看执行结果

- 推送代码后，打开 GitHub 仓库 → **Actions** 标签页即可查看实时日志
- PR 页面会显示 Checks 状态：✅ 全绿表示通过，❌ 红叉表示失败

---

## 三、husky —— Git 钩子管理器

### 3.1 什么是 Git 钩子？

Git 在执行特定操作（如 `commit`、`push`）时，会在**特定时机**触发钩子脚本：

- `pre-commit`：`git commit` **真正创建提交之前**执行
- 如果脚本返回**非零退出码**，commit 会被**强制中断**

### 3.2 husky 做了什么？

husky 帮你**自动管理 `.git/hooks/` 下的脚本**，不用手动维护。

**文件位置**: `.husky/pre-commit`

```bash
pnpm lint-staged
```

当执行 `git commit` 时：
1. Git 发现 `.git/hooks/pre-commit` 存在（由 husky 自动注册）
2. 执行该脚本 → 调用 `pnpm lint-staged`
3. `lint-staged` 运行完毕且返回 0 → commit 继续
4. `lint-staged` 运行失败 → commit **被驳回**

### 3.3 自动安装机制

根 `package.json` 中的 `prepare` 脚本：

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

pnpm 在安装依赖后会**自动执行** `prepare` 脚本，husky 就会把 `.husky/` 目录下的钩子文件注册到 `.git/hooks/` 中。团队成员只需 `pnpm install` 即可自动生效。

---

## 四、lint-staged —— 只对变更文件跑检查

### 4.1 为什么要用它？

直接在整个项目跑 `tsc --noEmit` 很慢。本次 commit 可能只改了 2 个文件，没必要检查 200 个文件。

### 4.2 配置文件

lint-staged 的配置放在**根 `package.json`** 中：

```json
{
  "lint-staged": {
    "apps/backend/src/**/*.ts": "cd apps/backend && pnpm typecheck",
    "apps/frontend/src/**/*.{ts,tsx}": "cd apps/frontend && pnpm typecheck",
    "packages/shared-types/src/**/*.ts": "cd packages/shared-types && pnpm typecheck"
  }
}
```

### 4.3 执行逻辑

```
git commit 触发
    ↓
lint-staged 读取【暂存区（staged）文件列表】
    ↓
用 glob 模式匹配文件：
  - 如果你改了 backend/src/modules/task/task.service.ts
    → 匹配 "apps/backend/src/**/*.ts"
    → 进入 apps/backend 目录执行 pnpm typecheck
  
  - 如果你同时改了 frontend/src/modules/ai/AiChatPanel.tsx
    → 匹配 "apps/frontend/src/**/*.{ts,tsx}"
    → 进入 apps/frontend 目录执行 pnpm typecheck
    
  - 共享类型包的变更同理
    ↓
所有匹配的命令都成功（返回 0）→ commit 放行
任一命令失败 → commit 被驳回
```

### 4.4 当前配置只跑 typecheck 的原因

前后端的 ESLint 配置尚不完整（ESLint v9 的 flat config 迁移未完成），`tsc --noEmit` 是目前最可靠的类型安全检查手段。后续补全 ESLint 后，可以扩展为：

```json
{
  "lint-staged": {
    "apps/backend/src/**/*.ts": [
      "cd apps/backend && pnpm typecheck",
      "cd apps/backend && pnpm lint"
    ],
    "apps/frontend/src/**/*.{ts,tsx}": [
      "cd apps/frontend && pnpm typecheck",
      "cd apps/frontend && pnpm lint"
    ]
  }
}
```

---

## 五、日常开发命令速查

| 命令 | 作用 |
|:---|:---|
| `pnpm test` | 递归运行前后端所有测试 |
| `pnpm typecheck` | 递归运行前后端 TypeScript 类型检查 |
| `pnpm lint` | 递归运行前后端 ESLint（当前可能不完整） |
| `pnpm lint-staged` | 手动触发 lint-staged（模拟 commit 前检查） |
| `git commit --no-verify` | **跳过 husky 钩子**强制提交（紧急时可用，但不推荐） |

---

## 六、关键设计决策记录

| 问题 | 我们的选择 | 理由 |
|:---|:---|:---|
| 为什么 lint-staged 只跑 `typecheck`？ | 暂不引入 ESLint | 前后端 ESLint v9 配置不完整，`tsc --noEmit` 零误报 |
| 为什么后端 tsconfig 排除 `*.spec.ts`？ | `"exclude": ["**/*.spec.ts", "**/*.mock.ts"]` | Prisma 类型有循环引用，`jest-mock-extended` 会触发 TS2615 编译错误，测试文件不应参与生产构建 |
| 为什么 CI 里前后端都要先 build shared-types？ | 保证 `@phd/shared-types` 的 `dist/` 产物最新 | 前后端都依赖共享类型包，必须先编译 |
| 为什么使用 `pnpm/action-setup@v4`？ | 统一包管理器版本 | 避免 CI 环境与本地环境因 pnpm 版本差异导致行为不一致 |

---

## 七、故障排查

### 7.1 commit 时被 lint-staged 拦截

**现象**: `git commit` 后报错，commit 未完成。

**排查步骤**:
1. 查看报错信息中哪个 workspace 的 `typecheck` 失败了
2. 进入对应目录手动运行 `pnpm typecheck`，定位具体错误文件
3. 修复后重新 `git add` + `git commit`

### 7.2 GitHub Actions 显示红叉

**现象**: push 后 Actions 页面显示失败。

**排查步骤**:
1. 进入 GitHub → Actions → 找到失败的 workflow run
2. 展开失败的 Job（backend 或 frontend）
3. 查看具体步骤的日志输出
4. 常见原因：
   - `pnpm install` 失败 → 检查 lockfile 是否过期
   - `test` 失败 → 本地运行 `pnpm test` 复现
   - `build` 失败 → 本地运行 `pnpm build` 复现

### 7.3 husky 没有生效（新克隆仓库）

**现象**: `git commit` 没有触发任何检查。

**解决**: 运行 `pnpm install`，`prepare` 脚本会自动注册 husky 钩子。

---

## 八、未来扩展方向

- [ ] **补全 ESLint 配置** → lint-staged 中加入 `eslint --fix`
- [ ] **增加更多后端测试** → TaskService / NoteService / ReferenceService / AuthService
- [ ] **增加前端组件测试** → React Testing Library 覆盖关键页面交互
- [ ] **数据库集成测试** → 使用测试数据库（`TEST_DATABASE_URL`）跑真实查询
- [ ] **E2E 测试** → Playwright 覆盖核心用户流程（登录 → 创建任务 → 番茄钟）
- [ ] **部署流水线** → GitHub Actions 增加 Docker 构建与服务器部署步骤
