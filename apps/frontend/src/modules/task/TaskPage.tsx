import { useState } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import { TaskStatus } from '@phd/shared-types';
import type { CreateTaskDto, MoveTaskDto, TaskResponseDto } from '@phd/shared-types';
import { useTasks, useCreateTask, useUpdateTask, useMoveTask, useDeleteTask } from '../../hooks/useTasks';
import TaskBoard from './TaskBoard';
import TaskDialog from './TaskDialog';

/**
 * 任务看板页面（Phase 1）
 * 基于 @dnd-kit 的三列拖拽看板：待办 / 进行中 / 已完成
 */
export default function TaskPage() {
  const { data: tasks, isLoading, error } = useTasks();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const moveMutation = useMoveTask();
  const deleteMutation = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [editTask, setEditTask] = useState<TaskResponseDto | null>(null);

  const handleCreate = (status: TaskStatus) => {
    setEditTask(null);
    setDialogStatus(status);
    setDialogOpen(true);
  };

  const handleEdit = (task: TaskResponseDto) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleCreateSubmit = (dto: CreateTaskDto) => {
    createMutation.mutate(dto);
  };

  const handleUpdateSubmit = (id: string, dto: Parameters<typeof updateMutation.mutate>[0]['dto']) => {
    updateMutation.mutate({ id, dto });
  };

  const handleMove = (id: string, dto: MoveTaskDto) => {
    moveMutation.mutate({ id, dto });
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        加载任务失败：{error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任务看板</h1>
          <p className="text-muted-foreground text-sm mt-1">
            GTD 三级任务结构，支持拖拽排序与番茄数关联
          </p>
        </div>
        <button
          onClick={() => handleCreate(TaskStatus.TODO)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{
            background: 'oklch(0.28 0.02 60)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset',
          }}
        >
          <CheckSquare className="w-4 h-4" />
          新建任务
        </button>
      </div>

      {/* 看板 */}
      <TaskBoard
        tasks={tasks ?? []}
        onMove={handleMove}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      {/* 创建/编辑弹窗 */}
      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTask(null); }}
        onCreate={handleCreateSubmit}
        onUpdate={handleUpdateSubmit}
        initialStatus={dialogStatus}
        editTask={editTask}
      />
    </div>
  );
}
