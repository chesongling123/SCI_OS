import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { TaskResponseDto } from '@phd/shared-types';
import { TaskStatus } from '@phd/shared-types';
import TaskCard from './TaskCard';
import type { MoveTaskDto } from '@phd/shared-types';

interface TaskBoardProps {
  tasks: TaskResponseDto[];
  onMove: (id: string, dto: MoveTaskDto) => void;
  onDelete: (id: string) => void;
  onCreate: (status: TaskStatus) => void;
  onEdit: (task: TaskResponseDto) => void;
}

const columns: { id: TaskStatus; title: string }[] = [
  { id: TaskStatus.TODO, title: '待办' },
  { id: TaskStatus.IN_PROGRESS, title: '进行中' },
  { id: TaskStatus.DONE, title: '已完成' },
];

export default function TaskBoard({ tasks, onMove, onDelete, onCreate, onEdit }: TaskBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // 按状态分组
  const grouped = useMemo(() => {
    const map: Record<string, TaskResponseDto[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.DONE]: [],
    };
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    // 每组内按 sortOrder 排序
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId) ?? null,
    [activeId, tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // 查找目标列
    let targetStatus: TaskStatus | null = null;
    let targetIndex = -1;

    for (const col of columns) {
      if (overId === col.id) {
        // 拖到了列头（空列或列底部）
        targetStatus = col.id;
        targetIndex = grouped[col.id].length;
        break;
      }
      const idx = grouped[col.id].findIndex((t) => t.id === overId);
      if (idx !== -1) {
        targetStatus = col.id;
        targetIndex = idx;
        break;
      }
    }

    if (!targetStatus) return;

    const draggedTask = tasks.find((t) => t.id === activeTaskId);
    if (!draggedTask) return;

    // 计算新的 sortOrder
    const targetList = grouped[targetStatus];
    let newSortOrder: number;

    if (targetList.length === 0) {
      newSortOrder = 0;
    } else if (targetIndex === 0) {
      newSortOrder = targetList[0].sortOrder - 1;
    } else if (targetIndex >= targetList.length) {
      newSortOrder = targetList[targetList.length - 1].sortOrder + 1;
    } else {
      newSortOrder = (targetList[targetIndex - 1].sortOrder + targetList[targetIndex].sortOrder) / 2;
    }

    // 如果同列同位置，不触发更新
    if (draggedTask.status === targetStatus) {
      const currentIdx = targetList.findIndex((t) => t.id === activeTaskId);
      if (currentIdx === targetIndex || currentIdx + 1 === targetIndex) return;
    }

    onMove(activeTaskId, { status: targetStatus, sortOrder: newSortOrder });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={grouped[col.id]}
            onDelete={onDelete}
            onEdit={onEdit}
            onCreate={() => onCreate(col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} onDelete={() => {}} onEdit={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// 单列组件
function Column({
  column,
  tasks,
  onDelete,
  onEdit,
  onCreate,
}: {
  column: { id: TaskStatus; title: string };
  tasks: TaskResponseDto[];
  onDelete: (id: string) => void;
  onEdit: (task: TaskResponseDto) => void;
  onCreate: () => void;
}) {
  return (
    <div
      className="flex flex-col rounded-2xl p-3 min-h-[300px]"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {/* 列头 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.title}</h3>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: 'var(--glass-bg-hover)',
              color: 'var(--text-muted)',
            }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onCreate}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 任务列表 */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 flex-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDelete} onEdit={onEdit} />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-8 rounded-xl border border-dashed"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              拖拽任务到此处
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
