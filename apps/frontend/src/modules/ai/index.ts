/**
 * AI 助手模块 — 入口导出
 */

export { AiChatPanel } from './components/AiChatPanel';
export { AiChatButton } from './components/AiChatButton';
export { AiMessageBubble } from './components/AiMessageBubble';
export { ToolCallIndicator } from './components/ToolCallIndicator';
export { useAiChat } from './hooks/useAiChat';
export { useAiStatus } from './hooks/useAiStatus';
export {
  useAiConversations,
  useAiConversation,
  useCreateConversation,
  useDeleteConversation,
  useUpdateConversationTitle,
} from './hooks/useAiConversations';
export type { ChatMessage, ToolCallInfo, ChatOptions, SseEventType } from './types/ai.types';
