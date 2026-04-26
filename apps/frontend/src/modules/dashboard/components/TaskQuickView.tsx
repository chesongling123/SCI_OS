import { Link } from 'react-router-dom';
import { CheckSquare, ArrowRight } from 'lucide-react';
import { useTasks, useUpdateTask } from '../../../hooks/useTasks';
import { TaskStatus } from '@research/shared-types';
import type { TaskResponseDto } from '@research/shared-types';
import { DashboardCard, LoadingSkeleton, EmptyState } from './TodayTimeline';

/**
 * 优先级映射：数字 → 标签 + 颜色
 */
const PRIORITY_META: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: 'oklch(0.55 0.15 25)' },
  2: { label: 'P2', color: 'oklch(0.6 0.1 55)' },
  3: { label: 'P3', color: 'oklch(0.55 0.08 145)' },
  4: { label: 'P4', color: 'var(--text-muted)' },
};

/**
 * 按优先级排序任务（P1 在前）
 */
function sortByPriority(tasks: TaskResponseDto[]): TaskResponseDto[] {
  return [...tasks].sort((a, b) => a.priority - b.priority);
}

export function TaskQuickView() {
  const { data: todoTasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();

  // 过滤未完成的任务（TODO + IN_PROGRESS）
  const incompleteTasks = todoTasks?.filter(
    (t) => t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS
  );

  const displayTasks = incompleteTasks ? sortByPriority(incompleteTasks).slice(0, 5) : [];

  const handleCheck = (taskId: string) => {
    updateTask.mutate({ id: taskId, dto: { status: TaskStatus.DONE } });
  };

  return (
    <DashboardCard title="待办快览" icon={<CheckSquare className="w-4 h-4" />} href="/tasks">
      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : displayTasks.length === 0 ? (
        <EmptyState
          message="所有任务都已完成 🎉"
          emoji="✅"
          action={{ label: '新建任务', href: '/tasks' }}
        />
      ) : (
        <div className="space-y-1">
          {displayTasks.map((task) => {
            const priority = PRIORITY_META[task.priority] || PRIORITY_META[4];
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 p-1.5 rounded-lg transition-colors duration-150 hover:bg-white/5 group"
              >
                <button
                  onClick={() => handleCheck(task.id)}
                  className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 hover:scale-110"
                  style={{
                    borderColor: priority.color,
                    background: 'transparent',
                  }}
                  title="标记为已完成"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: priority.color }}
                  />
                </button>

                <Link
                  to="/tasks"
                  className="flex-1 min-w-0 text-sm truncate transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  title={task.title}
                >
                  {task.title}
                </Link>

                <span
                  className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: priority.color,
                    background: `${priority.color}15`,
                  }}
                >
                  {priority.label}
                </span>
              </div>
            );
          })}

          {(incompleteTasks?.length ?? 0) > 5 && (
            <Link
              to="/tasks"
              className="flex items-center justify-center gap-1 text-xs py-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              还有 {incompleteTasks!.length - 5} 个待办
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
