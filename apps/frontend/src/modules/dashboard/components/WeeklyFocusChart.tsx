import { Timer } from 'lucide-react';
import { useDailyStats } from '../../../hooks/usePomodoro';
import { DashboardCard, LoadingSkeleton, EmptyState } from './TodayTimeline';

/**
 * 格式化秒数为分钟数
 */
function toMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * 获取最近7天的日期标签（一/二/三...）
 */
function getLast7Days(): string[] {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  const result: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(labels[d.getDay()]);
  }
  return result;
}

/**
 * 获取最近7天的日期字符串 YYYY-MM-DD
 */
function getLast7Dates(): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

export function WeeklyFocusChart() {
  const { data: dailyStats, isLoading } = useDailyStats(7);
  const dayLabels = getLast7Days();
  const dayDates = getLast7Dates();

  // 将后端数据映射到最近7天
  const dataMap = new Map<string, number>();
  dailyStats?.forEach((d) => {
    dataMap.set(d.date, d.totalDuration);
  });

  const chartData = dayDates.map((date) => ({
    date,
    label: dayLabels[dayDates.indexOf(date)],
    duration: dataMap.get(date) ?? 0,
  }));

  const maxDuration = Math.max(...chartData.map((d) => d.duration), 1);
  const hasAnyData = chartData.some((d) => d.duration > 0);

  return (
    <DashboardCard title="本周专注" icon={<Timer className="w-4 h-4" />} href="/pomodoro">
      {isLoading ? (
        <LoadingSkeleton count={2} />
      ) : !hasAnyData ? (
        <EmptyState message="本周还没有专注记录" emoji="📊" action={{ label: '去专注', href: '/pomodoro' }} />
      ) : (
        <div className="pt-2">
          <div className="flex items-end gap-1 h-20 px-1">
            {chartData.map((item, idx) => {
              const heightPercent = Math.max((item.duration / maxDuration) * 100, 4);
              const isToday = idx === 6;
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full rounded-md transition-all duration-300 relative"
                    style={{
                      height: `${heightPercent}%`,
                      background: isToday
                        ? 'oklch(0.52 0.18 260 / 0.6)'
                        : 'oklch(0.52 0.18 260 / 0.25)',
                      minHeight: '4px',
                    }}
                  >
                    {/* Hover tooltip */}
                    <div
                      className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: 'var(--glass-bg-hover)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {toMinutes(item.duration)} 分钟
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: isToday ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
