import { useState, useCallback, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AiChatPanel } from './AiChatPanel';

/**
 * AI 聊天浮动按钮
 * 固定在右下角，点击展开/收起聊天面板
 */
export function AiChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 按 Escape 键关闭面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* 聊天面板（浮层） */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <AiChatPanel onClose={close} />
        </div>
      )}

      {/* 浮动按钮 */}
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: isOpen
            ? 'oklch(0.4 0.02 60)'
            : 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
          boxShadow: 'var(--glass-shadow-strong)',
        }}
        title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {/* 滑入动画 */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
