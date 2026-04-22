import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateEventDto, UpdateEventDto, EventResponseDto } from '@phd/shared-types';
import { authHeaders } from '../lib/api';

const API_BASE = '/api/v1/calendar/events';

// 获取事件列表（支持时间范围）
export function useEvents(startFrom?: string, startTo?: string) {
  const params = new URLSearchParams();
  if (startFrom) params.append('startFrom', startFrom);
  if (startTo) params.append('startTo', startTo);
  const qs = params.toString();

  return useQuery<EventResponseDto[]>({
    queryKey: ['events', startFrom, startTo],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${qs ? '?' + qs : ''}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取事件列表失败');
      return res.json();
    },
  });
}

// 创建事件
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation<EventResponseDto, Error, CreateEventDto>({
    mutationFn: async (dto) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('创建事件失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// 更新事件
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation<EventResponseDto, Error, { id: string; dto: UpdateEventDto }>({
    mutationFn: async ({ id, dto }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('更新事件失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// 删除事件
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders(false) });
      if (!res.ok) throw new Error('删除事件失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
