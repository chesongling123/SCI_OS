import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from './settings';

// Mock authHeaders
vi.mock('../lib/api', () => ({
  authHeaders: () => ({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
}));

describe('settings store', () => {
  beforeEach(() => {
    useSettingsStore.setState(useSettingsStore.getState(), true);
  });

  it('应有正确的默认状态', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('system');
    expect(state.pomodoroFocus).toBe(25);
    expect(state.llmProvider).toBe('kimi');
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
  });

  it('updateField 应更新对应字段', () => {
    const { updateField } = useSettingsStore.getState();
    updateField('theme', 'dark');
    updateField('pomodoroFocus', 45);

    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.pomodoroFocus).toBe(45);
  });

  it('fetchSettings 应正确更新状态', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 's1',
        userId: 'u1',
        theme: 'dark',
        pomodoroFocus: 30,
        llmProvider: 'openai',
      }),
    });

    const { fetchSettings } = useSettingsStore.getState();
    await fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.theme).toBe('dark');
    expect(state.pomodoroFocus).toBe(30);
    expect(state.llmProvider).toBe('openai');
  });

  it('fetchSettings 失败时应记录错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    const { fetchSettings } = useSettingsStore.getState();
    await fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toContain('获取设置失败');
  });

  it('updateSettings 应正确更新状态', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ theme: 'light', pomodoroFocus: 20 }),
    });

    const { updateSettings } = useSettingsStore.getState();
    await updateSettings({ theme: 'light', pomodoroFocus: 20 });

    const state = useSettingsStore.getState();
    expect(state.isSaving).toBe(false);
    expect(state.theme).toBe('light');
    expect(state.pomodoroFocus).toBe(20);
  });
});
