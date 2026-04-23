# 文献管理模块设计文档

> **文档类型**: 架构设计 / 实现指南  
> **对应阶段**: Phase 2  
> **最后更新**: 2026-04-23  
> **状态**: 待评审

---

## 一、设计目标

文献管理是博士科研工作台的核心模块之一。设计目标是让研究者能够：

1. **统一收纳** —— PDF 上传、DOI 自动抓取、Zotero 导入、手动录入，多来源归集
2. **结构化组织** —— 标签、收藏夹、阅读状态、优先级，替代文件夹混乱
3. **深度阅读** —— PDF 内嵌阅读器、高亮批注、笔记关联
4. **AI 赋能** —— 自动摘要、关键发现提取、引用格式化、相关文献推荐
5. **工作流联动** —— 文献阅读与任务、番茄钟、笔记、AI 对话无缝衔接

---

## 二、用户使用流程

### 2.1 整体流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            文献管理使用流程                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │ 导入文献  │ → │ 组织管理  │ → │ 深度阅读  │ → │ 输出应用  │            │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│       │               │               │               │                    │
│  ┌────┴─────┐    ┌────┴─────┐    ┌────┴─────┐    ┌────┴─────┐            │
│  │• PDF上传  │    │• 标签分类 │    │• PDF阅读  │    │• 引用导出 │            │
│  │• DOI抓取 │    │• 阅读状态 │    │• 高亮批注 │    │• 笔记生成 │            │
│  │• Zotero  │    │• 收藏夹   │    │• AI摘要   │    │• 任务关联 │            │
│  │  导入    │    │• 智能搜索 │    │• 关联笔记 │    │• AI对话   │            │
│  │• 手动录入 │    │• 排序筛选 │    │• 番茄钟   │    │  引用     │            │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 详细流程

#### 步骤 1：导入文献（多种入口）

**入口 A：PDF 上传（最常用）**
1. 用户点击「上传文献」按钮，或拖拽 PDF 到上传区域
2. 系统解析 PDF 元数据（标题、作者、DOI 等）
3. 如果解析出 DOI，自动调用 CrossRef / Semantic Scholar API 补全元数据
4. 生成缩略图预览（PDF 第一页截图）
5. 文献进入「待读」状态，显示在文献库中

**入口 B：DOI / arXiv ID / PMID 导入**
1. 用户粘贴 DOI（如 `10.1038/s41586-021-03819-2`）或 arXiv ID
2. 系统调用外部 API 获取完整元数据
3. 用户确认后保存（可选：同时下载 PDF）

**入口 C：Zotero 导入**
1. 用户导出 Zotero 图书馆为 CSV / RIS / BibTeX
2. 系统批量解析导入，自动去重（基于 DOI 或标题+作者+年份）
3. 保留 Zotero 中的标签和笔记

**入口 D：浏览器扩展（未来）**
1. 在论文页面点击扩展图标
2. 一键保存标题、作者、摘要、PDF 链接到 PhD_OS

**入口 E：手动录入**
1. 表单填写：标题、作者、期刊、年份、卷期页、DOI、URL、摘要
2. 支持 BibTeX / RIS 格式粘贴自动解析

#### 步骤 2：组织与管理

**文献库主界面**
- **视图切换**：列表视图（紧凑信息） / 卡片视图（含缩略图） / 阅读进度视图
- **左侧边栏**：
  - 按阅读状态筛选：全部 / 待读 / 在读 / 已读 / 精读
  - 按标签筛选：动态标签云，支持多选
  - 按年份筛选：时间轴滑块
  - 按优先级筛选：P1（核心必读）/ P2（重要参考）/ P3（泛读）/ P4（备选）
- **顶部搜索栏**：
  - 全文检索（标题 + 作者 + 摘要 + 标签 + 笔记内容）
  - 语义检索（基于 pgvector embedding，输入自然语言查找相关文献）
  - 高级筛选：组合条件（年份范围、期刊、作者等）

**批量操作**
- 多选文献 → 批量修改标签 / 阅读状态 / 优先级 / 删除
- 拖拽到收藏夹（类似笔记文件夹，但更简单）

#### 步骤 3：深度阅读

**PDF 阅读器**
- 内嵌 PDF.js 渲染，支持缩放、翻页、文本选择
- **高亮批注**：选中文本 → 高亮（多色可选）+ 添加批注
- **笔记关联**：在阅读器中打开右侧笔记面板，实时关联当前文献
- **AI 辅助阅读**：
  - 「总结这篇论文」→ AI 生成结构化摘要（Background / Methods / Results / Conclusion）
  - 「解释这个概念」→ 选中术语，AI 用简单语言解释
  - 「找关键发现」→ AI 提取论文核心贡献
  - 「评估研究质量」→ AI 分析实验设计、样本量、局限性

**阅读计时**
- 打开 PDF 时自动开始番茄钟（可选）
- 记录每次阅读时长，生成「文献阅读时间统计」

#### 步骤 4：输出与应用

**引用导出**
- 选择格式：GB/T 7714（中文国标）、APA、MLA、Chicago、BibTeX
- 单条导出 / 批量导出（生成 .bib 文件或复制到剪贴板）
- 支持按引用顺序编号（用于论文写作时）

**与笔记联动**
- 阅读中创建的批注自动同步到笔记系统（生成一篇「文献阅读笔记」）
- 笔记中可插入文献引用（`[@doe2025nature]` 格式）

**与任务联动**
- 将文献阅读添加为任务（如「精读：注意力机制综述」）
- 完成任务时自动标记文献为「已读」

**AI 对话引用**
- 在 AI 聊天中提问：「对比我收藏的关于 Transformer 的两篇论文」
- AI 自动调用 `search_references` 工具，检索相关文献，基于内容回答

---

## 三、数据库设计

### 3.1 Schema 扩展

在 `apps/backend/prisma/schema.prisma` 中新增以下模型：

```prisma
// ============================================
// 文献管理模块（Literature Management）
// ============================================

enum ReadingStatus {
  UNREAD      // 待读
  READING     // 在读
  READ        // 已读
  SKIMMED     // 泛读/略读
  DEEP_READ   // 精读
}

enum LiteratureType {
  JOURNAL_ARTICLE    // 期刊论文
  CONFERENCE_PAPER   // 会议论文
  PREPRINT           // 预印本
  BOOK               // 书籍
  BOOK_CHAPTER       // 书籍章节
  THESIS             // 学位论文
  REPORT             // 技术报告
  PATENT             // 专利
  OTHER              // 其他
}

model Reference {
  id            String         @id @default(cuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])

  // 核心元数据
  title         String
  authors       String[]       // ["张三", "李四", "Wang, Wu"]
  year          Int?
  journal       String?        // 期刊/会议名
  volume        String?
  issue         String?
  pages         String?        // "123-145"
  doi           String?        @unique
  arxivId       String?
  pmid          String?
  url           String?        // 论文主页链接
  pdfUrl        String?        // PDF 直链（外部）

  // 内容与摘要
  abstract      String?        @db.Text
  abstractZh    String?        @db.Text  // 中文摘要（AI 翻译或手动）
  keywords      String[]
  literatureType LiteratureType @default(JOURNAL_ARTICLE)

  // 本地文件
  filePath      String?        // 本地存储的 PDF 路径（相对 uploads/）
  fileSize      Int?           // 字节数
  fileHash      String?        // SHA-256，用于去重
  thumbnailPath String?        // 缩略图路径

  // 组织与状态
  readingStatus ReadingStatus  @default(UNREAD)
  priority      Int            @default(3) // 1-4，同 Task
  rating        Int?           // 1-5 星评分
  tags          String[]       // 标签数组
  folderId      String?
  folder        ReferenceFolder? @relation(fields: [folderId], references: [id])

  // AI 生成内容
  aiSummary     String?        @db.Text  // AI 结构化摘要
  keyFindings   String[]       // AI 提取的关键发现
  // 向量检索（pgvector）
  embedding     Unsupported("vector(768)")?

  // 统计
  readCount     Int            @default(0)  // 打开阅读次数
  totalReadTime Int            @default(0)  // 总阅读时长（秒）
  lastReadAt    DateTime?      @db.Timestamptz(3)

  // 关联
  notes         ReferenceNote[]
  tasks         Task[]         // 关联的阅读任务
  pomodoroSessions PomodoroSession[] // 关联的番茄钟记录

  // 标准字段
  createdAt     DateTime       @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime       @updatedAt @db.Timestamptz(3)
  deletedAt     DateTime?      @db.Timestamptz(3)

  @@index([userId, readingStatus])
  @@index([userId, priority])
  @@index([userId, year])
  @@index([userId, folderId])
  @@index([userId, tags])
  @@index([doi])
  @@index([fileHash])
  @@index([deletedAt])
  @@index([userId, createdAt])
}

// 文献文件夹（扁平结构，类似 NoteFolder）
model ReferenceFolder {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  name      String
  parentId  String?
  parent    ReferenceFolder? @relation("FolderHierarchy", fields: [parentId], references: [id])
  children  ReferenceFolder[] @relation("FolderHierarchy")
  references Reference[]
  sortOrder Float       @default(0)
  createdAt DateTime    @default(now()) @db.Timestamptz(3)
  updatedAt DateTime    @updatedAt @db.Timestamptz(3)
  deletedAt DateTime?   @db.Timestamptz(3)

  @@index([userId, parentId])
  @@index([deletedAt])
}

// 文献批注/高亮（与 Reference 一对多）
model ReferenceNote {
  id          String    @id @default(cuid())
  userId      String
  referenceId String
  reference   Reference @relation(fields: [referenceId], references: [id])

  // 批注位置（PDF.js 坐标系）
  pageNumber  Int
  rect        Json?     // { x, y, width, height } 高亮区域
  text        String?   // 选中的原文
  color       String    @default("#FFD700") // 高亮颜色

  // 笔记内容
  content     String    @db.Text
  // 可选：关联到 Note 系统的笔记
  noteId      String?

  createdAt   DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt   DateTime? @db.Timestamptz(3)

  @@index([referenceId, pageNumber])
  @@index([deletedAt])
}
```

### 3.2 模型关系图

```
User ──1:N──► Reference
              │
              ├── 1:N ──► ReferenceNote（批注）
              ├── N:1 ──► ReferenceFolder（文件夹）
              ├── 1:N ──► Task（关联阅读任务）
              └── 1:N ──► PomodoroSession（阅读计时）

User ──1:N──► ReferenceFolder（自引用嵌套）
```

---

## 四、后端 API 设计

### 4.1 REST API 路由

控制器基路径：`/api/v1/references`

| 方法 | 路由 | 功能 | 认证 |
|:---|:---|:---|:---|
| `GET` | `/references` | 文献列表（分页 + 筛选） | Bearer |
| `GET` | `/references/search` | 全文检索（关键词） | Bearer |
| `GET` | `/references/semantic-search` | 语义检索（自然语言） | Bearer |
| `GET` | `/references/:id` | 文献详情 | Bearer |
| `POST` | `/references` | 手动创建文献 | Bearer |
| `POST` | `/references/upload` | 上传 PDF 并创建文献 | Bearer |
| `POST` | `/references/import-doi` | 通过 DOI 导入 | Bearer |
| `POST` | `/references/import-zotero` | 批量导入 Zotero 导出文件 | Bearer |
| `PATCH` | `/references/:id` | 更新文献元数据 | Bearer |
| `PATCH` | `/references/:id/status` | 更新阅读状态 | Bearer |
| `DELETE` | `/references/:id` | 软删除文献 | Bearer |
| `GET` | `/references/:id/notes` | 获取文献批注列表 | Bearer |
| `POST` | `/references/:id/notes` | 添加批注 | Bearer |
| `PATCH` | `/references/:id/notes/:noteId` | 更新批注 | Bearer |
| `DELETE` | `/references/:id/notes/:noteId` | 删除批注 | Bearer |
| `GET` | `/references/:id/export-citation` | 导出单条引用 | Bearer |
| `POST` | `/references/export-batch` | 批量导出引用 | Bearer |
| `GET` | `/reference-folders` | 文件夹列表 | Bearer |
| `POST` | `/reference-folders` | 创建文件夹 | Bearer |
| `PATCH` | `/reference-folders/:id` | 更新文件夹 | Bearer |
| `DELETE` | `/reference-folders/:id` | 删除文件夹 | Bearer |

### 4.2 关键接口详细设计

#### 文献列表查询（GET /references）

```typescript
// Query Parameters
{
  status?: "UNREAD" | "READING" | "READ" | "SKIMMED" | "DEEP_READ"; // 阅读状态
  priority?: 1 | 2 | 3 | 4;
  folderId?: string;
  tag?: string;              // 单标签筛选
  tags?: string[];           // 多标签筛选
  yearFrom?: number;
  yearTo?: number;
  q?: string;                // 简单关键词搜索（标题+作者+摘要）
  sortBy?: "createdAt" | "updatedAt" | "year" | "lastReadAt" | "rating";
  sortOrder?: "asc" | "desc";
  cursor?: string;           // 分页游标
  limit?: number;            // 默认 20，最大 50
}

// Response: PaginatedResponse<ReferenceResponseDto>
{
  data: ReferenceResponseDto[],
  nextCursor: string | null,
  hasMore: boolean
}
```

#### PDF 上传（POST /references/upload）

```typescript
// Request: multipart/form-data
{
  file: File;           // PDF 文件，最大 50MB
  folderId?: string;    // 可选目标文件夹
  tags?: string;        // 可选初始标签（逗号分隔）
}

// Response
{
  id: string;
  title: string;        // 从 PDF 解析或文件名
  authors: string[];
  doi?: string;
  abstract?: string;
  filePath: string;
  readingStatus: "UNREAD";
  createdAt: string;
}
```

**上传处理流程**：
1. `multer` 接收文件，保存到 `uploads/papers/{userId}/{uuid}.pdf`
2. 计算 SHA-256，检查是否已存在（去重）
3. 调用 `pdf-parse` 提取文本内容
4. 从文本中匹配 DOI 正则（`10\.\d{4,}/.+`）
5. 如有 DOI，调用 CrossRef API 补全元数据
6. 生成第一页缩略图（`pdf2pic` 或 `pdftoppm`）
7. 生成 embedding（异步，放入后台队列）
8. 返回文献信息

#### DOI 导入（POST /references/import-doi）

```typescript
// Request
{
  doi: string;          // e.g. "10.1038/s41586-021-03819-2"
  downloadPdf?: boolean; // 是否尝试下载 PDF
}

// 外部 API 调用链
// CrossRef API (优先) → Semantic Scholar API (fallback) → OpenAlex API (fallback)
```

#### 语义检索（GET /references/semantic-search）

```typescript
// Query Parameters
{
  q: string;            // 自然语言查询，如 "关于注意力机制在医学影像中的应用"
  limit?: number;       // 默认 10
}

// 实现方式
// 1. 将查询文本通过 LLM Embedding API 转换为向量
// 2. 使用 Prisma + pgvector 执行相似度搜索
// 3. SELECT * FROM "Reference" 
//    WHERE "userId" = $1 AND "deletedAt" IS NULL
//    ORDER BY embedding <=> $2
//    LIMIT $3
```

#### 引用导出（GET /references/:id/export-citation）

```typescript
// Query Parameters
{
  format: "gb7714" | "apa" | "mla" | "chicago" | "bibtex"
}

// Response: text/plain
// GB/T 7714: 张三, 李四. 论文标题[J]. 期刊名, 2024, 15(3): 123-145.
// BibTeX: @article{id, author={}, title={}, journal={}, year={} }
```

### 4.3 共享类型 DTO（packages/shared-types）

```typescript
// enums/index.ts
export const ReadingStatus = {
  UNREAD: 'UNREAD',
  READING: 'READING',
  READ: 'READ',
  SKIMMED: 'SKIMMED',
  DEEP_READ: 'DEEP_READ',
} as const;

export const LiteratureType = {
  JOURNAL_ARTICLE: 'JOURNAL_ARTICLE',
  CONFERENCE_PAPER: 'CONFERENCE_PAPER',
  PREPRINT: 'PREPRINT',
  BOOK: 'BOOK',
  BOOK_CHAPTER: 'BOOK_CHAPTER',
  THESIS: 'THESIS',
  REPORT: 'REPORT',
  PATENT: 'PATENT',
  OTHER: 'OTHER',
} as const;

// dto/index.ts
export interface CreateReferenceDto {
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string[];
  literatureType?: (typeof LiteratureType)[keyof typeof LiteratureType];
  tags?: string[];
  folderId?: string;
  priority?: number;
}

export interface UpdateReferenceDto {
  title?: string;
  authors?: string[];
  year?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  abstractZh?: string;
  keywords?: string[];
  literatureType?: (typeof LiteratureType)[keyof typeof LiteratureType];
  readingStatus?: (typeof ReadingStatus)[keyof typeof ReadingStatus];
  priority?: number;
  rating?: number;
  tags?: string[];
  folderId?: string;
}

export interface ReferenceResponseDto {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  abstractZh: string | null;
  keywords: string[];
  literatureType: string;
  readingStatus: string;
  priority: number;
  rating: number | null;
  tags: string[];
  folderId: string | null;
  filePath: string | null;
  fileSize: number | null;
  thumbnailPath: string | null;
  aiSummary: string | null;
  keyFindings: string[];
  readCount: number;
  totalReadTime: number;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferenceNoteDto {
  pageNumber: number;
  rect?: { x: number; y: number; width: number; height: number };
  text?: string;
  color?: string;
  content: string;
}

export interface ReferenceNoteResponseDto {
  id: string;
  pageNumber: number;
  rect: object | null;
  text: string | null;
  color: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDoiDto {
  doi: string;
  downloadPdf?: boolean;
}

export interface ExportCitationDto {
  ids: string[];       // 文献 ID 列表
  format: 'gb7714' | 'apa' | 'mla' | 'chicago' | 'bibtex';
}
```

---

## 五、前端架构

### 5.1 模块结构

```
apps/frontend/src/modules/reference/
├── ReferencePage.tsx           # 主页面：文献库（列表/卡片/筛选/搜索）
├── ReferenceReader.tsx         # PDF 阅读器页面
├── components/
│   ├── ReferenceList.tsx       # 列表视图
│   ├── ReferenceCard.tsx       # 卡片视图（含缩略图）
│   ├── ReferenceSidebar.tsx    # 左侧筛选边栏
│   ├── ReferenceToolbar.tsx    # 顶部工具栏（搜索/视图切换/批量操作）
│   ├── ReferenceDetailDialog.tsx # 文献详情弹窗（元数据展示）
│   ├── UploadZone.tsx          # 拖拽上传区域
│   ├── ImportDoiDialog.tsx     # DOI 导入弹窗
│   ├── ReferenceFolderTree.tsx # 文件夹树
│   ├── CitationExportDialog.tsx # 引用导出弹窗
│   └── PdfViewer.tsx           # PDF.js 包装组件
├── hooks/
│   ├── useReferences.ts        # TanStack Query：文献列表
│   ├── useReferenceSearch.ts   # 全文搜索
│   ├── useSemanticSearch.ts    # 语义搜索
│   ├── useReferenceMutations.ts # 增删改
│   ├── useReferenceNotes.ts    # 批注 CRUD
│   └── usePdfViewer.ts         # PDF 阅读状态管理
├── types/
│   └── reference.types.ts      # 本地类型定义
└── utils/
    ├── citation-formatter.ts   # 引用格式化（GB7714 / APA 等）
    ├── doi-parser.ts           # DOI 提取与验证
    └── pdf-thumbnail.ts        # 缩略图生成
```

### 5.2 路由配置

```typescript
// 在现有路由系统中添加
{ path: '/references', element: <ReferencePage /> },
{ path: '/references/:id/read', element: <ReferenceReader /> },
```

### 5.3 关键组件设计

#### ReferencePage（文献库主页）

布局：三栏式（类似笔记系统）

```
┌──────────────────────────────────────────────────────────────┐
│  导航栏（玻璃效果）                                             │
├──────────┬───────────────────────────────┬───────────────────┤
│          │                               │                   │
│ 文件夹树  │      文献列表/卡片视图         │   文献详情面板     │
│ + 筛选   │      （可拖拽、多选）           │   （点击后显示）   │
│          │                               │                   │
│ - 待读   │  ┌─────┐ ┌─────┐ ┌─────┐     │  标题             │
│ - 在读   │  │论文1│ │论文2│ │论文3│     │  作者             │
│ - 已读   │  └─────┘ └─────┘ └─────┘     │  摘要             │
│ - 精读   │                               │  标签             │
│          │                               │  [打开PDF] [引用] │
│ 标签云   │                               │                   │
│          │                               │                   │
├──────────┴───────────────────────────────┴───────────────────┤
│  底部：分页/游标加载                                           │
└──────────────────────────────────────────────────────────────┘
```

#### ReferenceReader（PDF 阅读器）

布局：阅读器 + 侧边面板

```
┌──────────────────────────────────────────────────────────────┐
│  [返回] 论文标题...                    [高亮] [笔记] [AI] [×] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    PDF.js 渲染区域                            │
│                    （支持文本选择）                            │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  底部状态栏：页码 / 总页数  |  缩放  |  阅读时长               │
└──────────────────────────────────────────────────────────────┘

// 右侧滑出面板（高亮/笔记/AI）
┌─────────────┐
│  批注列表    │
│  ─────────  │
│  ▶ P.3 高亮 │
│    "..."    │
│    我的笔记  │
│  ▶ P.5 高亮 │
│    "..."    │
│  ─────────  │
│  [+ 新批注] │
└─────────────┘
```

### 5.4 状态管理

使用 **TanStack Query** 管理服务端状态，局部状态用 React `useState`：

```typescript
// stores/reference.store.ts (Zustand，可选)
// 仅管理 UI 状态（视图模式、筛选条件展开/收起）
interface ReferenceUIState {
  viewMode: 'list' | 'card';
  selectedIds: string[];      // 多选状态
  sidebarCollapsed: boolean;
  activeFilters: {
    status: ReadingStatus[];
    tags: string[];
    yearRange: [number, number] | null;
  };
  setViewMode: (mode: 'list' | 'card') => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setActiveFilters: (filters: ...) => void;
}
```

---

## 六、AI 工具集成

### 6.1 新增 AI 工具

在 `AiToolsService` 的 `PHD_OS_TOOLS` 数组中添加以下工具：

```typescript
// 工具 1：获取文献列表
{
  name: 'get_references',
  description: '获取用户文献库中的文献列表，支持按阅读状态、标签、优先级筛选',
  input_schema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['UNREAD', 'READING', 'READ', 'SKIMMED', 'DEEP_READ'], description: '阅读状态筛选' },
      tag: { type: 'string', description: '标签筛选' },
      priority: { type: 'number', enum: [1, 2, 3, 4], description: '优先级筛选，1=最高' },
      limit: { type: 'number', default: 10, description: '返回数量上限' },
    },
  },
}

// 工具 2：搜索文献
{
  name: 'search_references',
  description: '在用户文献库中搜索文献，匹配标题、作者、摘要、关键词、标签和批注内容',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词或短语' },
      limit: { type: 'number', default: 10 },
    },
    required: ['query'],
  },
}

// 工具 3：语义检索文献（自然语言）
{
  name: 'semantic_search_references',
  description: '用自然语言描述需求，检索语义相关的文献。适合"找和我研究相关的论文"这类模糊查询',
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: '自然语言描述，如"关于图神经网络在药物发现中的应用"' },
      limit: { type: 'number', default: 5 },
    },
    required: ['description'],
  },
}

// 工具 4：获取文献详情
{
  name: 'get_reference_detail',
  description: '获取单篇文献的完整信息，包括元数据、AI摘要、关键发现、批注',
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: '文献 ID' },
    },
    required: ['id'],
  },
}

// 工具 5：创建文献
{
  name: 'create_reference',
  description: '手动创建一条文献记录，适用于用户口述或粘贴的文献信息',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      authors: { type: 'array', items: { type: 'string' } },
      year: { type: 'number' },
      journal: { type: 'string' },
      doi: { type: 'string' },
      abstract: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      url: { type: 'string' },
    },
    required: ['title'],
  },
}

// 工具 6：添加文献笔记
{
  name: 'add_reference_note',
  description: '为指定文献添加阅读笔记或批注',
  input_schema: {
    type: 'object',
    properties: {
      referenceId: { type: 'string', description: '文献 ID' },
      content: { type: 'string', description: '笔记内容' },
      pageNumber: { type: 'number', description: '关联页码（可选）' },
    },
    required: ['referenceId', 'content'],
  },
}

// 工具 7：生成引用格式
{
  name: 'format_citation',
  description: '为指定文献生成标准引用格式',
  input_schema: {
    type: 'object',
    properties: {
      referenceId: { type: 'string' },
      format: { type: 'string', enum: ['gb7714', 'apa', 'mla', 'bibtex'], default: 'gb7714' },
    },
    required: ['referenceId'],
  },
}
```

### 6.2 AI 使用场景示例

| 用户提问 | AI 行为 | 调用工具 |
|:---|:---|:---|
| "我最近有哪些关于 Transformer 的论文还没读？" | 检索未读文献中标题/摘要含 Transformer 的 | `search_references` |
| "总结一下我收藏的关于 GNN 的三篇核心论文的关键发现" | 语义检索 GNN 文献 → 取高优先级 → 读取详情 → 总结 | `semantic_search_references` + `get_reference_detail` |
| "把这篇论文添加到我的文献库，DOI 是 10.1038/xxx" | 调用 DOI 导入 → 创建文献 | `create_reference`（后端内部调用 CrossRef） |
| "我正在读的这篇论文有什么重点？" | 读取文献 AI 摘要和 keyFindings | `get_reference_detail` |
| "帮我用 GB/T 7714 格式引用这篇论文" | 生成国标引用格式 | `format_citation` |
| "对比我文献库里关于 CNN 和 ViT 的两类论文" | 分别检索 → 提取关键信息 → 对比分析 | `semantic_search_references`（两次） |

### 6.3 AI 生成内容

文献导入后，可异步触发以下 AI 生成任务（放入后台队列，不阻塞用户）：

1. **结构化摘要**（`aiSummary`）
   - Prompt: "请用中文总结以下论文，按 Background / Methods / Results / Conclusion / Limitations 结构输出..."
   
2. **关键发现提取**（`keyFindings`）
   - Prompt: "提取这篇论文的 3-5 个核心发现或贡献，每条不超过 50 字..."

3. **关键词翻译与扩展**（`keywords` + `tags`）
   - 将英文关键词翻译为中文，并自动打上学科标签

4. **Embedding 生成**
   - 将标题+摘要+关键词组合为文本，通过 Embedding API 生成向量，存入 `embedding` 字段

---

## 七、与现有系统的联动

### 7.1 联动关系总览

```
                    ┌─────────────────┐
                    │   文献管理模块   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   任务系统     │   │   笔记系统     │   │   番茄钟系统   │
│  (TaskModule)  │   │  (NoteModule)  │   │ (Pomodoro)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                   AI 助手 (AiModule)                     │
│          （通过 Function Calling 查询各模块数据）          │
└─────────────────────────────────────────────────────────┘
```

### 7.2 具体联动机制

#### 与任务系统的联动

1. **从文献创建任务**
   - 在文献详情页点击「添加阅读任务」
   - 自动创建 Task，标题为「阅读：《论文标题》」
   - `Task.referenceId` 关联到文献，可在任务卡片显示文献信息
   - 优先级继承文献的 priority

2. **任务完成反向更新**
   - 当关联的阅读任务被标记为 DONE，询问用户是否将文献标记为「已读」

3. **AI 联动**
   - 用户问："我这周有哪些文献要读？"
   - AI 查询 Task（status=IN_PROGRESS 或 TODO，referenceId 不为空）→ 返回文献阅读任务列表

#### 与笔记系统的联动

1. **文献批注 → 笔记**
   - 在阅读器中添加批注时，可选择「同时保存到笔记系统」
   - 自动生成一篇笔记，标题为「《论文标题》阅读笔记」，内容为所有批注汇总
   - 笔记中可插入文献引用链接

2. **笔记中引用文献**
   - 在 TipTap 编辑器中支持 `/cite` 命令
   - 搜索文献库 → 选择 → 插入引用标记（如 `[@doe2025nature]`）
   - 渲染时显示为带链接的引用卡片

3. **AI 联动**
   - 用户问："把我关于注意力机制的笔记和文献结合起来总结一下"
   - AI 同时查询 Note 和 Reference → 综合分析

#### 与番茄钟的联动

1. **阅读计时**
   - 打开 PDF 阅读器时，可选启动番茄钟
   - `PomodoroSession.referenceId` 记录阅读时长
   - 文献的 `totalReadTime` 和 `readCount` 自动累计

2. **统计展示**
   - 番茄钟统计页面增加「文献阅读时长」维度
   - 热力图可筛选只看「文献阅读」类型的专注时间

#### 与日程系统的联动

1. **文献阅读计划**
   - 在文献详情页点击「安排阅读时间」
   - 创建 Calendar Event，类型为「文献阅读」
   - Event 描述中包含文献标题和链接

#### 与 AI 助手的联动（核心）

1. **文献知识库问答**
   - 用户："我读过的关于联邦学习的论文有哪些共识和分歧？"
   - AI：调用 `search_references`（query="federated learning"）→ 过滤 READ/DEEP_READ 状态 → 读取各文献 `aiSummary` 和 `keyFindings` → 综合分析回答

2. **写作辅助**
   - 用户："帮我写一段关于 Transformer 的文献综述，用我收藏的论文"
   - AI：语义检索相关文献 → 按时间/主题组织 → 生成综述段落 → 每条观点标注引用来源

3. **阅读推荐**
   - 用户："根据我目前的文献库，推荐下一步该读什么方向？"
   - AI：分析已有文献的主题分布（关键词聚类）→ 识别空白方向 → 推荐（如果接入了外部 API，可推荐具体论文）

---

## 八、实现计划

### 8.1 开发优先级（分 3 个迭代）

#### 迭代 1：基础文献库（2 周）

**目标**：能导入、查看、管理文献

- [ ] 数据库 Schema 迁移（Reference + ReferenceFolder + ReferenceNote）
- [ ] 后端 REST API（CRUD + 上传 + 列表 + 搜索）
- [ ] 前端文献库主页面（列表/卡片视图 + 筛选 + 搜索）
- [ ] 文献详情弹窗（元数据展示）
- [ ] PDF 上传 + 元数据解析（pdf-parse + DOI 提取）
- [ ] 共享类型 DTO

**验收标准**：
- 能上传 PDF 并看到文献出现在列表中
- 能手动创建文献
- 能按状态和标签筛选

#### 迭代 2：深度阅读 + AI（2 周）

**目标**：能阅读 PDF、做批注、AI 辅助

- [ ] PDF.js 内嵌阅读器
- [ ] 高亮批注功能（文本选择 → 高亮 + 笔记）
- [ ] 左侧文件夹树 + 收藏夹管理
- [ ] AI 工具注册（get_references / search_references / get_reference_detail / create_reference）
- [ ] AI 异步摘要生成（后台队列）
- [ ] 语义检索（pgvector embedding）

**验收标准**：
- 能打开 PDF 阅读并添加批注
- AI 能回答关于文献库的问题
- 能用自然语言搜索到相关文献

#### 迭代 3：工作流联动 + 输出（1-2 周）

**目标**：与现有系统无缝衔接

- [ ] 引用导出（GB7714 / APA / BibTeX）
- [ ] DOI 导入 + Zotero 批量导入
- [ ] 文献 ↔ 任务联动（创建阅读任务）
- [ ] 文献 ↔ 笔记联动（批注同步到笔记）
- [ ] 文献 ↔ 番茄钟联动（阅读计时）
- [ ] 添加更多 AI 工具（add_reference_note / format_citation / semantic_search_references）
- [ ] 阅读进度统计

**验收标准**：
- 能从 DOI 一键导入文献
- 文献阅读能创建番茄钟并统计时长
- 能导出引用格式到剪贴板
- AI 能基于文献库生成文献综述

### 8.2 技术选型决策

| 组件 | 选型 | 理由 |
|:---|:---|:---|
| PDF 渲染 | `pdfjs-dist`（PDF.js） | 成熟、Mozilla 维护、支持文本层选择 |
| PDF 文本提取 | `pdf-parse` | 轻量、Node.js 原生 |
| PDF 缩略图 | `pdf2pic`（基于 `GraphicsMagick`/`ImageMagick`）或 `pdftoppm` | 第一页截图 |
| DOI 解析 | CrossRef REST API + `crossref-api` | 最权威的学术元数据源 |
| 备用元数据 | Semantic Scholar API / OpenAlex API | CrossRef 缺失时 fallback |
| 文件上传 | `@nestjs/platform-express` + `multer` | NestJS 官方支持 |
| 文件存储 | 本地文件系统（`uploads/papers/`） | 开发环境足够，生产可换 S3 |
| 去重 | SHA-256 哈希 | 简单可靠 |
| 引用格式化 | 自研模板（GB7714/APA/MLA/BibTeX） | 学术引用格式相对固定 |
| 向量检索 | pgvector + Prisma `Unsupported` | 与现有数据库一致 |
| Embedding API | 与 LLM 同提供商（Kimi / OpenAI） | 复用已有 API Key |
| 后台队列 | BullMQ（Redis） | 已有 Redis 容器，BullMQ 成熟 |

### 8.3 文件存储结构

```
project-root/
└── uploads/                    # 已存在（或新建），加入 .gitignore
    └── papers/
        └── {userId}/           # 用户隔离
            ├── {uuid}.pdf      # 原始 PDF
            ├── {uuid}.thumb.png # 缩略图
            └── ...
```

---

## 九、技术债务与风险

| 风险 | 影响 | 缓解措施 |
|:---|:---|:---|
| PDF 解析质量不稳定 | 元数据提取失败 | 提供手动编辑入口；多解析器 fallback |
| PDF.js 大文件渲染卡顿 | 用户体验差 | 分页渲染（虚拟滚动）；>10MB 文件提示下载 |
| Embedding 生成成本 | API 调用费用 | 仅对摘要+标题生成（<500 token）；队列限速 |
| pgvector 性能 | 文献量 >1 万时检索变慢 | 加 HNSW 索引；必要时限制向量维度 |
| CrossRef API 限流 | DOI 导入失败 | 加请求缓存；Semantic Scholar fallback |
| 文件存储膨胀 | 磁盘占用 | 定期清理软删除文件的定时任务；生产迁移 S3 |
| 版权风险 | PDF 存储 | 用户自用、本地部署；不提供公开分享 |

---

## 十、附录

### 10.1 CrossRef API 调用示例

```bash
# 通过 DOI 获取元数据
curl "https://api.crossref.org/works/10.1038/s41586-021-03819-2" \
  -H "User-Agent: PhD_OS/1.0 (mailto:admin@phd-os.local)"

# 返回字段：message.title, message.author[], message.container-title, message.published-print.date-parts, message.DOI, message.abstract, message.link[]
```

### 10.2 Semantic Scholar API 调用示例

```bash
# 通过 DOI 获取详细信息
curl "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1038/s41586-021-03819-2?fields=title,authors,year,abstract,citationStyles"

# 搜索论文
curl "https://api.semanticscholar.org/graph/v1/paper/search?query=transformer+attention&fields=title,authors,year,abstract&limit=10"
```

### 10.3 GB/T 7714 引用格式模板

```typescript
// 期刊论文
function formatGB7714(ref: ReferenceResponseDto): string {
  const authors = ref.authors.map(a => {
    const parts = a.split(/,\s*/);
    if (parts.length >= 2) return `${parts[0]}, ${parts[1][0]}.`; // 英文: Doe, J.
    return a; // 中文保留原名
  }).join(', ');
  
  return `${authors}. ${ref.title}[J]. ${ref.journal}, ${ref.year}, ${ref.volume}(${ref.issue}): ${ref.pages}.`;
}
// 输出示例：张三, 李四. 论文标题[J]. 期刊名, 2024, 15(3): 123-145.
//           DOE J, SMITH A. Paper Title[J]. Journal Name, 2024, 15(3): 123-145.
```

### 10.4 环境变量配置

```bash
# apps/backend/.env 新增
# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB

# 外部学术 API（可选，用于 DOI 导入）
CROSSREF_EMAIL=your-email@example.com  # CrossRef 要求提供联系方式
SEMANTIC_SCHOLAR_API_KEY=              # 免费，可选

# Embedding（复用 LLM 配置）
EMBEDDING_PROVIDER=kimi-coding         # 或 openai
EMBEDDING_MODEL=text-embedding-3-small # 或 kimi 的 embedding 模型
```

---

> **下一步行动**：评审本设计文档后，进入迭代 1 开发：数据库 Schema 迁移 → 后端 API 骨架 → 前端页面框架。
