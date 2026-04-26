import { MessageSquare } from 'lucide-react';
import { useAiConversations } from '../../ai/hooks/useAiConversations';
import { DashboardCard, LoadingSkeleton, EmptyState } from './TodayTimeline';

/**
 * 格式化相对时间
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function RecentConversations() {
  const { data: conversations, isLoading } = useAiConversations();
  const recent = conversations?.slice(0, 3) ?? [];

  return (
    <DashboardCard title="最近对话" icon={<MessageSquare className="w-4 h-4" />}>
      {isLoading ? (
        <LoadingSkeleton count={2} />
      ) : recent.length === 0 ? (
        <EmptyState message="与 AI 助手开始对话" emoji="🤖" />
      ) : (
        <div className="space-y-1">
          {recent.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-150 hover:bg-white/5"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'oklch(0.52 0.18 260 / 0.15)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" style={{ color: 'oklch(0.52 0.18 260)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {conv.title || '新对话'}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {relativeTime(conv.updatedAt)}
                  </span>
                  {conv.messageCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'var(--glass-bg-hover)' }}>
                      {conv.messageCount} 条消息
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
