import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolCallIndicator } from './ToolCallIndicator';
import type { ChatMessage } from '../types/ai.types';

interface AiMessageBubbleProps {
  message: ChatMessage;
}

/**
 * AI 消息气泡组件
 * 用户消息右对齐纯文本，AI 消息左对齐支持 Markdown 渲染
 */
export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isStreaming = message.status === 'streaming';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] space-y-1.5">
        {/* 消息气泡 */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'text-white'
              : 'text-foreground'
          }`}
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
                }
              : {
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px) saturate(1.2)',
                  WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-inset), var(--glass-shadow)',
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
        <div className={`text-[10px] px-1 ${isUser ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
