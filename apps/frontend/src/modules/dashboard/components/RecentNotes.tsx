import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useNotes } from '../../../hooks/useNotes';
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

export function RecentNotes() {
  const { data: notes, isLoading } = useNotes();
  const recentNotes = notes?.slice(0, 4) ?? [];

  return (
    <DashboardCard title="最近笔记" icon={<FileText className="w-4 h-4" />} href="/notes">
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : recentNotes.length === 0 ? (
        <EmptyState message="还没有笔记" emoji="✍️" action={{ label: '写一条', href: '/notes' }} />
      ) : (
        <div className="space-y-1">
          {recentNotes.map((note) => (
            <Link
              key={note.id}
              to="/notes"
              className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-150 hover:bg-white/5 group"
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: note.isPinned ? 'oklch(0.55 0.15 45)' : 'var(--glass-border)',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {note.title || '无标题'}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {note.folderName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'var(--glass-bg-hover)' }}>
                      {note.folderName}
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {relativeTime(note.updatedAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
