import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

function getSystemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyToDocument(isDark: boolean) {
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

/**
 * 主题状态管理（Zustand + localStorage 持久化）
 * 支持 light / dark / system 三种模式
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      isDark: false,

      setMode: (mode) => {
        const isDark = mode === 'dark' || (mode === 'system' && getSystemDark());
        applyToDocument(isDark);
        set({ mode, isDark });
      },

      toggle: () => set((state) => {
        const nextMode: ThemeMode = state.isDark ? 'light' : 'dark';
        const isDark = nextMode === 'dark';
        applyToDocument(isDark);
        return { mode: nextMode, isDark };
      }),

      setDark: (value) => {
        applyToDocument(value);
        set({ mode: value ? 'dark' : 'light', isDark: value });
      },
    }),
    {
      name: 'research-theme',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isDark = state.mode === 'dark' || (state.mode === 'system' && getSystemDark());
        applyToDocument(isDark);
        state.isDark = isDark;
      },
    }
  )
);

/**
 * 监听系统主题变化（system 模式时自动切换）
 */
if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener?.('change', () => {
    const { mode } = useThemeStore.getState();
    if (mode === 'system') {
      const isDark = getSystemDark();
      applyToDocument(isDark);
      useThemeStore.setState({ isDark });
    }
  });
}
