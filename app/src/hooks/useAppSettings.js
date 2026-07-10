import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchAppSettings, saveAppSettings } from '../config/firebase';

const DEFAULT_APP_SETTINGS = {
  summaryMapEnabled: true,
  registrationEnabled: true,
  activeGameModes: {
    'where-is-street': true,
    'what-street': true,
    'where-is-place': false,
  },
  defaultRoundTime: 15,
  globalMessage: '',
};

function sanitizeSettings(settings) {
  const nextSettings = {
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    activeGameModes: {
      ...DEFAULT_APP_SETTINGS.activeGameModes,
      ...(settings?.activeGameModes || {}),
    },
  };

  return {
    summaryMapEnabled: !!nextSettings.summaryMapEnabled,
    registrationEnabled: !!nextSettings.registrationEnabled,
    activeGameModes: {
      'where-is-street': !!nextSettings.activeGameModes['where-is-street'],
      'what-street': !!nextSettings.activeGameModes['what-street'],
      'where-is-place': !!nextSettings.activeGameModes['where-is-place'],
    },
    defaultRoundTime: Math.max(3, Math.min(60, Number(nextSettings.defaultRoundTime) || DEFAULT_APP_SETTINGS.defaultRoundTime)),
    globalMessage: String(nextSettings.globalMessage || ''),
  };
}

const useAppSettings = create(
  persist(
    (set, get) => ({
      ...DEFAULT_APP_SETTINGS,
      isLoaded: false,

      loadSettings: async () => {
        const cloudSettings = await fetchAppSettings();
        if (cloudSettings) {
          set({
            ...sanitizeSettings(cloudSettings),
            isLoaded: true,
          });
          return;
        }
        set({ isLoaded: true });
      },

      updateSettings: async (fields) => {
        const previousSettings = {
          ...sanitizeSettings(get()),
        };
        const nextSettings = {
          ...get(),
          ...fields,
        };
        const cleanSettings = sanitizeSettings(nextSettings);

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
        ...sanitizeSettings(state),
      }),
    }
  )
);

export default useAppSettings;
