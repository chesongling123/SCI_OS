import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Zap, AlertTriangle, Coffee, BookOpen, Sunrise, TrendingUp } from 'lucide-react';
import { useProactiveStore, type ProactiveSuggestion } from '../../../stores/proactive';

/**
 * 建议类型 → 图标映射
 */
const typeIcons: Record<string, React.ElementType> = {
  focus_reminder: Zap,
  deadline_warning: AlertTriangle,
  break_suggestion: Coffee,
  reading_recommendation: BookOpen,
  daily_brief: Sunrise,
  pattern_insight: TrendingUp,
};

/**
 * 优先级 → 颜色
 */
const priorityColors: Record<string, { border: string; bg: string }> = {
  high: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  medium: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  low: { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
};

/**
 * 执行建议动作
 */
function executeAction(suggestion: ProactiveSuggestion) {
  const { actionType, actionPayload } = suggestion;
  switch (actionType) {
    case 'navigate': {
      const path = (actionPayload?.path as string) ?? '/';
      window.location.href = path;
      break;
    }
    case 'start_pomodoro': {
      window.location.href = '/pomodoro';
      break;
    }
    case 'open_reference': {
      const refId = actionPayload?.referenceId as string;
      if (refId) window.location.href = `/references/${refId}/read`;
      break;
    }
    case 'open_chat': {
      // 触发 AI 面板打开（通过自定义事件）
      window.dispatchEvent(new CustomEvent('open-ai-chat'));
      break;
    }
    default:
      break;
  }
}

/**
 * 单条建议 Toast 卡片
 */
function ToastItem({
  suggestion,
  onDismiss,
}: {
  suggestion: ProactiveSuggestion;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { submitFeedback } = useProactiveStore();

  const color = priorityColors[suggestion.priority] ?? priorityColors.low;
  const Icon = typeIcons[suggestion.type] ?? Zap;

  // 入场动画 + 自动消失
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      if (!hovered) handleDismiss('ignored');
    }, 10000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hovered]);

  const handleDismiss = useCallback(
    (action: 'dismissed' | 'ignored') => {
      setVisible(false);
      setTimeout(() => {
        onDismiss();
        if (action === 'dismissed') {
          submitFeedback(suggestion.id, 'dismissed');
        }
      }, 300);
    },
    [suggestion.id, onDismiss, submitFeedback],
  );

  const handleAccept = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onDismiss();
      submitFeedback(suggestion.id, 'accepted');
      executeAction(suggestion);
    }, 300);
  }, [suggestion, onDismiss, submitFeedback]);

  return (
    <div
      className="relative w-80 rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 左侧优先级色条 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: color.border }}
      />

      <div className="p-4 pl-5">
        {/* 头部：图标 + 标题 + 关闭 */}
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color.bg }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: color.border }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              {suggestion.title}
            </div>
          </div>
          <button
            onClick={() => handleDismiss('dismissed')}
            className="flex-shrink-0 p-0.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 正文 */}
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {suggestion.content}
        </p>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 mt-3">
          {suggestion.actionType !== 'dismiss' && (
            <button
              onClick={handleAccept}
              className="px-3 py-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'oklch(0.52 0.18 260)' }}
            >
              {suggestion.actionType === 'start_pomodoro'
                ? '开始专注'
                : suggestion.actionType === 'navigate'
                ? '前往查看'
                : '采纳'}
            </button>
          )}
          <button
            onClick={() => handleDismiss('dismissed')}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'var(--glass-bg-hover)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            忽略
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 主动建议 Toast 容器
 * 固定右上角，堆叠显示多条建议
 */
export function ProactiveToast() {
  const { suggestions, fetchPending, dismissAll } = useProactiveStore();

  // 只显示前 3 条，避免刷屏
  const visible = suggestions.slice(0, 3);

  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {visible.map((s) => (
          <ToastItem
            key={s.id}
            suggestion={s}
            onDismiss={() => {
              useProactiveStore.getState().removeLocal(s.id);
            }}
          />
        ))}
      </div>

      {/* 批量操作（当有多条时显示） */}
      {suggestions.length > 3 && (
        <div
          className="w-80 rounded-xl px-4 py-2 text-xs text-center cursor-pointer transition-all pointer-events-auto"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
          }}
          onClick={dismissAll}
        >
          还有 {suggestions.length - 3} 条建议 — 全部忽略
        </div>
      )}
    </div>
  );
}

export default ProactiveToast;
