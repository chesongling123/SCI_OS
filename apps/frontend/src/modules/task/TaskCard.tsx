import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, FileText } from 'lucide-react';
import type { TaskResponseDto } from '@phd/shared-types';

interface TaskCardProps {
  task: TaskResponseDto;
  onDelete: (id: string) => void;
  onEdit?: (task: TaskResponseDto) => void;
}

const priorityColors: Record<number, string> = {
  1: 'oklch(0.55 0.15 25)',
  2: 'oklch(0.6 0.12 55)',
  3: 'oklch(0.55 0.1 230)',
  4: 'oklch(0.5 0.05 280)',
};

const priorityLabels: Record<number, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
};

export default function TaskCard({ task, onDelete, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className="group relative p-3 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
      {...attributes}
      style={{
        ...style,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderTopColor: 'var(--glass-border-highlight)',
        boxShadow: 'var(--glass-inset), var(--glass-shadow)',
      }}
      onClick={() => onEdit?.(task)}
    >
      {/* 优先级指示条 */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ background: priorityColors[task.priority] || priorityColors[4] }}
      />

      <div className="flex items-start gap-2 pl-2">
        {/* 拖拽手柄 — 只有这里显示 grab 光标并触发拖拽 */}
        <div
          {...listeners}
          className="shrink-0 p-0.5 -ml-1 rounded-md cursor-grab active:cursor-grabbing"
          style={{ opacity: 0.5 }}
        >
          <GripVertical className="w-4 h-4 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug break-words" style={{ color: 'var(--text-primary)' }}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{
                background: priorityColors[task.priority] || priorityColors[4],
                color: '#fff',
              }}
            >
              {priorityLabels[task.priority] || 'P4'}
            </span>
            {task.pomodoroCount > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                🍅 × {task.pomodoroCount}
              </span>
            )}
            {task.reference && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--glass-bg-hover)',
                  border: '1px solid var(--glass-border)',
                }}
                title={task.reference.title}
              >
                <FileText className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{task.reference.title}</span>
              </span>
            )}
          </div>
        </div>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 rounded-lg transition-all shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--destructive)';
            (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.55 0.15 25 / 0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
