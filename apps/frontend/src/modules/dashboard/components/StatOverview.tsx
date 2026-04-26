import { Link } from 'react-router-dom';
import { CheckSquare, Calendar, Timer, BookOpen } from 'lucide-react';
import { useTasks } from '../../../hooks/useTasks';
import { useEvents } from '../../../hooks/useEvents';
import { useTodayStats } from '../../../hooks/usePomodoro';
import { useReferences } from '../../../hooks/useReferences';
import { TaskStatus } from '@phd/shared-types';

/**
 * 格式化秒数为可读时长
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}小时${minutes}分钟`;
  if (hours > 0) return `${hours}小时`;
  return `${minutes}分钟`;
}

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

export function StatOverview() {
  const { start, end } = getTodayRange();

  const { data: allTasks } = useTasks();
  const { data: inProgressTasks } = useTasks(TaskStatus.IN_PROGRESS);
  const { data: todayEvents } = useEvents(start, end);
  const { data: pomodoroStats } = useTodayStats();
  const { data: readingRefs } = useReferences({ status: 'READING', limit: 1 });
  const { data: allRefs } = useReferences({ limit: 1 });

  const todoCount = allTasks?.filter((t) => t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS).length ?? 0;
  const inProgressCount = inProgressTasks?.length ?? 0;
  const eventCount = todayEvents?.length ?? 0;
  const focusDuration = pomodoroStats?.totalDuration ?? 0;
  const tomatoCount = pomodoroStats?.completedCount ?? 0;
  const hasReadingRefs = readingRefs?.hasMore || readingRefs?.data?.length;

  const stats = [
    {
      label: '待办',
      value: `${inProgressCount > 0 ? `${inProgressCount}/` : ''}${todoCount}`,
      sub: inProgressCount > 0 ? `${inProgressCount} 个进行中` : `${todoCount} 个待办`,
      icon: CheckSquare,
      href: '/tasks',
      color: 'oklch(0.55 0.12 145)',
    },
    {
      label: '今日日程',
      value: String(eventCount),
      sub: eventCount > 0 ? '个事项' : '暂无日程',
      icon: Calendar,
      href: '/calendar',
      color: 'oklch(0.55 0.12 260)',
    },
    {
      label: '今日专注',
      value: tomatoCount > 0 ? `${tomatoCount}个` : '—',
      sub: focusDuration > 0 ? formatDuration(focusDuration) : '还未开始',
      icon: Timer,
      href: '/pomodoro',
      color: 'oklch(0.55 0.12 45)',
    },
    {
      label: '文献',
      value: hasReadingRefs ? '阅读中' : '—',
      sub: allRefs?.data?.length ? `${allRefs.data.length} 篇文献` : '暂无文献',
      icon: BookOpen,
      href: '/references',
      color: 'oklch(0.55 0.12 300)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Link
            key={s.label}
            to={s.href}
            className="group p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(16px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
              border: '1px solid var(--glass-border)',
              borderTopColor: 'var(--glass-border-highlight)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), var(--glass-shadow)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: `${s.color}20`,
                  border: `1px solid ${s.color}30`,
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {s.sub}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
