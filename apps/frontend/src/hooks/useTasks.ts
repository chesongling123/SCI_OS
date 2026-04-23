import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskStatus } from '@phd/shared-types';
import type { CreateTaskDto, UpdateTaskDto, MoveTaskDto, TaskResponseDto } from '@phd/shared-types';
import { authHeaders } from '../lib/api';

const API_BASE = '/api/v1/tasks';

// 获取任务列表
export function useTasks(status?: TaskStatus, referenceId?: string) {
  const searchParams = new URLSearchParams();
  if (status) searchParams.set('status', status);
  if (referenceId) searchParams.set('referenceId', referenceId);
  const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return useQuery<TaskResponseDto[]>({
    queryKey: ['tasks', status, referenceId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取任务列表失败');
      return res.json();
    },
  });
}

// 创建任务
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskResponseDto, Error, CreateTaskDto>({
    mutationFn: async (dto) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('创建任务失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// 更新任务
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskResponseDto, Error, { id: string; dto: UpdateTaskDto }>({
    mutationFn: async ({ id, dto }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('更新任务失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// 移动任务（拖拽）
export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskResponseDto, Error, { id: string; dto: MoveTaskDto }>({
    mutationFn: async ({ id, dto }) => {
      const res = await fetch(`${API_BASE}/${id}/move`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('移动任务失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// 删除任务
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders(false) });
      if (!res.ok) throw new Error('删除任务失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
