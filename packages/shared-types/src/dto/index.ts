// ============================================
// 日程模块 DTO
// ============================================

export interface CreateEventDto {
  title: string;
  startAt: string; // ISO 8601
  endAt: string;
  timezone?: string;
  rrule?: string; // iCalendar RRULE
  isAllDay?: boolean;
  location?: string;
  description?: string;
  color?: string;
}

export interface UpdateEventDto {
  title?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  rrule?: string;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  color?: string;
}

export interface EventResponseDto {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  rrule: string | null;
  isAllDay: boolean;
  location: string | null;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 任务模块 DTO
// ============================================

export interface CreateTaskDto {
  title: string;
  status?: string; // TaskStatus
  priority?: number; // 1-4
  sortOrder?: number;
  parentId?: string | null;
  pomodoroCount?: number;
  referenceId?: string; // 关联文献 ID
}

export interface UpdateTaskDto {
  title?: string;
  status?: string;
  priority?: number;
  sortOrder?: number;
  parentId?: string | null;
  pomodoroCount?: number;
  referenceId?: string; // 关联文献 ID
}

export interface TaskResponseDto {
  id: string;
  title: string;
  status: string;
  priority: number;
  sortOrder: number;
  parentId: string | null;
  pomodoroCount: number;
  referenceId: string | null;
  reference?: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoveTaskDto {
  status: string;
  sortOrder?: number;
}

// ============================================
// 番茄钟模块 DTO
// ============================================

export interface CreatePomodoroDto {
  taskId?: string;
  plannedDuration: number; // 秒，默认 1500（25min）
}

export interface EndPomodoroDto {
  duration: number; // 实际专注秒数
  interruptions?: number;
}

export interface PomodoroSessionResponseDto {
  id: string;
  taskId: string | null;
  duration: number;
  plannedDuration: number;
  interruptions: number;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface PomodoroStatsDto {
  date: string;
  totalDuration: number;
  completedCount: number;
  interruptionCount: number;
}

// ============================================
// 认证模块 DTO
// ============================================

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

// ============================================
// 通用 DTO
// ============================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// ============================================
// 笔记模块 DTO
// ============================================

export interface CreateNoteDto {
  title: string;
  content: Record<string, unknown>; // Tiptap JSON
  plainText: string;
  tags?: string[];
  folderId?: string | null;
  referenceId?: string; // 关联文献 ID
}

export interface UpdateNoteDto {
  title?: string;
  content?: Record<string, unknown>;
  plainText?: string;
  tags?: string[];
  folderId?: string | null;
  referenceId?: string; // 关联文献 ID
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface NoteResponseDto {
  id: string;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  summary: string | null;
  tags: string[];
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchNoteDto {
  q: string;
  tag?: string;
  limit?: number;
}

export interface CreateNoteFolderDto {
  name: string;
  parentId?: string | null;
}

export interface UpdateNoteFolderDto {
  name?: string;
  parentId?: string | null;
}

export interface NoteFolderResponseDto {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AI 助手模块 DTO
// ============================================

export interface ChatRequestDto {
  message: string;
  skill?: string;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'streaming' | 'complete' | 'error';
  toolCalls?: ToolCallDto[];
}

export interface ToolCallDto {
  tool: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  params?: Record<string, unknown>;
  result?: string;
}

export interface DirectLlmRequestDto {
  text: string;
  operation: 'translate' | 'polish' | 'summarize';
  targetLang?: string;
  maxLength?: number;
}

// ============================================
// 文献管理模块 DTO
// ============================================

export interface CreateReferenceDto {
  title: string;
  authors?: string[];
  year?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string[];
  literatureType?: string;
  tags?: string[];
  folderId?: string | null;
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
  literatureType?: string;
  readingStatus?: string;
  priority?: number;
  rating?: number;
  tags?: string[];
  folderId?: string | null;
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
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: number;
    pomodoroCount: number;
    createdAt: string;
  }>;
  linkedNotes?: Array<{
    id: string;
    title: string;
    plainText: string;
    tags: string[];
    updatedAt: string;
  }>;
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
  ids: string[];
  format: 'gb7714' | 'apa' | 'mla' | 'chicago' | 'bibtex';
}

export interface CreateReferenceFolderDto {
  name: string;
  parentId?: string | null;
}

export interface UpdateReferenceFolderDto {
  name?: string;
  parentId?: string | null;
}

export interface ReferenceFolderResponseDto {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
