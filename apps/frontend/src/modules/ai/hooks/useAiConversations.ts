import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authHeaders } from '../../../lib/api';

export interface ConversationItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    toolCalls?: unknown;
    createdAt: string;
  }>;
}

const API_BASE = '/api/v1/ai/conversations';

/**
 * 获取对话列表
 */
export function useAiConversations() {
  return useQuery<ConversationItem[]>({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const res = await fetch(API_BASE, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取对话列表失败');
      return res.json();
    },
  });
}

/**
 * 获取单个对话详情
 */
export function useAiConversation(id: string | null) {
  return useQuery<ConversationDetail>({
    queryKey: ['ai-conversation', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取对话详情失败');
      return res.json();
    },
    enabled: !!id,
  });
}

/**
 * 创建新对话
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation<ConversationItem, Error, string | undefined>({
    mutationFn: async (title) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('创建对话失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

/**
 * 删除对话
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error('删除对话失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

/**
 * 更新对话标题
 */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; title: string }>({
    mutationFn: async ({ id, title }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('更新标题失败');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', variables.id] });
    },
  });
}
