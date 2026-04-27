import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authHeaders } from '../lib/api';
import type { UserSettingsResponseDto, UpdateSettingsDto } from '@research/shared-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface SettingsState extends UserSettingsResponseDto {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (dto: UpdateSettingsDto) => Promise<void>;
  updateField: (key: keyof UpdateSettingsDto, value: unknown) => void;
}

const defaultSettings: Omit<SettingsState, 'fetchSettings' | 'updateSettings' | 'updateField' | 'isLoading' | 'isSaving' | 'error'> = {
  id: '',
  userId: '',
  theme: 'system',
  glassIntensity: 100,
  fontSize: 'medium',
  sidebarCollapsed: false,
  llmProvider: 'kimi',
  llmModel: 'k2p5',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: null,
  functionCalling: true,
  ragThreshold: 0.7,
  ragTopK: 5,
  streamingOutput: true,
  pomodoroFocus: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroAutoBreak: false,
  pomodoroAutoFocus: false,
  pomodoroDailyGoal: 8,
  weekStart: 'monday',
  defaultCalendarView: 'month',
  defaultReminder: 15,
  defaultCitationFormat: 'gb7714',
  desktopNotification: true,
  pomodoroSound: true,
  eventReminder: true,
  autoBackup: false,
  backupFrequency: 'weekly',
  proactiveSuggestions: true,
  proactiveFrequency: 'medium',
  proactiveChannels: { toast: true, browser: true, inline: true },
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
  createdAt: '',
  updatedAt: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      isLoading: false,
      isSaving: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/v1/settings`, {
            headers: authHeaders(),
          });
          if (!res.ok) throw new Error('获取设置失败');
          const data = await res.json();
          set({ ...data, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      updateSettings: async (dto) => {
        set({ isSaving: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/v1/settings`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(dto),
          });
          if (!res.ok) throw new Error('保存设置失败');
          const data = await res.json();
          set({ ...data, isSaving: false });
        } catch (err) {
          set({ error: (err as Error).message, isSaving: false });
        }
      },

      updateField: (key, value) => {
        set({ [key]: value } as Partial<SettingsState>);
      },
    }),
    {
      name: 'research-settings',
      partialize: (state) => {
        // 仅持久化非敏感 UI 状态到 localStorage
        const { isLoading, isSaving, error, fetchSettings, updateSettings, updateField, ...rest } = state;
        return rest;
      },
    }
  )
);
