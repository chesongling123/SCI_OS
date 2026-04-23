/**
 * AI 聊天模块类型定义
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'streaming' | 'complete' | 'error';
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  tool: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  params?: Record<string, unknown>;
  result?: string;
}

export interface ChatOptions {
  skill?: string;
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * SSE 流式事件类型
 */
export type SseEventType =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; tool: string; status: string; params?: Record<string, unknown> }
  | { type: 'thinking'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
