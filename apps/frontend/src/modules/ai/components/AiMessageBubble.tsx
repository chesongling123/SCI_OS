import { Loader2, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolCallIndicator } from './ToolCallIndicator';
import type { ChatMessage } from '../types/ai.types';

interface AiMessageBubbleProps {
  message: ChatMessage;
}

/**
 * AI 消息气泡组件（微信风格改造版）
 * 用户消息：右侧，渐变背景，带头像
 * AI 消息：左侧，玻璃态背景，带头像
 */
export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isStreaming = message.status === 'streaming';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {/* AI 头像（左侧） */}
      {!isUser && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
          style={{
            background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className="max-w-[75%] space-y-1">
        {/* 消息气泡 */}
        <div
          className="rounded-2xl px-4 py-2.5"
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
                  color: 'white',
                  borderBottomRightRadius: '6px',
                }
              : {
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px) saturate(1.2)',
                  WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-inset), var(--glass-shadow)',
                  color: 'var(--text-on-glass)',
                  borderBottomLeftRadius: '6px',
                }
          }
        >
          {/* 内容渲染 */}
          {isUser || isStreaming ? (
            // 用户消息 / AI 流式中：纯文本（避免不完整 Markdown 闪烁）
            <p
              className={`whitespace-pre-wrap text-sm leading-relaxed ${
                isError ? 'text-red-400' : ''
              }`}
            >
              {message.content || (isStreaming ? '' : '…')}
            </p>
          ) : (
            // AI 已完成消息：Markdown 渲染
            <div className="ai-markdown text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || '…'}
              </ReactMarkdown>
            </div>
          )}

          {/* 流式状态指示器 */}
          {isStreaming && !message.content && (
            <div className="flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                思考中…
              </span>
            </div>
          )}
        </div>

        {/* 工具调用可视化（仅 AI 消息） */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallIndicator calls={message.toolCalls} />
        )}

        {/* 时间戳 */}
        <div
          className={`text-[10px] px-1 ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: 'var(--text-muted)', opacity: 0.7 }}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>

      {/* 用户头像（右侧） */}
      {isUser && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
          style={{
            background: 'oklch(0.55 0.08 60 / 0.2)',
            border: '1px solid oklch(0.55 0.08 60 / 0.3)',
          }}
        >
          <User className="w-3.5 h-3.5" style={{ color: 'oklch(0.6 0.1 60)' }} />
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
