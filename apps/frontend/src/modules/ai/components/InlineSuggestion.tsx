import { Zap, AlertTriangle, Coffee, BookOpen, Sunrise, TrendingUp, X, Check } from 'lucide-react';
import { useProactiveStore } from '../../../stores/proactive';

const typeIcons: Record<string, React.ElementType> = {
  focus_reminder: Zap,
  deadline_warning: AlertTriangle,
  break_suggestion: Coffee,
  reading_recommendation: BookOpen,
  daily_brief: Sunrise,
  pattern_insight: TrendingUp,
};

const typeLabels: Record<string, string> = {
  focus_reminder: '专注提醒',
  deadline_warning: '截止预警',
  break_suggestion: '休息建议',
  reading_recommendation: '文献推荐',
  daily_brief: '每日简报',
  pattern_insight: '行为洞察',
};

/**
 * AI 面板内联建议卡片
 * 显示在消息列表顶部，当用户正在 AI 面板时提供上下文建议
 */
export function InlineSuggestion() {
  const { suggestions, submitFeedback, removeLocal } = useProactiveStore();

  if (suggestions.length === 0) return null;

  const suggestion = suggestions[0];
  const Icon = typeIcons[suggestion.type] ?? Zap;

  const handleAccept = () => {
    submitFeedback(suggestion.id, 'accepted');
    removeLocal(suggestion.id);
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
      className="mx-4 mt-3 rounded-xl p-3"
      style={{
        background: 'oklch(0.52 0.18 260 / 0.06)',
        border: '1px solid oklch(0.52 0.18 260 / 0.15)',
      }}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'oklch(0.52 0.18 260)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.52 0.18 260 / 0.12)', color: 'oklch(0.52 0.18 260)' }}>
              {typeLabels[suggestion.type] ?? '建议'}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {suggestion.title}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {suggestion.content}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {suggestion.actionType !== 'dismiss' && (
              <button
                onClick={handleAccept}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'oklch(0.52 0.18 260)' }}
              >
                <Check className="w-3 h-3" />
                采纳
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all"
              style={{
                background: 'var(--glass-bg-hover)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
              }}
            >
              <X className="w-3 h-3" />
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
