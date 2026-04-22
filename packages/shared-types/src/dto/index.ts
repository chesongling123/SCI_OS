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
}

export interface UpdateTaskDto {
  title?: string;
  status?: string;
  priority?: number;
  sortOrder?: number;
  parentId?: string | null;
  pomodoroCount?: number;
}

export interface TaskResponseDto {
  id: string;
  title: string;
  status: string;
  priority: number;
  sortOrder: number;
  parentId: string | null;
  pomodoroCount: number;
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
