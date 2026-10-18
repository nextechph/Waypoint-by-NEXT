import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (isDark: boolean) => void;
}

const applyThemeToDOM = (isDark: boolean) => {
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark;
        if (typeof document !== 'undefined' && 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          (document as any).startViewTransition(() => {
            applyThemeToDOM(next);
            set({ isDark: next });
          });
        } else {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.add('theme-fade-transition');
            window.setTimeout(() => {
              document.documentElement.classList.remove('theme-fade-transition');
            }, 380);
          }
          applyThemeToDOM(next);
          set({ isDark: next });
        }
      },
      setDark: (isDark: boolean) => {
        if (get().isDark === isDark) return;
        if (typeof document !== 'undefined' && 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          (document as any).startViewTransition(() => {
            applyThemeToDOM(isDark);
            set({ isDark });
          });
        } else {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.add('theme-fade-transition');
            window.setTimeout(() => {
              document.documentElement.classList.remove('theme-fade-transition');
            }, 380);
          }
          applyThemeToDOM(isDark);
          set({ isDark });
        }
      },
    }),
    {
      name: 'waypoint-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.isDark);
        }
      },
    }
  )
);

