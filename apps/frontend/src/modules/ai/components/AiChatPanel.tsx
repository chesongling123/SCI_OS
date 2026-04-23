import { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAiChat } from '../hooks/useAiChat';
import { useAiStatus } from '../hooks/useAiStatus';
import { AiMessageBubble } from './AiMessageBubble';

interface AiChatPanelProps {
  onClose?: () => void;
}

/**
 * AI 聊天面板主体
 * 液态玻璃风格，包含消息列表和输入区
 */
export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const { status: aiStatus, check: recheckAi } = useAiStatus();
  const aiAvailable = aiStatus === 'available';
  const {
    messages,
    isStreaming,
    sendMessage,
    cancel,
    useMock,
    resetMock,
  } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI 服务恢复后，尝试重置 mock 状态
  useEffect(() => {
    if (aiAvailable && useMock) {
      resetMock();
    }
  }, [aiAvailable, useMock, resetMock]);

  // 新消息时自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // 面板打开时聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const handleExampleClick = (text: string) => {
    if (isStreaming) return;
    sendMessage(text);
  };

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        width: '400px',
        height: '600px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid var(--glass-border)',
        borderTopColor: 'var(--glass-border-highlight)',
        boxShadow: 'var(--glass-inset), var(--glass-shadow-strong)',
      }}
    >
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
            style={{
              background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              PhD_AI 助手
            </h3>
            <div className="flex items-center gap-1.5">
              {aiStatus === 'checking' && (
                <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  检测中…
                </span>
              )}
              {aiAvailable && !useMock && (
                <span className="text-[10px] flex items-center gap-0.5 text-green-500">
                  <Wifi className="w-2.5 h-2.5" />
                  AI 在线
                </span>
              )}
              {(!aiAvailable || useMock) && (
                <span className="text-[10px] flex items-center gap-0.5 text-amber-500">
                  <WifiOff className="w-2.5 h-2.5" />
                  本地模拟模式
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {aiStatus === 'unavailable' && (
            <button
              onClick={recheckAi}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
              title="重新检测 AI 服务"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
            >
              收起
            </button>
          )}
        </div>
      </div>

      {/* AI 离线提示 Banner */}
      {aiStatus === 'unavailable' && (
        <div
          className="mx-4 mt-3 px-3 py-2.5 rounded-xl text-xs"
          style={{
            background: 'oklch(0.3 0.02 80 / 0.15)',
            border: '1px solid oklch(0.5 0.05 80 / 0.2)',
            color: 'oklch(0.7 0.03 80)',
          }}
        >
          <p className="font-medium mb-1">🔧 AI 服务暂不可用</p>
          <p className="opacity-80 mb-1.5">
            当前为本地模拟模式，AI 回复是预设的示例内容。
          </p>
          <p className="opacity-70">
            配置 AI API Key 后可获得真实 AI 能力：
          </p>
          <ol className="list-decimal list-inside opacity-70 space-y-0.5 mt-0.5 ml-0.5">
            <li>在 apps/backend/.env 中设置 KIMI_CODING_API_KEY</li>
            <li>重启后端服务</li>
          </ol>
          <p className="opacity-60 mt-1.5">
            配置完成后点击上方 ⟳ 按钮重新检测。
          </p>
        </div>
      )}

      {/* 消息列表区 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
              }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                PhD_AI 科研助手
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                直连 LLM · 本地优先
              </p>
            </div>

            {/* 快捷示例 */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                试试这样问我
              </p>
              {[
                '我今天专注了多久？',
                '我还有哪些待办任务？',
                '帮我安排下周的计划',
              ].map((text) => (
                <button
                  key={text}
                  onClick={() => handleExampleClick(text)}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <AiMessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={scrollRef} />
      </div>

      {/* 输入区 */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题，或 / 查看快捷命令…"
            disabled={isStreaming}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-colors disabled:opacity-60"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--glass-inset)',
            }}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={cancel}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 shrink-0"
              style={{ background: 'oklch(0.55 0.15 25)' }}
              title="取消"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
              style={{
                background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
              }}
              title="发送"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
