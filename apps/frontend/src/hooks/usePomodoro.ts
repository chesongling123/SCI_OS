import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePomodoroDto,
  EndPomodoroDto,
  PomodoroSessionResponseDto,
  PomodoroStatsDto,
} from '@phd/shared-types';

const API_BASE = '/api/v1/pomodoro';

// 开始番茄钟会话
export function useCreatePomodoroSession() {
  const queryClient = useQueryClient();
  return useMutation<PomodoroSessionResponseDto, Error, CreatePomodoroDto>({
    mutationFn: async (dto) => {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('开始番茄钟失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro'] });
    },
  });
}

// 结束番茄钟会话
export function useEndPomodoroSession() {
  const queryClient = useQueryClient();
  return useMutation<PomodoroSessionResponseDto, Error, { id: string; dto: EndPomodoroDto }>({
    mutationFn: async ({ id, dto }) => {
      const res = await fetch(`${API_BASE}/sessions/${id}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('结束番茄钟失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro'] });
    },
  });
}

// 获取今日统计
export function useTodayStats() {
  return useQuery<{
    totalDuration: number;
    completedCount: number;
    interruptionCount: number;
    sessions: PomodoroSessionResponseDto[];
  }>({
    queryKey: ['pomodoro', 'stats', 'today'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/stats/today`);
      if (!res.ok) throw new Error('获取今日统计失败');
      return res.json();
    },
  });
}

// 获取每日聚合统计（热力图数据）
export function useDailyStats(days = 365) {
  return useQuery<PomodoroStatsDto[]>({
    queryKey: ['pomodoro', 'stats', 'daily', days],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/stats/daily?days=${days}`);
      if (!res.ok) throw new Error('获取统计失败');
      return res.json();
    },
  });
}
