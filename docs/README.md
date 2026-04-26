# ResearchOS 项目文档

AI 驱动的科研工作台 —— 开发文档存档

## 文档目录

| 目录 | 内容 |
|------|------|
| `architecture/` | 系统架构设计文档（已拆分为10个章节） |
| `design/` | UI/UX 设计规范与前端设计指南 |
| `api/` | RESTful API 接口文档 |
| `database/` | 数据库设计与数据模型 |
| `deployment/` | 部署配置、CI/CD 工作流（Docker Compose、GitHub Actions 等） |
| `ai-integration/` | OpenClaw 集成与 AI 服务层文档 |

## 核心文档

### 架构设计（按章节拆分）

| 章节 | 文件 | 内容 |
|------|------|------|
| 01 | [architecture/01-overview.md](architecture/01-overview.md) | 项目概述与核心目标 |
| 02 | [architecture/02-frontend.md](architecture/02-frontend.md) | 前端架构设计 |
| 03 | [architecture/03-backend.md](architecture/03-backend.md) | 后端架构设计 |
| 04 | [architecture/04-database.md](architecture/04-database.md) | 数据库与数据模型设计 |
| 05 | [architecture/05-ai-service.md](architecture/05-ai-service.md) | AI 服务层架构 |
| 06 | [architecture/06-sync-messaging.md](architecture/06-sync-messaging.md) | 多设备同步与消息桥接 |
| 07 | [architecture/07-deployment.md](architecture/07-deployment.md) | 部署与运维方案 |
| 08 | [architecture/08-security.md](architecture/08-security.md) | 安全与隐私设计 |
| 09 | [architecture/09-repositories.md](architecture/09-repositories.md) | 核心开源仓库汇总 |
| 10 | [architecture/10-roadmap.md](architecture/10-roadmap.md) | 实施路线图与风险分析 |
| 完整版 | [architecture/research_workstation_architecture.md](architecture/research_workstation_architecture.md) | 未拆分的原始文档（备份） |

### 前端 Demo

- **首页 Demo** → [../research-home-demo.html](../research-home-demo.html)（位于项目根目录，液态玻璃风格）

## 项目信息

| 属性 | 值 |
|------|-----|
| **名称** | 科研生活助手 |
| **定位** | 本地优先、AI 原生的个人科研工作台 |
| **技术栈** | React 19 + Vite 6 + NestJS 11 + Prisma + PostgreSQL + Redis |
| **创建日期** | 2026-04-20 |
| **状态** | ✅ Phase 1 MVP + Phase 2 扩展已完成（8 大模块 + 测试/CI/CD） |

---
*最后更新: 2026-04-23*
