import { useEffect } from 'react';
import { Sunrise, Check, X, Zap, AlertTriangle, Coffee, BookOpen, TrendingUp } from 'lucide-react';
import { useProactiveStore } from '../../../stores/proactive';

const typeIcons: Record<string, React.ElementType> = {
  focus_reminder: Zap,
  deadline_warning: AlertTriangle,
  break_suggestion: Coffee,
  reading_recommendation: BookOpen,
  daily_brief: Sunrise,
  pattern_insight: TrendingUp,
};

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

/**
 * 每日简报 / 主动建议 Widget
 * 展示最新的一条高优先级建议，或 daily_brief 类型建议
 */
export function DailyBriefWidget() {
  const { suggestions, fetchPending, submitFeedback, removeLocal } = useProactiveStore();

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // 优先显示 daily_brief，其次按优先级排序
  const suggestion =
    suggestions.find((s) => s.type === 'daily_brief') ?? suggestions[0];

  if (!suggestion) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sunrise className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            今日简报
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          暂无新的主动建议，AI 正在观察你的工作节律…
        </p>
      </div>
    );
  }

  const Icon = typeIcons[suggestion.type] ?? Zap;
  const color = priorityColors[suggestion.priority] ?? priorityColors.low;

  const handleAccept = () => {
    submitFeedback(suggestion.id, 'accepted');
    // 执行动作
    if (suggestion.actionType === 'navigate') {
      const path = (suggestion.actionPayload?.path as string) ?? '/';
      window.location.href = path;
    } else if (suggestion.actionType === 'start_pomodoro') {
      window.location.href = '/pomodoro';
    }
  };

  const handleDismiss = () => {
    submitFeedback(suggestion.id, 'dismissed');
    removeLocal(suggestion.id);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {/* 顶部色条 */}
      <div className="h-1 w-full" style={{ background: color }} />

      <div className="p-4">
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {suggestion.title}
            </div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {suggestion.content}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 mt-3">
          {suggestion.actionType !== 'dismiss' && (
            <button
              onClick={handleAccept}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'oklch(0.52 0.18 260)' }}
            >
              <Check className="w-3 h-3" />
              {suggestion.actionType === 'start_pomodoro'
                ? '开始专注'
                : suggestion.actionType === 'navigate'
                ? '前往查看'
                : '采纳'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'var(--glass-bg-hover)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <X className="w-3 h-3" />
            忽略
          </button>
        </div>
      </div>
    </div>
  );
}
