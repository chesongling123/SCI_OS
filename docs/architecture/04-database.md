# AI 驱动的科研工作台：完整技术架构方案

> **文档类型**: 技术架构设计文档  
> **目标读者**: 科研工作者、独立开发者、开源贡献者  
> **核心项目**: OpenClaw 开源 AI 助手二次开发  
> **调研范围**: 前端、后端、数据库、AI 服务层、消息桥接、部署运维、安全隐私  
> **调研深度**: 12 个技术维度 × 300+ 独立搜索 × 30+ 开源项目  
> **生成日期**: 2026-04-20

---

# 1. 项目概述与核心目标
---


科研工作台的数据层需要同时支撑结构化事务数据（日程、待办）、非结构化内容（笔记、AI对话）以及向量检索（RAG语义搜索），并满足本地优先与多设备同步的约束。本章围绕这三个核心问题展开：存储引擎选型、数据模型设计、以及跨设备同步策略。

### 4.1 数据库选型

#### 4.1.1 云端：PostgreSQL 15+ + pgvector 扩展

PostgreSQL 作为功能最完备的开源关系型数据库，具备完整的 ACID 事务支持、丰富的数据类型（数组、JSONB、范围类型）以及灵活的索引体系（GiST、GIN、BRIN）[^1^]。对于科研工作台而言，选择 PostgreSQL 作为云端主数据库的核心考量在于其扩展生态：通过 pgvector 插件可在同一数据库实例内完成关系查询与向量相似度搜索，避免了拆分数据到独立向量数据库带来的事务一致性和网络延迟问题。

pgvector 在 200 万向量 HNSW（Hierarchical Navigable Small World）索引下的平均查询延迟为 8ms，p95 低于 15ms[^7^]；在 500 万向量以下规模时，pgvector 是性价比最高的选择，因为"它与既有 PostgreSQL 基础设施零额外成本集成"[^6^]。科研工作台的文献向量规模通常低于 100 万篇，完全处于 pgvector 的高效区间内。更关键的是，pgvector 支持将向量搜索嵌入标准 SQL 事务，这意味着文献元数据查询与语义检索可以在同一个 `BEGIN...COMMIT` 块中完成，确保数据和索引的严格一致[^34^]。

PostgreSQL 的 JSONB 数据类型也承担了半结构化数据的存储职责。笔记内容的块级结构（Block-based storage，参考 Notion 的架构设计[^14^]）、AI 对话的工具调用记录等非严格结构化数据，均可通过 JSONB 列存储并建立 GIN 索引，无需引入 MongoDB 等文档数据库增加系统复杂度[^5^]。

#### 4.1.2 本地：SQLite（WAL 模式）

SQLite 的零配置、单文件存储特性使其成为本地优先（Local-First）架构的天然选择[^3^]。科研工作台面向科研工作者，其使用场景频繁涉及无网络环境（实验室离线设备、野外调研、飞机上），本地数据必须是"真相源"（Source of Truth），云端仅作为可选的同步通道[^23^]。SQLite 的单文件模式还有一个实践优势：用户可以通过复制 `.db` 文件在数秒内完成完整数据备份或迁移。

在性能层面，启用 WAL（Write-Ahead Logging）模式后，SQLite 在现代 NVMe 硬件上可处理 100,000+ QPS 的读和 10,000+ QPS 的写[^4^]，远超单个科研工作台的并发需求。WAL 模式的核心机制是将写操作追加到独立的 WAL 文件中而非直接修改数据库页，这使得读操作不会被写操作阻塞，实现了并发读写能力。需要注意的是，SQLite 不适合高并发写入场景（如多用户同时提交），但在单用户桌面应用中这一限制不构成约束。

#### 4.1.3 缓存：Redis

Redis 承担三类职责：用户会话存储（替代有状态服务器，支持水平扩展）、BullMQ 任务队列的底层存储（定时提醒、异步 AI 任务）、以及热点数据的二级缓存（文献元数据、用户配置）。由于 NestJS 生态通过 `@nestjs/bullmq` 包提供了 Redis 的原生集成，选择 Redis 作为缓存层可以保持技术栈的统一性。

#### 4.1.4 ORM 选型

在 TypeScript 生态中，Prisma 和 Drizzle ORM 是当前最具竞争力的两个选项，交叉验证报告显示两者在不同维度各有优势：Prisma 以 Schema-first 设计、完善的迁移工具（Prisma Migrate[^20^]）和强大的类型安全著称，与 NestJS 生态深度集成；Drizzle 则以 ~7.4KB 的极小体积[^21^]、类 SQL 的透明查询语法和优异的复杂 JOIN 性能见长，在复杂关联场景下可比传统 ORM 快 14 倍[^22^]。科研工作台的最终选型需结合具体技术栈偏好。下表给出结构化对比：

| 维度 | Prisma | Drizzle ORM | TypeORM |
|------|--------|-------------|---------|
| Schema 定义方式 | `.prisma` DSL（Schema-first） | TypeScript 代码（Code-first） | Decorator（Code-first） |
| Bundle 体积 | ~1.6MB（Prisma 7+，纯 TS）[^19^] | ~7.4KB min+gz[^21^] | ~200KB+ |
| 复杂 JOIN 性能 | 中等（需优化 N+1） | 高（透明 SQL，14x 提升）[^22^] | 低（N+1 问题突出） |
| 迁移工具 | Prisma Migrate（官方）[^20^] | drizzle-kit（官方）[^27^] | 内置迁移 |
| NestJS 集成 | 官方 `@nestjs/prisma` | 社区驱动 | `@nestjs/typeorm` |
| SQLite + PostgreSQL 双支持 | 支持 | 支持（含 Turso/D1） | 支持 |
| 活跃维护度 | 高（Prisma 7 已发布） | 高（2025-2026 增长最快） | 中（维护放缓） |

对于科研工作台，若团队优先开发效率和 NestJS 生态兼容性，Prisma 是稳妥选择；若对 SQL 可控性和运行时体积有严格要求，则 Drizzle ORM 更合适。两种方案均支持 SQLite/PostgreSQL 双数据库目标，满足本地-云端混合架构的需求。

下表汇总数据层的技术选型矩阵：

| 组件 | 推荐方案 | 备选方案 | 选型理由 |
|------|---------|---------|---------|
| 云端数据库 | PostgreSQL 15+ | MySQL 8+ | JSONB + 扩展生态，pgvector 向量搜索一体化[^1^] |
| 本地数据库 | SQLite（WAL 模式） | IndexedDB（浏览器端） | 零配置、单文件、100K+ QPS[^3^][^4^] |
| 向量搜索 | pgvector（PostgreSQL 扩展） | Pinecone（托管） | <500万向量零额外成本，SQL 内事务[^6^] |
| 缓存/队列 | Redis 7+ | KeyDB | NestJS/BullMQ 原生集成 |
| ORM（TS 后端） | Prisma / Drizzle ORM | TypeORM | 视开发效率 vs 性能偏好选择 |
| ORM（Python AI） | SQLAlchemy + Alembic | Peewee | Python 生态最成熟方案 |

### 4.2 核心数据模型

科研工作台的数据模型围绕六个核心业务域展开：用户账户、日程管理、任务追踪、笔记系统、文献管理和 AI 对话。每个模型均遵循统一的设计原则：使用 CUID 作为主键（支持分布式生成）、所有时间戳以 UTC 存储、软删除优先于级联删除、以及 JSONB/JSON 列存储可变结构。

下表给出核心业务表的 Schema 概览：

| 业务域 | 核心表 | 关键字段 | 关联表 | 存储模式 |
|--------|--------|---------|--------|---------|
| 用户 | `users` | email, passwordHash, oauthProvider, avatarUrl | `user_settings`, `external_bindings` | 关系型 |
| 日程 | `events`, `recurrence_rules`, `reminders` | title, start_at, end_at, rrule, timezone | `event_attendees` | 关系型 |
| 任务 | `tasks`, `tags`, `task_tags` | title, status, priority, due_date, parent_id | `task_dependencies` | 关系型 |
| 笔记 | `notes`, `note_versions`, `note_links` | title, content(markdown), blocks(jsonb), mood | `note_tags` | 关系型 + JSONB |
| 文献 | `references`, `pdf_attachments`, `annotations` | item_type, doi, authors(json), embedding(vector) | `reference_collections`, `reference_tags` | 关系型 + 向量 |
| AI 对话 | `ai_conversations`, `ai_messages` | model, system_prompt, role, content, tool_calls(json) | `tool_call_records` | 关系型 + JSONB |

#### 4.2.1 用户模型

用户表（`users`）采用双轨认证设计：本地邮箱/密码认证与 OAuth 外部认证并行。`passwordHash` 和 `oauthProvider/oauthId` 互斥存在，确保至少一种认证方式有效。外部服务绑定通过独立的 `external_bindings` 表管理，支持 Zotero API Key、Google Calendar OAuth Token、飞书 User ID 等多平台关联。用户偏好配置存储在 `user_settings` 表中，采用键值对设计覆盖主题、语言、番茄钟默认参数、AI 模型偏好等配置项。

#### 4.2.2 日程模型

日程模块采用三表分离设计以支持复杂日历语义。`events` 表存储事件的基础字段（标题、起止时间、全天标志、时区）；`recurrence_rules` 表独立存储 iCalendar RRULE 格式的重复规则（频率、间隔、结束条件、生效星期），遵循成熟日历应用的数据库设计实践[^13^]；`reminders` 表支持多提醒配置（如提前 15 分钟和 1 小时各一次）。事件重复实例的生成采用"展开"策略：服务端根据 RRULE 在查询时动态生成虚拟实例，而非物理存储每个重复事件，这既节省存储又支持规则的即时变更。时区处理使用 IANA 时区标识符（如 `Asia/Shanghai`），所有时间以 UTC 存储，前端根据用户偏好时区渲染。

#### 4.2.3 任务模型

任务表（`tasks`）支持无限层级的子任务结构，通过 `parent_id` 自引用外键实现。`sort_order` 字段采用浮点数设计，支持任意位置的拖拽排序而无需批量更新相邻记录。任务状态机限定为四个状态：`todo` → `in_progress` → `done`（或 `cancelled`），后端通过 CHECK 约束保证状态合法性。标签系统通过 `tags` + `task_tags` 多对多关联表实现，支持用户自定义标签颜色和名称。任务与日程的关联通过在 `tasks` 表中维护可选的 `event_id` 外键实现，使得"将任务添加到日历"功能无需额外的关联表。

#### 4.2.4 笔记模型

笔记的存储采用混合方案：元数据（标题、创建时间、标签等）存入数据库，内容体以 Markdown 文件存储在本地文件系统（类似 Obsidian 的 vault 设计[^15^]），支持块级编辑的笔记则使用 JSONB 列存储块结构（Block-based storage，参考 Notion 的块模型[^14^]）。这种设计的考量在于：Markdown 文件天然支持版本控制（Git）和跨应用迁移，而块级结构适合需要富文本编辑和数据库查询的场景。`note_versions` 表记录每次编辑的快照，支持历史回溯；`note_links` 表通过 `(source_id, target_id)` 记录笔记间的双向链接，可通过递归 CTE（Common Table Expression）查询构建知识图谱视图。

#### 4.2.5 文献模型

文献数据模型参考 Zotero 的 EAV（Entity-Attribute-Value）设计哲学[^16^]。`references` 表存储所有文献类型共有的基础字段（标题、作者、年份、DOI、摘要），`item_type` 字段区分文献类型（期刊论文、书籍、学位论文、会议论文等）。作者信息以 JSON 数组存储 `[{"firstName": "", "lastName": ""}]`，这种设计避免了为不同数量的作者创建动态列，同时保持了查询可读性。向量嵌入通过 `embedding` 列（pgvector 的 `vector` 类型）存储，配合 HNSW 索引实现文献的语义相似度搜索。PDF 附件通过 `pdf_attachments` 表管理，存储文件路径或 S3 对象键以及 SHA-256 哈希值用于去重。`annotations` 表记录 PDF 阅读批注（高亮、笔记、选区坐标），支持通过 Zotero MCP Server 的语义搜索接口[^5^]将批注内容纳入 RAG 检索。

#### 4.2.6 AI 对话模型

AI 对话模块采用会话-消息两级结构。`ai_conversations` 表存储会话级元数据（标题、使用模型、系统提示词、启用的工具列表），`ai_messages` 表存储单条消息。消息角色严格限定为 `system` / `user` / `assistant` / `tool` 四类，与 OpenAI/Anthropic 的 API 规范保持一致。工具调用通过两个 JSON 字段实现：`tool_calls` 存储助手发起的工具调用请求（遵循 `{id, type, function: {name, arguments}}` 格式），`tool_result` 存储工具执行后的返回结果。这种设计与第 5 章将要介绍的 MCP（Model Context Protocol）工具调用规范直接对应，确保 AI 服务层的数据模型与协议规范同构。

### 4.3 数据同步策略

#### 4.3.1 本地优先同步：Electric SQL / sqlite-sync

本地优先架构要求数据以本地 SQLite 为真相源，云端 PostgreSQL 作为同步目标。这一架构选择根植于科研数据的敏感性——未发表的研究想法、实验数据和 AI 对话内容属于学术机密，"即使云端服务被攻破，核心科研数据也不会泄露"。

同步方案有两种候选路径。Electric SQL 是 PostgreSQL 的读取路径同步引擎，支持部分复制（只同步特定表/行）和数百万并发用户的低延迟同步[^26^]，适合读多写少、需要实时推送的场景。sqlite-sync 则提供了更简单的 CRDT（Conflict-free Replicated Data Types）自动同步，通过 `SELECT cloudsync_init('table_name')` 声明式启用表级同步[^39^]，自动处理冲突且无需手动编写同步逻辑。科研工作台的写入操作（新增笔记、修改任务状态、添加文献）以单个用户的交互为主，并发冲突概率低，两种方案均可满足需求。建议第一阶段采用 sqlite-sync 实现快速集成，若未来需要多人协作场景再迁移至 Electric SQL。

#### 4.3.2 备份策略：Litestream 流式复制 + PostgreSQL 自动备份

本地 SQLite 数据库的备份通过 Litestream 实现。Litestream 通过监控 SQLite WAL 帧，持续将增量变更流式复制到 S3 兼容存储（30 秒同步间隔），支持时间点恢复（Point-in-Time Recovery），可将恢复点目标（RPO）控制在亚秒级[^30^]。Litestream 13,000+ GitHub Stars 的社区规模和 Apache-2.0 许可证确保了其长期可用性[^4^]。灾难恢复可在 30 秒内完成，对用户而言几乎是透明的。云端 PostgreSQL 的备份依赖托管服务（Supabase/Neon/RDS）的自动备份功能，结合 WAL 归档实现连续恢复能力。两地备份策略形成互补：Litestream 保护本地数据免遭设备损坏，PostgreSQL 自动备份保护云端数据免遭服务故障。

---

## 5. AI 服务层架构
