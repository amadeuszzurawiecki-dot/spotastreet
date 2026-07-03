import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyThemeToDocument = (theme) => {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
};

const useTheme = create(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        applyThemeToDocument(nextTheme);
        set({ theme: nextTheme });
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeToDocument(nextTheme);
        set({ theme: nextTheme });
      },
      applyStoredTheme: () => {
        applyThemeToDocument(get().theme);
      },
    }),
    {
      name: 'spotastreet-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeToDocument(state.theme);
      },
    }
  )
);

export default useTheme;
