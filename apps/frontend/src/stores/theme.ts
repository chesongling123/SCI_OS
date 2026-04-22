import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

/**
 * 主题状态管理（Zustand + localStorage 持久化）
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggle: () => set((state) => {
        const next = !state.isDark;
        document.documentElement.toggleAttribute('data-theme', next);
        if (next) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
        return { isDark: next };
      }),
      setDark: (value) => set(() => {
        if (value) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
        return { isDark: value };
      }),
    }),
    {
      name: 'phd-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.isDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      },
    }
  )
);
