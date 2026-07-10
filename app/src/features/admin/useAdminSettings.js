import useAppSettings from '../../hooks/useAppSettings';

export function useAdminSettings(setActionStatus) {
  const appSettings = useAppSettings();

  const loadSettings = () => {
    appSettings.loadSettings();
  };

  const handleToggleSummaryMap = async () => {
    const nextValue = !appSettings.summaryMapEnabled;
    setActionStatus({
      type: 'info',
      message: nextValue ? 'Włączanie mapy podsumowania pojedynku...' : 'Wyłączanie mapy podsumowania pojedynku...'
    });

    const ok = await appSettings.updateSettings({ summaryMapEnabled: nextValue });
    setActionStatus({
      type: ok ? 'success' : 'error',
      message: ok
        ? (nextValue ? 'Mapa podsumowania pojedynku została włączona.' : 'Mapa podsumowania pojedynku została wyłączona.')
        : 'Nie udało się zapisać ustawienia mapy podsumowania.'
    });
  };

  const updateAppSetting = async (fields, label = 'ustawienia') => {
    setActionStatus({
      type: 'info',
      message: `Zapisywanie: ${label}...`
    });

    const ok = await appSettings.updateSettings(fields);
    setActionStatus({
      type: ok ? 'success' : 'error',
      message: ok
        ? 'Ustawienia aplikacji zostały zapisane.'
        : 'Nie udało się zapisać ustawień aplikacji.'
    });
  };

  return {
    appSettings,
    loadSettings,
    handleToggleSummaryMap,
    updateAppSetting,
  };
}

export default useAdminSettings;
