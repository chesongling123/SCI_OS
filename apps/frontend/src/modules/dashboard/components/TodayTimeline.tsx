import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plus } from 'lucide-react';
import { useEvents } from '../../../hooks/useEvents';
import type { EventResponseDto } from '@phd/shared-types';

/**
 * 获取今日日期范围（ISO 格式）
 */
function getTodayRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const start = `${year}-${month}-${day}T00:00:00.000Z`;
  const end = `${year}-${month}-${day}T23:59:59.999Z`;
  return { start, end };
}

/**
 * 格式化时间为 HH:MM
 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 按开始时间排序事件
 */
function sortByStartTime(events: EventResponseDto[]): EventResponseDto[] {
  return [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function TodayTimeline() {
  const { start, end } = getTodayRange();
  const { data: events, isLoading } = useEvents(start, end);

  const sortedEvents = events ? sortByStartTime(events) : [];

  return (
    <DashboardCard title="今日日程" icon={<Calendar className="w-4 h-4" />} href="/calendar">
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : sortedEvents.length === 0 ? (
        <EmptyState
          message="今日暂无日程"
          emoji="🌤"
          action={{ label: '去添加', href: '/calendar' }}
        />
      ) : (
        <div className="space-y-2">
          {sortedEvents.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2.5 p-2 rounded-lg transition-colors duration-150 hover:bg-white/5"
              style={{ borderLeft: `3px solid ${event.color || 'var(--glass-border)'}` }}
            >
              <div
                className="flex flex-col items-center min-w-[40px] pt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="text-sm font-medium tabular-nums">{formatTime(event.startAt)}</span>
                {event.endAt && (
                  <span className="text-xs tabular-nums opacity-60">{formatTime(event.endAt)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {event.title}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {sortedEvents.length > 5 && (
            <Link
              to="/calendar"
              className="block text-center text-xs py-1 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              还有 {sortedEvents.length - 5} 个事项 →
            </Link>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

/* ============================================
   通用子组件
   ============================================ */

export function DashboardCard({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}) {
  const header = (
    <div className="flex items-center gap-2 mb-2">
      {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
    </div>
  );

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        border: '1px solid var(--glass-border)',
        borderTopColor: 'var(--glass-border-highlight)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), var(--glass-shadow)',
      }}
    >
      {href ? (
        <Link to={href} className="block">
          {header}
        </Link>
      ) : (
        header
      )}
      {children}
    </div>
  );
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-12 h-4 rounded bg-white/10 animate-pulse" />
          <div className="flex-1 h-4 rounded bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  message,
  emoji,
  action,
}: {
  message: string;
  emoji: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="text-2xl mb-2">{emoji}</span>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {message}
      </span>
      {action && (
        <Link
          to={action.href}
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium transition-colors hover:underline"
          style={{ color: 'oklch(0.52 0.18 260)' }}
        >
          <Plus className="w-3 h-3" />
          {action.label}
        </Link>
      )}
    </div>
  );
}
