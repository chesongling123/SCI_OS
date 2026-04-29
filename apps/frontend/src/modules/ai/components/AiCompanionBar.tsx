import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Sparkles, Mic, X, ChevronUp, History } from 'lucide-react';
import { AiChatPanel } from './AiChatPanel';
import { useAiChat } from '../hooks/useAiChat';

/**
 * AI 伴随式输入条
 * 常驻屏幕底部居中，类似聊天软件输入框
 * 点击展开对话面板，对话也是浮动显示
 */
export function AiCompanionBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // 使用轻量版 hook（不依赖对话列表）
  const { messages, isStreaming, sendMessage, cancel, clear } = useAiChat();

  // 监听全局打开事件（来自 ProactiveToast 等）
  useEffect(() => {
    const handleOpen = () => {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, []);

  // Escape 收起
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
      // Cmd/Ctrl + Shift + A 快速唤起
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
        if (!isExpanded) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // 展开时自动聚焦
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isStreaming) return;
      const text = input.trim();
      setInput('');
      // 如果还没展开，先展开
      if (!isExpanded) {
        setIsExpanded(true);
      }
      await sendMessage(text);
    },
    [input, isStreaming, isExpanded, sendMessage]
  );

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    setIsFocused(false);
  }, []);

  const handleNewChat = useCallback(() => {
    clear();
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [clear]);

  // 占位符动态文案
  const placeholders = [
    '有什么可以帮你的？',
    '问我关于任务、日程、文献的问题…',
    '需要总结这篇文献吗？',
    '今天专注了多久？',
    '帮我安排下周计划…',
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* 遮罩层 — 点击收起 */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[60] transition-opacity duration-300"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={handleClose}
        />
      )}

      {/* 对话面板 — 从底部向上展开 */}
      {isExpanded && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] w-full max-w-2xl px-4"
          style={{ animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <AiChatPanel
            onClose={handleClose}
            embeddedMessages={messages}
            embeddedIsStreaming={isStreaming}
            embeddedOnSend={(text) => sendMessage(text)}
            embeddedOnCancel={cancel}
          />
        </div>
      )}

      {/* 底部输入条 — 始终常驻 */}
      <div
        ref={barRef}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] w-full max-w-2xl px-4"
      >
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-2xl transition-all duration-300"
          style={{
            background: isFocused || isExpanded
              ? 'var(--glass-bg)'
              : 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: `1px solid ${isFocused || isExpanded ? 'var(--glass-border-highlight)' : 'var(--glass-border)'}`,
            boxShadow: isFocused || isExpanded
              ? 'var(--glass-shadow-strong), 0 0 0 1px oklch(0.52 0.18 260 / 0.15)'
              : 'var(--glass-shadow)',
            transform: isFocused || isExpanded ? 'translateY(-2px)' : 'translateY(0)',
          }}
        >
          {/* 左侧：AI 图标 / 新对话 */}
          <button
            onClick={handleNewChat}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
            style={{
              background: isExpanded
                ? 'oklch(0.52 0.18 260 / 0.15)'
                : 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
            }}
            title="新对话"
          >
            {isExpanded ? (
              <Sparkles className="w-4 h-4" style={{ color: 'oklch(0.72 0.12 260)' }} />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </button>

          {/* 输入框 */}
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  setIsFocused(true);
                  if (!isExpanded) setIsExpanded(true);
                }}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholders[placeholderIndex]}
                disabled={isStreaming}
                className="w-full bg-transparent outline-none text-sm py-2 px-1"
                style={{
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-1">
              {/* 语音按钮（占位） */}
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
                title="语音输入（即将上线）"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* 发送 / 停止按钮 */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={cancel}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90"
                  style={{ background: 'oklch(0.55 0.15 25)' }}
                  title="停止生成"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-30"
                  style={{
                    background: input.trim()
                      ? 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))'
                      : 'oklch(0.52 0.18 260 / 0.3)',
                  }}
                  title="发送"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}

              {/* 展开/收起按钮（当有对话内容时显示） */}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}
                  title={isExpanded ? '收起对话' : '展开对话'}
                >
                  {isExpanded ? <X className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 快捷提示条 — 未展开且未输入时显示 */}
        {!isExpanded && !input && !isFocused && (
          <div
            className="flex justify-center mt-2 gap-2"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          >
            {['总结文献', '查看任务', '番茄钟统计', '安排日程'].map((tip) => (
              <button
                key={tip}
                onClick={() => {
                  setInput(tip);
                  setIsExpanded(true);
                }}
                className="px-3 py-1 rounded-full text-[11px] transition-all hover:scale-105"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-muted)',
                  boxShadow: 'var(--glass-shadow)',
                }}
              >
                {tip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
