import { Link } from 'react-router-dom';
import { Timer, Play } from 'lucide-react';
import { useTodayStats } from '../../../hooks/usePomodoro';
import { DashboardCard, LoadingSkeleton } from './TodayTimeline';

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

export function PomodoroMini() {
  const { data: stats, isLoading } = useTodayStats();

  return (
    <DashboardCard title="今日专注" icon={<Timer className="w-4 h-4" />} href="/pomodoro">
      {isLoading ? (
        <LoadingSkeleton count={2} />
      ) : !stats || stats.completedCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-3xl mb-2">⏱</span>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            今天还没有专注记录
          </p>
          <Link
            to="/pomodoro"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
              boxShadow: '0 4px 16px oklch(0.52 0.18 260 / 0.2)',
            }}
          >
            <Play className="w-3.5 h-3.5" />
            开始专注
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center py-1">
          <div
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {stats.completedCount}
            <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
              个番茄
            </span>
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            专注 {formatDuration(stats.totalDuration)}
          </div>
          {stats.interruptionCount > 0 && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              中断 {stats.interruptionCount} 次
            </div>
          )}
          <Link
            to="/pomodoro"
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
            style={{
              background: 'oklch(0.52 0.18 260 / 0.15)',
              border: '1px solid var(--glass-border)',
              color: 'oklch(0.52 0.18 260)',
            }}
          >
            <Play className="w-3 h-3" />
            继续专注
          </Link>
        </div>
      )}
    </DashboardCard>
  );
}
