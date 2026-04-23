/**
 * 任务状态枚举
 * 使用 as const 对象替代 enum，避免 ESM/CJS 互操作问题
 */
export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * 优先级枚举（P1-P4，参照 GTD）
 */
export const Priority = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

/**
 * 番茄钟中断类型
 */
export const InterruptionType = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
} as const;

export type InterruptionType = (typeof InterruptionType)[keyof typeof InterruptionType];

/**
 * AI 消息角色
 */
export const AiMessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
} as const;

export type AiMessageRole = (typeof AiMessageRole)[keyof typeof AiMessageRole];

/**
 * 工具调用状态
 */
export const ToolCallStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

export type ToolCallStatus = (typeof ToolCallStatus)[keyof typeof ToolCallStatus];
