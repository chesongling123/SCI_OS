import { create } from 'zustand';
import { authHeaders } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface ProactiveSuggestion {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  actionType: string;
  actionPayload: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

interface ProactiveState {
  suggestions: ProactiveSuggestion[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchPending: () => Promise<void>;
  submitFeedback: (id: string, action: 'accepted' | 'dismissed' | 'snoozed') => Promise<void>;
  dismissAll: () => Promise<void>;
  removeLocal: (id: string) => void;
}

export const useProactiveStore = create<ProactiveState>((set, get) => ({
  suggestions: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchPending: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/suggestions`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('获取建议失败');
      const json = await res.json();
      const list: ProactiveSuggestion[] = json.data ?? [];
      set({ suggestions: list, unreadCount: list.length, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  submitFeedback: async (id, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/suggestions/${id}/feedback`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('反馈提交失败');
      // 本地移除
      get().removeLocal(id);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  dismissAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/suggestions/dismiss-all`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('一键忽略失败');
      set({ suggestions: [], unreadCount: 0 });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removeLocal: (id) => {
    const next = get().suggestions.filter((s) => s.id !== id);
    set({ suggestions: next, unreadCount: next.length });
  },
}));
