# ResearchOS 主动 AI 科研生活助手 —— 记忆与主动建议系统设计方案

> **文档类型**: 架构设计文档
> **版本**: v1.1
> **日期**: 2026-04-26
> **状态**: SQL 主存储方案已确认（含记忆导出视图设计）
> **关联文档**: [AI 模块开发路线图](./development-plan.md)、[项目状态追踪](../project-status.md)

---

## 目录

1. [需求分析与设计目标](#1-需求分析与设计目标)
2. [系统总体架构](#2-系统总体架构)
3. [记忆增强层设计](#3-记忆增强层设计)
4. [主动建议引擎设计](#4-主动建议引擎设计)
5. [数据模型设计](#5-数据模型设计)
6. [API 接口设计](#6-api-接口设计)
7. [前端交互设计](#7-前端交互设计)
8. [记忆透明度与导出](#8-记忆透明度与导出)
9. [安全与边界控制](#9-安全与边界控制)
10. [实施路线图](#10-实施路线图)
11. [技术风险与应对](#11-技术风险与应对)

---

## 1. 需求分析与设计目标

### 1.1 当前现状

ResearchOS Phase 1~3 已完成 9 个核心模块，AI 助手具备：
- ✅ SSE 流式对话 + Function Calling 工具循环
- ✅ 对话持久化（`AiConversation` + `AiMessage`）
- ✅ 14 个跨模块查询/写入工具
- ✅ 快捷命令（translate / polish / summarize）
- ❌ **AI 主动建议**（Phase 3 唯一剩余项）

### 1.2 核心问题

当前 AI 是**完全被动响应式**：用户提问 → AI 查询工具 → 返回答案。用户不提问，AI 就"沉默"。

真正的科研生活助手应当：
- 在用户**忘记做某事**时主动提醒（如截止日期临近、番茄钟目标未达标）
- 在用户**陷入低效**时主动介入（如连续中断过多、长时间未休息）
- 在用户**有潜在需求**时主动建议（如今日有空档可安排阅读、某篇文献与最近笔记主题相关）
- 在**关键时间点**主动汇报（如每日早间简报、每周研究进展回顾）

### 1.3 设计目标

| 目标 | 说明 |
|:---|:---|
| **感知用户上下文** | 聚合任务、日程、番茄钟、笔记、文献、天气等多维数据 |
| **分层记忆系统** | 短期工作记忆（对话上下文）+ 长期语义记忆（用户偏好/行为模式/研究主题） |
| **多源触发机制** | 时间触发（Cron/Heartbeat）+ 事件触发（模块数据变更）+ 条件触发（阈值告警） |
| **智能决策循环** | ReAct 感知-推理-行动 + Reflection 反思优化 |
| **温和投递策略** | 避免打扰：应用内 Toast → 浏览器通知 → AI 面板内联建议，分层递进 |
| **人机协同边界** | 用户可控（开关/频率/时段），建议可采纳/忽略/延后，形成反馈闭环 |
| **零侵入集成** | 复用现有 `AiToolsService`、`LlmService`、`PrismaService`，不破坏已有模块 |

---

## 2. 系统总体架构

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ResearchOS 主动 AI 子系统                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  触发层 (Trigger) │    │  记忆层 (Memory)  │    │  决策层 (Decision)│         │
│  │                 │    │                 │    │                 │         │
│  │ • Heartbeat     │    │ • WorkingMemory │    │ • ReAct Loop    │         │
│  │ • CronSchedule  │    │ • SemanticMem   │    │ • Plan-Act      │         │
│  │ • EventListener │    │ • EpisodicMem   │    │ • Reflection    │         │
│  │ • ConditionWatch│    │ • BehaviorPattern│   │ • SuggestionGen │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                  │
│           └──────────────────────┼──────────────────────┘                  │
│                                  ▼                                         │
│                    ┌─────────────────────────┐                             │
│                    │    AiProactiveService   │                             │
│                    │   (主动建议调度中枢)     │                             │
│                    └────────────┬────────────┘                             │
│                                 ▼                                          │
│           ┌─────────────────────────────────────────┐                      │
│           │              投递层 (Delivery)           │                      │
│           │  • InAppToast  • BrowserNotification    │                      │
│           │  • AiPanelInline  • DailyBriefCard      │                      │
│           └─────────────────────────────────────────┘                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        反馈闭环 (Feedback Loop)                      │   │
│  │  用户行为 → 记忆更新 → 模型优化 → 建议质量提升                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 与现有系统的集成点

```
现有系统                    新增主动 AI 子系统
─────────────────────────────────────────────────────────
AiController                ← 新增 POST /suggestions /suggestions/:id/feedback
AiModule                    ← 新增 AiProactiveService + AiMemoryService
LlmService                  ← 复用 chatStreamWithTools() / quickAsk()
AiToolsService              ← 复用 14 个工具（无需修改）
AiConversationService       ← 复用对话 CRUD
PrismaService               ← 新增 ProactiveSuggestion / ConversationSummary / UserBehaviorPattern 模型
RedisService                ← 新增行为缓存 + 触发状态锁
PostgreSQL + pgvector       ← 新增语义记忆表 + 对话摘要向量
SettingsModule              ← 新增"主动建议"设置分类
Frontend AiChatPanel        ← 新增 InlineSuggestion 组件
Frontend stores             ← 新增 useProactiveSuggestions store
```

---

## 3. 记忆增强层设计

### 3.1 记忆分层模型

借鉴调研文档中 Mem0 / CoALA / OpenClaw 的分层思想，结合 ResearchOS 已有基础，设计四层记忆：

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: 工作记忆 (Working Memory)                            │
│ 载体: Redis (TTL 1h) + 内存                                  │
│ 内容: 当前会话上下文、最近 5 轮对话、活跃任务状态                │
│ 生命周期: 单次会话，页面关闭后保留 1 小时                      │
│ 已有基础: ✅ AiConversation.messages (最近 20 条)              │
└──────────────────────────────────────────────────────────────┘
                              ↓ 会话结束后提炼
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: 对话摘要 (Conversation Summary)                      │
│ 载体: PostgreSQL + pgvector (embedding)                      │
│ 内容: 每场对话的主题、用户意图、关键结论、情绪标记               │
│ 生命周期: 永久保留，按时间衰减评分                              │
│ 新增需求: ⚠️ 需要异步摘要生成服务                              │
└──────────────────────────────────────────────────────────────┘
                              ↓ 跨会话聚合
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: 语义记忆 (Semantic Memory)                           │
│ 载体: PostgreSQL (结构化事实) + pgvector (语义向量)            │
│ 内容: 用户偏好、研究主题、习惯模式、重要事实                    │
│ 生命周期: 永久保留，支持更新/去重                              │
│ 新增需求: ⚠️ 需要记忆管理器 (巩固/去重/衰减)                    │
└──────────────────────────────────────────────────────────────┘
                              ↓ 行为分析提炼
┌──────────────────────────────────────────────────────────────┐
│ Layer 4: 行为模式 (Behavior Pattern)                          │
│ 载体: PostgreSQL (JSONB)                                     │
│ 内容: 工作节律（最佳专注时段）、阅读偏好、任务处理模式           │
│ 生命周期: 周期性更新（每日/每周）                              │
│ 新增需求: ⚠️ 需要行为分析聚合任务                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Layer 2: 对话摘要 —— 从短期到长期的桥梁

**问题**: 当前 `AiMessage` 只保留原始对话，没有提炼。当用户开启新对话时，AI 完全"失忆"。

**方案**: 每次对话结束后（或对话消息超过 10 条时），异步触发摘要生成。

**数据模型**:
```prisma
model ConversationSummary {
  id             String   @id @default(cuid())
  conversationId String   @unique
  userId         String
  
  // 结构化摘要
  topics         String[] // 对话涉及的主题标签
  userIntent     String?  @db.Text // 用户核心意图
  keyConclusions String[] // 关键结论/决定
  emotionalTone  String?  // positive / neutral / frustrated / urgent
  
  // 语义向量（用于相似对话检索）
  summary        String   @db.Text // 完整摘要文本
  embedding      Unsupported("vector(1024)")? // 豆包 Ark Embedding
  
  createdAt      DateTime @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime @updatedAt @db.Timestamptz(3)
  
  @@index([userId, createdAt(sort: Desc)])
  @@map("conversation_summaries")
}
```

**摘要生成 Prompt 模板**:
```
请对以下 AI 助手对话进行结构化摘要。要求：
1. 提取 1-3 个主题标签（如：文献检索、任务规划、论文写作）
2. 总结用户的核心意图（一句话）
3. 列出关键结论或决定（用户明确采纳的建议、创建的任务/笔记等）
4. 判断用户情绪基调（positive / neutral / frustrated / urgent）
5. 生成一段 100 字以内的连贯摘要

对话内容：
{conversation_history}
```

**触发时机**:
- 用户点击"新建对话"时，对旧对话生成摘要
- 对话消息数达到 10 条时，后台异步生成
- 对话超过 30 分钟无新消息，视为结束，生成摘要

### 3.3 Layer 3: 语义记忆 —— 用户画像与长期知识

**设计灵感**: Mem0 的混合存储（关系型 + 向量）、OpenClaw 的 `memory.md`

**数据模型**:
```prisma
model UserSemanticMemory {
  id          String   @id @default(cuid())
  userId      String
  
  // 事实类型
  memoryType  String   // 'preference' | 'fact' | 'goal' | 'habit' | 'research_topic'
  key         String   // 结构化键，如 "research_field", "preferred_work_time"
  value       String   @db.Text // 值内容
  confidence  Float    @default(1.0) // 置信度 0-1
  source      String   // 来源：'conversation_summary' | 'user_settings' | 'behavior_analysis' | 'explicit'
  
  // 向量语义（用于模糊匹配）
  embedding   Unsupported("vector(1024)")?
  
  // 时间衰减
  importance  Float    @default(1.0) // 重要性评分 0-1
  lastAccessed DateTime @default(now())
  createdAt   DateTime @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime @updatedAt @db.Timestamptz(3)
  
  @@unique([userId, memoryType, key])
  @@index([userId, memoryType])
  @@index([userId, embedding]) // ivfflat 索引（pgvector）
  @@map("user_semantic_memories")
}
```

**记忆内容示例**:

| memoryType | key | value | confidence | source |
|:---|:---|:---|:---|:---|
| preference | work_start_time | 09:00 | 0.9 | behavior_analysis |
| preference | peak_focus_period | 10:00-12:00 | 0.85 | behavior_analysis |
| research_topic | current_focus | 神经网络可解释性 | 0.95 | conversation_summary |
| goal | short_term | 下周五完成季度汇报PPT | 0.8 | conversation_summary |
| habit | note_taking_style | 喜欢用任务列表整理文献要点 | 0.75 | conversation_summary |
| fact | preferred_llm | Kimi Coding | 0.99 | user_settings |

**记忆巩固流程** (Consolidation):
```
对话结束 → 生成 ConversationSummary 
  → LLM 提取结构化事实 
  → 语义去重（查询相似 embedding）
  → 合并/更新 UserSemanticMemory
  → 更新 importance / confidence
```

**记忆检索公式** (Decay-aware Ranking):
```
relevance_score = vector_similarity * importance * time_decay_factor

time_decay_factor = exp(-λ * days_since_last_accessed)
其中 λ = 0.1（约 23 天后衰减到 0.5）
```

### 3.4 Layer 4: 行为模式 —— 科研节律画像

**设计灵感**: OpenClaw 的 Heartbeat 清单、Zep 的时序分析

**数据模型**:
```prisma
model UserBehaviorPattern {
  id          String   @id @default(cuid())
  userId      String   @unique
  
  // 番茄钟节律（JSONB）
  pomodoroProfile Json? // { "peakHours": ["10:00", "15:00"], "avgDailyCount": 6, "avgDuration": 24, "interruptionRate": 0.15 }
  
  // 任务处理模式（JSONB）
  taskProfile Json? // { "avgCompletionTime": 3.5, "procrastinationRate": 0.2, "preferredPriority": "P2" }
  
  // 阅读模式（JSONB）
  readingProfile Json? // { "avgDailyReadTime": 45, "preferredReadingTime": "21:00", "topicDistribution": {...} }
  
  // 日程密度模式（JSONB）
  calendarProfile Json? // { "busyDays": ["周一", "周三"], "avgDailyEvents": 3, "longestFreeSlot": "14:00-16:00" }
  
  // 综合评分
  productivityScore Float? // 0-100 综合生产力评分
  
  // 时间戳
  computedAt  DateTime @default(now()) @db.Timestamptz(3)
  nextComputeAt DateTime @default(now()) @db.Timestamptz(3)
  
  @@index([userId])
  @@map("user_behavior_patterns")
}
```

**计算周期**:
- **每日**: 更新番茄钟统计（昨日完成数、中断率）
- **每周**: 更新任务完成率、阅读时长、最佳专注时段
- **每月**: 更新研究主题演进、生产力趋势

**数据来源**: 复用现有 `AiToolsService` 中的 `get_pomodoro_stats`、`get_tasks`、`get_references` 等查询。

### 3.5 记忆导出视图：SQL → Markdown

> **设计决策**: 本方案以 PostgreSQL 作为记忆主存储（真相源），但借鉴 OpenClaw 的 `memory.md` 思想，提供**记忆导出为 Markdown** 的功能，兼顾结构化查询能力与用户透明度。

#### 为什么不是 memory.md 做主存储？

| 维度 | SQL 主存储（本方案） | memory.md 主存储（OpenClaw） |
|:---|:---|:---|
| **检索效率** | pgvector 向量检索 10ms | 全量读取 + LLM 解析，无精准检索 |
| **统计分析** | SQL `GROUP BY`/`AVG` 精确计算 | LLM 模糊理解，无法做自适应算法 |
| **事务一致** | Prisma `$transaction` 原子操作 | 文件 I/O 无事务，并发写入易冲突 |
| **多用户隔离** | `userId` 字段天然隔离 | 需额外设计文件目录结构 |
| **与现有系统集成** | 复用 Prisma + pgvector + EmbeddingService | 需新增文件层，与 RAG 基础设施割裂 |
| **透明度** | ❌ 散落于表字段，不易一览全局 | ✅ 单文件可读可编辑 |
| **AI 上下文注入** | 向量检索后精准注入 TOP-K 记忆 | 全量注入，token 易爆炸 |

ResearchOS 是**多模块 Web 应用**（已有 9 个模块数据在 PostgreSQL），而非 OpenClaw 的**单用户 CLI 工具**。SQL 是更契合现有技术栈的选择。

#### 导出层设计：让 SQL 记忆变得可读

```
┌─────────────────────────────────────────────────────────────┐
│              统一存储层（PostgreSQL）— 真相源                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ SQL 结构化表  │  │ pgvector 语义向量 │  │ JSONB 行为画像   │ │
│  │ (事实/偏好)   │  │ (相似性检索)     │  │ (时序聚合)      │ │
│  └──────────────┘  └─────────────────┘  └─────────────────┘ │
│                      ↑ Prisma ORM 统一管理                   │
└─────────────────────────────────────────────────────────────┘
                           ↓ 导出/同步（只读视图）
┌─────────────────────────────────────────────────────────────┐
│              MemoryExporter —— Markdown 生成器               │
│  • 从 SQL 表聚合数据，生成人类可读的 Markdown 档案            │
│  • 支持：预览 / 下载 / 手动编辑后回写（未来扩展）              │
│  • 用途：用户审查 AI 记忆、数据迁移、调试排错                  │
└─────────────────────────────────────────────────────────────┘
```

#### Markdown 档案格式规范

```markdown
# ResearchOS AI 记忆档案

> 用户: {userName} | 生成时间: {generatedAt} | 记忆条数: {totalCount}
> ⚠️ 本文件由系统自动生成，仅供查看。如需修改 AI 记忆，请通过设置页面或直接与 AI 对话。

---

## 🎯 研究主题

| 主题 | 置信度 | 来源 | 最近更新 |
|:---|:---|:---|:---|
| 神经网络可解释性 | 0.95 | 对话摘要 | 2026-04-24 |
| 大模型安全对齐 | 0.72 | 文献标签 | 2026-04-22 |

## ⏰ 工作节律

- **最佳专注时段**: 10:00–12:00（基于 30 天番茄钟数据分析）
- **平均每日番茄**: 5.2 个（目标 8 个，达成率 65%）
- **高频中断时段**: 14:00–15:00（中断率 35%）
- **实际专注时长**: 平均 24 分钟/个（计划 25 分钟）

## 📚 阅读习惯

- **待读文献积压**: 12 篇（其中 3 篇高优先级）
- **最近阅读**: 《Attention Is All You Need》（2026-04-23，用时 45min）
- **阅读偏好**: 晚间 21:00 后读文献
- **周均阅读时长**: 315 分钟

## ✅ 任务处理模式

- **平均任务完成时间**: 3.5 天
- **拖延率**: 20%（4/20 个任务逾期）
- **偏好优先级**: P2（默认创建 P2 任务）
- **高优先级任务**: 「季度汇报PPT」（截止 2026-04-27）

## 📅 日程密度

- **忙碌日期**: 周一、周三（日均 4 场会议）
- **空闲时段**: 周二/周四 14:00–16:00
- **今日日程**: 3 场（下一场「组会汇报」14:00）

## ⚙️ AI 交互偏好

- **不喜欢的建议类型**: break_suggestion（关闭率 80%，已自动降频）
- **喜欢的建议类型**: reading_recommendation（采纳率 75%，已提升优先级）
- **自定义角色设定**: "你是一位严谨的计算机科学研究员..."
- **最近对话主题**: 文献检索、任务规划、论文写作

## 📝 近期重要事件

- [2026-04-26] AI 建议「番茄目标从 8 降到 6」，用户采纳
- [2026-04-23] 完成季度汇报 PPT
- [2026-04-20] 新建研究笔记「神经网络注意力机制」
- [2026-04-15] 开始阅读《Attention Is All You Need》

## 🔍 原始记忆数据（调试用途）

<details>
<summary>点击查看结构化原始数据</summary>

```json
{ "semanticMemories": [...], "behaviorPattern": {...}, "recentSummaries": [...] }
```

</details>
```

#### 导出触发方式

| 方式 | 触发条件 | 用途 |
|:---|:---|:---|
| **手动导出** | 用户在设置页点击「导出记忆档案」 | 用户主动审查 |
| **定期归档** | 每周日凌晨自动生成，存储在 `backups/memory-YYYY-MM-DD.md` | 数据备份 |
| **调试导出** | 开发者通过 API `GET /api/v1/ai/memory/export` 获取 | 排错调优 |

---

## 4. 主动建议引擎设计

### 4.1 触发机制设计

基于调研文档中的四种触发模式，结合 ResearchOS 的 Web 应用特性，设计三层触发：

```
┌────────────────────────────────────────────────────────────────┐
│ 触发优先级                                                      │
├────────────────────────────────────────────────────────────────┤
│ P0: 事件驱动 (Event-Driven) —— 即时响应                         │
│     • 高优先级任务截止前 N 小时（N = defaultReminder）           │
│     • 日程事件开始前 N 分钟                                      │
│     • 番茄钟连续中断 3 次以上                                    │
│     • 用户创建/更新笔记后，检测到与某篇未读文献高度相关           │
├────────────────────────────────────────────────────────────────┤
│ P1: 心跳检查 (Heartbeat) —— 周期性巡逻                          │
│     • 前端页面可见时，每 15 分钟检查一次                         │
│     • 后端独立进程，每 30 分钟执行一次（未来扩展）               │
│     • 检查项：番茄钟目标进度、待办堆积、日程冲突                 │
├────────────────────────────────────────────────────────────────┤
│ P2: 定时触发 (Cron) —— 固定时间                                 │
│     • 每日 09:00 —— 早间简报（今日日程 + 待办提醒 + 天气）        │
│     • 每日 21:00 —— 晚间复盘（今日番茄统计 + 未完成任务）         │
│     • 每周一 09:00 —— 周计划建议（基于上周数据）                  │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 决策循环：ReAct + Reflection

**感知 (Perceive)** → **推理 (Reason)** → **行动 (Act)** → **反思 (Reflect)**

#### Step 1: 感知 —— 数据聚合

```typescript
// 感知上下文构建
interface ProactiveContext {
  // 时间上下文
  now: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  
  // 用户状态
  userSettings: UserSettings;
  behaviorPattern: UserBehaviorPattern;
  semanticMemories: UserSemanticMemory[];
  recentSummaries: ConversationSummary[];
  
  // 实时数据（复用 AiToolsService）
  todaySummary: TodaySummary; // get_today_summary 结果
  pomodoroStats: PomodoroStats; // get_pomodoro_stats('today')
  upcomingEvents: CalendarEvent[]; // get_calendar_events
  pendingTasks: Task[]; // get_tasks({ status: 'TODO' | 'IN_PROGRESS' })
  unreadReferences: Reference[]; // get_references({ status: 'UNREAD' })
  recentNotes: Note[]; // get_notes({ limit: 5 })
}
```

**感知 Prompt 模板** (给 LLM 的上下文):
```
你是 ResearchOS 的主动科研助手。当前时间：{now}。

【用户画像】
- 研究主题：{semanticMemories.research_topic}
- 最佳专注时段：{behaviorPattern.pomodoroProfile.peakHours}
- 今日番茄目标：{userSettings.pomodoroDailyGoal} 个

【今日状态】
- 番茄钟：已完成 {pomodoroStats.completedCount}/{userSettings.pomodoroDailyGoal}，中断 {pomodoroStats.interruptionCount} 次
- 待办任务：{pendingTasks.todoCount} 项待开始，{pendingTasks.inProgressCount} 项进行中
- 高优先级：{pendingTasks.topPriorityTitle}（截止 {pendingTasks.topPriorityDueDate}）
- 今日日程：{upcomingEvents.length} 场，下一场「{upcomingEvents[0]?.title}」在 {upcomingEvents[0]?.startAt}
- 待读文献：{unreadReferences.length} 篇

【今日笔记】
{recentNotes.map(n => `- ${n.title}`).join('\n')}

【最近对话主题】
{recentSummaries.map(s => `- ${s.topics.join(', ')}`).join('\n')}
```

#### Step 2: 推理 —— 建议生成

**LLM 推理任务**: 基于感知上下文，判断当前是否需要向用户发起主动建议。

**输出格式** (结构化 JSON):
```json
{
  "shouldSuggest": true,
  "suggestion": {
    "type": "focus_reminder" | "deadline_warning" | "break_suggestion" | "reading_recommendation" | "daily_brief" | "pattern_insight",
    "priority": "high" | "medium" | "low",
    "title": "建议标题（15字以内）",
    "content": "建议正文（100字以内，语气友好、专业）",
    "actionable": true,
    "action": {
      "type": "navigate" | "create_task" | "start_pomodoro" | "open_reference" | "dismiss",
      "payload": { "path": "/tasks", "params": {} }
    },
    "timing": "immediate" | "next_idle" | "scheduled"
  },
  "reasoning": "为什么给出这条建议的推理过程"
}
```

**建议类型定义**:

| type | 触发场景 | 示例 |
|:---|:---|:---|
| `focus_reminder` | 最佳专注时段到来，但用户未开始番茄钟 | "10:00 是你效率最高的时段，开始一个番茄钟专注工作吧！" |
| `deadline_warning` | 高优先级任务截止前 < 24h | "「季度汇报PPT」明天下班截止，还有 3 个子任务待完成。" |
| `break_suggestion` | 连续专注 > 90 分钟，或中断率过高 | "你已经连续专注 2 小时了，休息 5 分钟让大脑充充电？" |
| `reading_recommendation` | 今日有空档，且有待读文献与近期主题相关 | "你最近在研究神经网络可解释性，这篇文献「XXX」很相关，有空看看？" |
| `daily_brief` | 每日固定时间（09:00） | "早安！今日 3 场会议，番茄目标 4/8，建议上午优先处理「XXX」。" |
| `pattern_insight` | 行为模式发现（每周） | "你本周专注时段集中在晚上，建议把高难度任务调整到 20:00-22:00。" |
| `weather_adjust` | 天气突变影响出行/计划 | "下午有雨，如果要去图书馆记得带伞。室内专注时段推荐 14:00-17:00。" |
| `note_link` | 新笔记与某篇文献高度相关 | "你刚写的笔记「XXX」与文献「YYY」主题相关，需要关联起来吗？" |

#### Step 3: 行动 —— 建议投递

根据 `priority` 和 `userSettings` 决定投递渠道：

```
priority = high + desktopNotification = true
  → 浏览器 Notification API + 应用内 Toast

priority = medium + user 正在 AI 面板
  → AI 面板内联建议卡片

priority = medium + user 不在 AI 面板
  → 应用内 Toast（右下角，5 秒后自动消失）

priority = low
  → AI 面板"建议"标签页（ passive inbox ）

type = daily_brief
  → 首页 Dashboard Widget（DailyBriefCard）
```

#### Step 4: 反思 —— 反馈闭环

用户每次与建议交互，都记录反馈：

```typescript
interface SuggestionFeedback {
  suggestionId: string;
  action: 'accepted' | 'dismissed' | 'snoozed' | 'ignored';
  // accepted: 用户点击了建议中的 action
  // dismissed: 用户主动关闭/忽略
  // snoozed: 用户选择"稍后提醒"
  // ignored: 建议展示后 30 秒无交互
  timestamp: Date;
  context?: string; // 用户当时的页面路径
}
```

**反思机制**:
- 用户对某类建议的 `dismissed` 率 > 50%，自动降低该类建议的触发频率
- 用户对某类建议的 `accepted` 率 > 70%，提升优先级，探索更细粒度场景
- 每周生成"建议质量报告"，供 LLM 反思优化 Prompt

### 4.3 建议生成频率控制（防打扰）

**核心原则**: 宁可错过，不可打扰。

```typescript
// 频率限制策略
const RATE_LIMITS = {
  // 每类建议的冷却时间
  focus_reminder: { maxPerDay: 2, minIntervalMinutes: 120 },
  deadline_warning: { maxPerDay: 3, minIntervalMinutes: 60 },
  break_suggestion: { maxPerDay: 4, minIntervalMinutes: 90 },
  reading_recommendation: { maxPerDay: 2, minIntervalMinutes: 240 },
  daily_brief: { maxPerDay: 1, minIntervalMinutes: 1440 }, // 每日一次
  pattern_insight: { maxPerDay: 1, minIntervalMinutes: 10080 }, // 每周一次
};

// 全局限制
const GLOBAL_LIMITS = {
  maxSuggestionsPerHour: 2,
  maxSuggestionsPerDay: 5,
  quietHours: { start: '23:00', end: '08:00' }, // 夜间不打扰
  focusMode: { // 用户开启番茄钟时
    suppressNonUrgent: true, // 只推送 deadline_warning
  }
};
```

---

## 5. 数据模型设计

### 5.1 新增 Prisma Schema

```prisma
// ============================================
// 主动建议系统 —— 数据模型
// ============================================

model ProactiveSuggestion {
  id          String   @id @default(cuid())
  userId      String
  
  // 建议内容
  type        String   // focus_reminder | deadline_warning | break_suggestion | reading_recommendation | daily_brief | pattern_insight | weather_adjust | note_link
  priority    String   // high | medium | low
  title       String
  content     String   @db.Text
  
  // 可执行动作
  actionType  String   // navigate | create_task | start_pomodoro | open_reference | dismiss | open_chat
  actionPayload Json?  // { path, params, referenceId, taskTitle, etc. }
  
  // 投递状态
  status      String   @default("pending") // pending | delivered | dismissed | accepted | expired
  deliveredAt DateTime? @db.Timestamptz(3)
  expiresAt   DateTime? @db.Timestamptz(3) // 默认 24h 后过期
  
  // 用户反馈
  feedback    String?  // accepted | dismissed | snoozed | ignored
  feedbackAt  DateTime? @db.Timestamptz(3)
  
  // 上下文（用于调试和优化）
  context     Json?    // 触发时的完整上下文快照
  reasoning   String?  @db.Text // LLM 的推理过程
  
  createdAt   DateTime @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime @updatedAt @db.Timestamptz(3)
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId, status, createdAt(sort: Desc)])
  @@index([userId, type, createdAt])
  @@map("proactive_suggestions")
}

model ConversationSummary {
  id             String   @id @default(cuid())
  conversationId String   @unique
  userId         String
  
  topics         String[]
  userIntent     String?  @db.Text
  keyConclusions String[]
  emotionalTone  String?
  summary        String   @db.Text
  embedding      Unsupported("vector(1024)")?
  
  createdAt      DateTime @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime @updatedAt @db.Timestamptz(3)
  
  @@index([userId, createdAt(sort: Desc)])
  @@map("conversation_summaries")
}

model UserSemanticMemory {
  id           String   @id @default(cuid())
  userId       String
  
  memoryType   String   // preference | fact | goal | habit | research_topic
  key          String
  value        String   @db.Text
  confidence   Float    @default(1.0)
  source       String   // conversation_summary | user_settings | behavior_analysis | explicit
  
  embedding    Unsupported("vector(1024)")?
  importance   Float    @default(1.0)
  lastAccessed DateTime @default(now())
  
  createdAt    DateTime @default(now()) @db.Timestamptz(3)
  updatedAt    DateTime @updatedAt @db.Timestamptz(3)
  
  @@unique([userId, memoryType, key])
  @@index([userId, memoryType])
  @@map("user_semantic_memories")
}

model UserBehaviorPattern {
  id              String   @id @default(cuid())
  userId          String   @unique
  
  pomodoroProfile Json?
  taskProfile     Json?
  readingProfile  Json?
  calendarProfile Json?
  productivityScore Float?
  
  computedAt      DateTime @default(now()) @db.Timestamptz(3)
  nextComputeAt   DateTime @default(now()) @db.Timestamptz(3)
  
  @@index([userId])
  @@map("user_behavior_patterns")
}

// ============================================
// 扩展 UserSettings —— 新增"主动建议"设置
// ============================================

// 在现有 UserSettings 模型中追加：
// proactiveSuggestions   Boolean  @default(true)   // 总开关
// proactiveFrequency     String   @default("medium") // low | medium | high
// proactiveChannels      Json     @default("{\"toast\": true, \"browser\": true, \"inline\": true}") 
// quietHoursStart        String?  @default("23:00")
// quietHoursEnd          String?  @default("08:00")
```

### 5.2 模型关系图

```
User
├── aiConversations[]: AiConversation
│   └── summary: ConversationSummary (1:1)
├── semanticMemories[]: UserSemanticMemory
├── behaviorPattern: UserBehaviorPattern (1:1)
├── suggestions[]: ProactiveSuggestion
└── settings: UserSettings
    └── proactiveSuggestions, proactiveFrequency, proactiveChannels, quietHours...
```

---

## 6. API 接口设计

### 6.1 新增后端 API

```
POST   /api/v1/ai/suggestions/generate        # 手动触发建议生成（调试用）
GET    /api/v1/ai/suggestions?status=pending   # 获取待展示的建议列表
POST   /api/v1/ai/suggestions/:id/feedback     # 提交建议反馈
GET    /api/v1/ai/suggestions/stats            # 建议统计（接受率/忽略率等）
GET    /api/v1/ai/suggestions/history          # 历史建议查询
POST   /api/v1/ai/suggestions/dismiss-all      # 一键忽略所有待展示建议
GET    /api/v1/ai/memory                       # 获取用户的语义记忆（调试用）
POST   /api/v1/ai/memory/extract               # 手动触发记忆提取（调试用）
GET    /api/v1/ai/behavior                     # 获取用户行为模式画像
GET    /api/v1/ai/memory/export                  # 导出记忆档案为 Markdown
POST   /api/v1/ai/memory/import                  # 从 Markdown 导入/更新记忆（未来扩展）
```

### 6.2 接口详情

#### GET /api/v1/ai/suggestions

**Query Parameters**:
```typescript
interface GetSuggestionsQuery {
  status?: 'pending' | 'delivered' | 'dismissed' | 'accepted' | 'expired';
  type?: string;
  limit?: number; // default 20
  cursor?: string; // 分页游标
}
```

**Response**:
```typescript
interface SuggestionsResponse {
  data: ProactiveSuggestion[];
  nextCursor: string | null;
  meta: {
    totalPending: number;
    todayCount: number;
    acceptedRate: number; // 近7天接受率
  };
}
```

#### POST /api/v1/ai/suggestions/:id/feedback

**Request Body**:
```typescript
interface SuggestionFeedbackDto {
  action: 'accepted' | 'dismissed' | 'snoozed';
  snoozeMinutes?: number; // snoozed 时可选，默认 30
}
```

### 6.3 SSE 扩展：主动建议推送

扩展现有 SSE 流，新增事件类型：

```
event: suggestion
data: {
  "id": "cuid",
  "type": "focus_reminder",
  "priority": "medium",
  "title": "最佳专注时段到了",
  "content": "10:00-12:00 是你效率最高的时段...",
  "actionType": "start_pomodoro",
  "actionPayload": { "duration": 25 },
  "expiresAt": "2026-04-26T12:00:00Z"
}
```

**实现方式**: 前端与后端建立 SSE 长连接（复用现有 EventSource 或新建独立连接），后端在生成主动建议后，通过 SSE 推送给前端。

### 6.4 记忆导出 API

#### GET /api/v1/ai/memory/export

**Query Parameters**:
```typescript
interface ExportMemoryQuery {
  format?: 'markdown' | 'json'; // default 'markdown'
  includeRaw?: boolean; // 是否包含原始结构化数据（默认 false）
}
```

**Response** (format=markdown):
```typescript
interface ExportMemoryResponse {
  content: string; // Markdown 文本内容
  meta: {
    generatedAt: string;
    memoryCount: number;
    conversationCount: number;
    behaviorProfileVersion: string;
  };
}
```

**Response** (format=json):
```typescript
interface ExportMemoryJsonResponse {
  semanticMemories: UserSemanticMemory[];
  behaviorPattern: UserBehaviorPattern;
  conversationSummaries: ConversationSummary[];
  recentSuggestions: ProactiveSuggestion[];
  meta: { generatedAt: string; version: string };
}
```

**后端实现逻辑**:
```typescript
// AiMemoryService.exportToMarkdown(userId)
async exportToMarkdown(userId: string): Promise<string> {
  const [memories, pattern, summaries] = await Promise.all([
    this.prisma.userSemanticMemory.findMany({ where: { userId } }),
    this.prisma.userBehaviorPattern.findUnique({ where: { userId } }),
    this.prisma.conversationSummary.findMany({ where: { userId }, take: 10 }),
  ]);
  
  return this.memoryExporter.render({
    userName: await this.getUserDisplayName(userId),
    memories,
    pattern,
    summaries,
    generatedAt: new Date(),
  });
}
```

---

## 7. 前端交互设计

### 7.1 应用内 Toast 通知

```
┌─────────────────────────────────────────────────────────┐
│  💡 最佳专注时段到了                    [×] [开始专注]   │
│  10:00-12:00 是你效率最高的时段，当前无日程冲突。         │
└─────────────────────────────────────────────────────────┘
  ↑ 右上角滑入，auto-dismiss 10s，hover 时暂停计时
```

**组件**: `ProactiveToast.tsx`
- 位置: 右上角（桌面）/ 底部（移动端）
- 动画: `translate-x-full` → `translate-x-0`，duration 300ms
- 样式: 液态玻璃卡片，根据 priority 显示左侧色条（high=red, medium=amber, low=blue）
- 交互: 点击卡片执行 action，点击 × 标记 dismissed

### 7.2 AI 面板内联建议

```
┌──────────────────────────────────────────────────────────┐
│  AI 助手                                                 │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 💡 你可能感兴趣                                   │   │
│  │ 你刚写的笔记「神经网络注意力机制」与文献           │   │
│  │ 《Attention Is All You Need》主题相关。            │   │
│  │ [关联文献] [忽略]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  用户: 帮我总结一下今天的番茄钟数据                       │
│  AI: ...                                                │
└──────────────────────────────────────────────────────────┘
```

**组件**: `InlineSuggestion.tsx`（嵌入 `AiChatPanel` 消息列表顶部）

### 7.3 首页 Dashboard —— 每日简报 Widget

```
┌──────────────────────────────┐
│  📋 今日简报（AI 生成）        │
│  ─────────────────────────   │
│  ☀️ 晴 22°C · 3 场会议        │
│  🍅 番茄 2/8 · 建议上午冲刺    │
│  📚 待读 5 篇 · 「XXX」最相关 │
│  ⭐ 优先：季度汇报PPT（明天截止）│
│                              │
│  [查看详情] [我已知晓]         │
└──────────────────────────────┘
```

**组件**: `DailyBriefWidget.tsx`（加入 Dashboard 网格）

### 7.4 设置页面 —— 新增"主动建议"分类

```
设置 / 主动建议
─────────────────────────────────
☑️ 启用主动建议

建议频率
  ○ 低频（每日最多 3 条）
  ● 中频（每日最多 5 条）[默认]
  ○ 高频（每日最多 8 条）

通知渠道
  ☑️ 应用内通知（Toast）
  ☑️ 浏览器桌面通知
  ☑️ AI 面板内联建议

免打扰时段
  开始: [23:00]  结束: [08:00]

建议类型开关
  ☑️ 专注提醒    ☑️ 截止预警    ☑️ 休息建议
  ☑️ 文献推荐    ☑️ 每日简报    ☑️ 行为洞察
```

### 7.5 建议历史页

前端新增 `/suggestions` 路由（或作为设置子页面）：
- 展示所有历史建议（按时间倒序）
- 筛选：全部 / 已采纳 / 已忽略 / 已过期
- 统计图表：接受率趋势、各类建议占比

### 7.6 记忆档案页面

**路由**: `/settings/memory`（作为设置页面的子标签）

**页面结构**:
```
┌──────────────────────────────────────────────────────────────┐
│  设置 / 记忆档案                                             │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  📄 AI 记忆档案                                                │
│  ─────────────────────────────────────────────────────────   │
│  系统自动从你的对话、行为和数据中提炼记忆，用于生成更精准    │
│  的主动建议。你可以随时查看、导出或删除这些记忆。            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  记忆概览                                             │   │
│  │  • 结构化记忆: 23 条（偏好/事实/目标/习惯/研究主题）   │   │
│  │  • 行为画像: 已生成（2026-04-26 更新）                 │   │
│  │  • 对话摘要: 15 场对话已提炼                           │   │
│  │  • 研究主题: 神经网络可解释性、大模型安全对齐           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [📥 导出 Markdown]  [🗑️ 删除全部记忆]  [🔄 重新提取]        │
│                                                              │
│  ── 记忆详情 ──                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 研究主题                                              │   │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │ • 神经网络可解释性        置信度 95%  [编辑] [删除]    │   │
│  │ • 大模型安全对齐          置信度 72%  [编辑] [删除]    │   │
│  │                                                       │   │
│  │ 工作节律                                              │   │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │ • 最佳专注时段: 10:00–12:00          [编辑] [删除]    │   │
│  │ • 平均每日番茄: 5.2 个               [编辑] [删除]    │   │
│  │                                                       │   │
│  │ ... 其他分类 ...                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**组件**: `MemoryArchivePage.tsx`
- **液态玻璃卡片**: 分组展示语义记忆（按 `memoryType` 分类）
- **置信度可视化**: 用进度条显示每条记忆的 `confidence`
- **操作按钮**: 
  - 「导出 Markdown」→ 调用 `GET /api/v1/ai/memory/export?format=markdown`，触发浏览器下载 `.md` 文件
  - 「删除全部记忆」→ ConfirmDialog 确认后调用 `DELETE /api/v1/ai/memory`，清空语义记忆+摘要+行为画像
  - 「重新提取」→ 手动触发记忆巩固流程
- **单条编辑**: 点击[编辑]可修改 `value` 和 `importance`，点击[删除]移除该条记忆
- **来源追溯**: 每条记忆显示来源标签（对话摘要/用户设置/行为分析/手动录入），点击可查看原始上下文

---

## 8. 记忆透明度与导出

### 8.1 设计原则：可审计的 AI

ResearchOS 遵循**"可审计的 AI"**原则：用户必须能够清楚地知道 AI 记住了什么、为什么记住、以及这些记忆如何影响 AI 的行为。

| 原则 | 实现 |
|:---|:---|
| **可见性** | 记忆档案页面展示所有结构化记忆，按分类组织 |
| **可解释性** | 每条记忆标注来源（对话摘要/设置/行为分析）和置信度 |
| **可控制性** | 用户可单条编辑/删除记忆，也可一键清空全部 |
| **可携带性** | Markdown 导出支持标准格式，用户可随时带走自己的数据 |
| **可恢复性** | 删除后保留 30 天软删除（`deletedAt` 标记），支持恢复 |

### 8.2 导出文件的典型用途

1. **用户审查**: 科研人员可以定期查看 AI 对自己的"认知"是否准确，手动纠正偏差
2. **数据迁移**: 换设备或重装系统时，导入记忆档案即可恢复 AI 的个性化理解
3. **Prompt 调试**: 开发者通过导出的档案，检查哪些记忆被注入到 LLM 上下文中
4. **研究记录**: 记忆档案本身就是一份"AI 视角的用户研究日志"，可作为科研工作的辅助记录

### 8.3 导出的隐私处理

```typescript
// AiMemoryService 导出时的脱敏逻辑
function sanitizeForExport(memories: UserSemanticMemory[]): UserSemanticMemory[] {
  return memories.map(m => {
    // 笔记/文献的原始内容不导出，只导出提炼后的事实
    if (m.source === 'conversation_summary') {
      return { ...m, value: m.value }; // 已是提炼后的事实，可直接导出
    }
    return m;
  });
}
```

---

## 9. 安全与边界控制

### 9.1 隐私保护

| 措施 | 说明 |
|:---|:---|
| 数据不出本地 | 所有记忆数据存储在本地 PostgreSQL，LLM 调用仅传输脱敏后的摘要 |
| 用户可控 | 可随时导出/删除全部记忆数据（复用现有数据导出功能） |
| 最小必要 | 仅向 LLM 发送生成建议所需的最小上下文，不传输完整笔记/文献内容 |
| 记忆隔离 | 严格按 `userId` 隔离，不会出现跨用户记忆泄露 |

### 9.2 防打扰机制

| 场景 | 行为 |
|:---|:---|
| 免打扰时段 | 23:00-08:00 期间不生成任何非紧急建议 |
| 番茄钟专注中 | 仅推送 `deadline_warning`（高优先级），其他建议延后 |
| 用户连续忽略某类建议 | 自动降低该类建议频率，7 天后完全暂停 |
| 单日已达上限 | 不再生成新建议，即使触发条件满足 |
| 用户关闭总开关 | 停止所有触发器，已有建议标记过期 |

### 9.3 成本与安全控制

| 措施 | 说明 |
|:---|:---|
| LLM 调用限制 | 主动建议的 LLM 调用走 `quickAsk()`（非流式，单次调用，成本低） |
| 频率上限 | 全局每小时最多 2 次 LLM 调用（生成建议） |
| 超时保护 | 建议生成超时 10s 则放弃，不阻塞用户 |
| 降级策略 | LLM 不可用 → 使用规则引擎生成预设建议模板 |

---

## 10. 实施路线图

### 10.1 里程碑规划

```
Week 1: 基础设施（数据库 + API + 设置）
─────────────────────────────────────────
Day 1-2: 数据库迁移
  • Prisma Schema 追加 4 个新模型
  • 运行 pnpm db:migrate
  • 验证 pgvector 扩展兼容性

Day 3-4: 后端骨架
  • 新建 AiProactiveModule（含 Service / Controller / DTO）
  • 实现 AiProactiveService.generateSuggestion()
  • 实现频率限制/防打扰逻辑
  • 复用 AiToolsService 做数据聚合

Day 5: 设置扩展
  • UserSettings 追加 proactive 字段
  • SettingsPage 新增"主动建议"分类
  • 前端 store 同步更新

Week 2: 核心引擎（触发 + 决策 + 投递）
─────────────────────────────────────────
Day 6-7: 触发机制
  • 前端 Heartbeat（页面可见时每 15min 检查）
  • 定时 DailyBrief（09:00 / 21:00）
  • 事件监听（任务截止、日程提醒）

Day 8-9: 建议生成引擎
  • ProactiveContext 构建（复用 get_today_summary）
  • LLM Prompt 模板 + JSON 结构化输出
  • Suggestion 持久化到数据库

Day 10: 投递管道
  • 浏览器 Notification API 封装
  • Toast 组件开发
  • AI 面板 InlineSuggestion 组件

Week 3: 记忆增强（对话摘要 + 语义记忆）
─────────────────────────────────────────
Day 11-12: 对话摘要
  • 异步摘要生成（对话结束后触发）
  • ConversationSummary 存储 + 向量 embedding

Day 13-14: 语义记忆
  • 记忆提取（从摘要中抽取结构化事实）
  • 记忆去重/更新逻辑
  • 记忆检索接口（给建议生成使用）

Day 15: 行为模式
  • 每日/每周行为聚合任务
  • UserBehaviorPattern 计算逻辑

Week 4: 打磨与交付（反馈闭环 + UI 优化 + 测试）
─────────────────────────────────────────
Day 16-17: 反馈闭环
  • 建议反馈 API（接受/忽略/延后）
  • 频率自适应算法
  • 建议质量统计

Day 18-19: UI 打磨
  • Dashboard DailyBrief Widget
  • 建议历史页面
  • 移动端适配

Day 20: 测试与交付
  • 后端单元测试（Jest）
  • 前端组件测试（Vitest）
  • 端到端联调
  • 更新 AGENTS.md / project-status.md
```

### 10.2 优先级排序（MVP → 完整版）

**MVP（最小可用产品）—— Week 1~2**:
1. ✅ 数据库 Schema + API 骨架
2. ✅ 前端 Heartbeat 触发 + Toast 投递
3. ✅ 4 类基础建议：focus_reminder、deadline_warning、break_suggestion、daily_brief
4. ✅ 设置开关 + 防打扰机制
5. ✅ 建议反馈（接受/忽略）

**V1.0（完整版）—— Week 3~4**:
6. ✅ 对话摘要 + 语义记忆
7. ✅ 行为模式画像
8. ✅ 文献推荐 + 笔记关联推荐
9. ✅ Dashboard DailyBrief Widget
10. ✅ 建议历史与统计

**V1.1（优化版）—— 后续迭代**:
11. 🔄 后端 Cron 任务（替代前端 Heartbeat，支持离线推送）
12. 🔄 邮件/微信推送渠道
13. 🔄 多 Agent 协作（文献 Agent + 日程 Agent + 专注 Agent）
14. 🔄 强化学习优化建议策略

---

## 11. 技术风险与应对

| 风险 | 影响 | 概率 | 应对方案 |
|:---|:---|:---|:---|
| LLM 调用成本过高 | 用户账单激增 | 中 | ① 使用 quickAsk() 单次调用 ② 频率严格限制 ③ 规则引擎降级 |
| 建议质量差（打扰用户） | 用户关闭功能 | 中 | ① 保守策略：宁可不发 ② 反馈闭环快速迭代 ③ 用户可精细控制类型 |
| 前端 Heartbeat 精度不足 | 用户切换标签页后错过建议 | 高 | ① 使用 Page Visibility API ② 后端 Cron 作为补充 ③ 建议有 24h 有效期 |
| pgvector 性能瓶颈 | 语义记忆检索慢 | 低 | ① 控制记忆总量（单用户 < 1000 条）② 添加 ivfflat 索引 ③ 分层缓存 |
| 隐私合规问题 | 用户不信任 | 低 | ① 本地存储强调 ② 数据导出/删除功能 ③ 透明化记忆查看界面 |
| 对话摘要生成阻塞 | 影响对话体验 | 中 | ① 后台异步（Bull Queue / setImmediate）② 失败可重试 ③ 超时降级 |

---

## 附录 A：Prompt 工程参考

### A.1 建议生成主 Prompt

```
你是 ResearchOS 的主动科研助手，负责在合适的时机向用户发起有价值的建议。

## 核心原则
1. **不打扰优先**：如果用户当前可能正忙（有临近日程、番茄钟进行中），不要发建议。
2. **价值优先**：只发对用户有明确帮助的建议，不发无意义的问候。
3. **简洁友好**：建议正文不超过 100 字，语气像一位贴心的研究伙伴。

## 建议类型与触发条件
- focus_reminder: 最佳专注时段 + 当前无日程冲突 + 番茄钟未在进行
- deadline_warning: 任务截止 < 24h + 状态不是 DONE
- break_suggestion: 连续专注 > 90min 或 中断率 > 30%
- reading_recommendation: 有待读文献与近期研究主题相关 + 今日有空档（> 60min 无日程）
- daily_brief: 固定时间（09:00 / 21:00）
- pattern_insight: 发现新的行为模式（每周一次）

## 输出格式
必须返回纯 JSON，不要 Markdown 代码块：
{
  "shouldSuggest": boolean,
  "suggestion": { "type": "...", "priority": "...", "title": "...", "content": "...", "actionable": true, "action": { "type": "...", "payload": {} }, "timing": "..." },
  "reasoning": "..."
}

## 当前上下文
{proactiveContext}
```

### A.2 记忆提取 Prompt

```
从以下对话摘要中，提取所有值得长期记住的事实。输出 JSON 数组：
[
  { "memoryType": "preference|fact|goal|habit|research_topic", "key": "简短英文键", "value": "中文值", "confidence": 0.0-1.0 }
]

摘要：
{summary}
```

---

## 附录 B：与调研文档的对照

| 调研框架 | 本方案对应实现 |
|:---|:---|
| OpenClaw Heartbeat | 前端 15min Heartbeat + 后端 30min Cron |
| OpenClaw memory.md | UserSemanticMemory（PostgreSQL 结构化） |
| LangGraph Checkpointer | AiConversation 持久化（已有） |
| LangGraph Store | UserSemanticMemory + ConversationSummary |
| Mem0 混合存储 | PostgreSQL（结构化）+ pgvector（语义） |
| Mem0 去重/衰减 | 语义去重（embedding 相似度）+ 时间衰减因子 |
| Zep 时序知识图谱 | UserBehaviorPattern（时序 JSONB 画像） |
| ReAct 循环 | ProactiveContext → LLM 推理 → Suggestion → 投递 → 反馈 |
| Reflection 模式 | 建议质量统计 → Prompt 优化 → 模型迭代 |
| Human-in-the-loop | 用户反馈（接受/忽略/延后）+ 设置精细控制 |

---

> **下一步行动**: 评审本设计文档 → 确认实施范围（MVP vs 完整版）→ 开始 Week 1 开发。
