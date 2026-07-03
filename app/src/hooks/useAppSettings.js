import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchAppSettings, saveAppSettings } from '../config/firebase';

const DEFAULT_APP_SETTINGS = {
  summaryMapEnabled: true,
};

const useAppSettings = create(
  persist(
    (set, get) => ({
      ...DEFAULT_APP_SETTINGS,
      isLoaded: false,

      loadSettings: async () => {
        const cloudSettings = await fetchAppSettings();
        if (cloudSettings) {
          set({
            ...DEFAULT_APP_SETTINGS,
            ...cloudSettings,
            isLoaded: true,
          });
          return;
        }
        set({ isLoaded: true });
      },

      updateSettings: async (fields) => {
        const previousSettings = {
          summaryMapEnabled: !!get().summaryMapEnabled,
        };
        const nextSettings = {
          ...get(),
          ...fields,
        };
        const cleanSettings = {
          summaryMapEnabled: !!nextSettings.summaryMapEnabled,
        };

        set(cleanSettings);
        const ok = await saveAppSettings(cleanSettings);
        if (!ok) {
          set(previousSettings);
        }
        return ok;
      },
    }),
    {
      name: 'spotastreet-app-settings',
      partialize: (state) => ({
        summaryMapEnabled: state.summaryMapEnabled,
      }),
    }
  )
);

export default useAppSettings;
