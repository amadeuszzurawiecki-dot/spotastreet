const GAME_MODE_SETTINGS = [
  { id: 'where-is-street', label: 'Wskaż ulicę', icon: '/icons/umiesc.svg' },
  { id: 'what-street', label: 'Nazwij ulicę', icon: '/icons/nazwij.svg' },
  { id: 'where-is-place', label: 'Wskaż miejsce', icon: '/icons/pin.svg' },
];

function AdminSettingsPanel({ appSettings, onToggleSummaryMap, onUpdateAppSetting }) {
  const activeGameModes = appSettings.activeGameModes || {};

  const handleToggleRegistration = () => {
    onUpdateAppSetting({ registrationEnabled: !appSettings.registrationEnabled }, 'rejestracja');
  };

  const handleToggleGameMode = (modeId) => {
    onUpdateAppSetting({
      activeGameModes: {
        ...activeGameModes,
        [modeId]: !activeGameModes[modeId],
      }
    }, 'aktywne tryby gry');
  };

  const handleRoundTimeChange = (event) => {
    onUpdateAppSetting({ defaultRoundTime: event.target.value }, 'domyślny czas rundy');
  };

  const handleGlobalMessageChange = (event) => {
    onUpdateAppSetting({ globalMessage: event.target.value }, 'komunikat globalny');
  };

  return (
    <section className="admin-section glass-card">
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title">Ustawienia aplikacji</h2>
          <p className="admin-section__desc">Globalne przełączniki funkcji widoczne dla użytkowników aplikacji.</p>
        </div>
      </div>

      <div className="admin-settings-list">
        <div className="admin-feature-toggle">
          <div className="admin-feature-toggle__main">
            <span className="admin-feature-toggle__icon svg-icon" style={{ '--icon': 'url(/icons/user.svg)' }} aria-hidden="true" />
            <div>
              <h3>Rejestracja nowych kont</h3>
              <p>
                Przełącznik przygotowany do sterowania dostępem dla nowych użytkowników.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`admin-switch ${appSettings.registrationEnabled ? 'admin-switch--on' : ''}`}
            onClick={handleToggleRegistration}
            aria-pressed={appSettings.registrationEnabled}
          >
            <span className="admin-switch__thumb" />
            <span className="admin-switch__label">
              {appSettings.registrationEnabled ? 'Włączona' : 'Wyłączona'}
            </span>
          </button>
        </div>

        <div className="admin-feature-toggle admin-feature-toggle--stacked">
          <div className="admin-feature-toggle__main">
            <span className="admin-feature-toggle__icon svg-icon" style={{ '--icon': 'url(/icons/play.svg)' }} aria-hidden="true" />
            <div>
              <h3>Aktywne tryby gry</h3>
              <p>
                Lista trybów przygotowana pod późniejsze sterowanie widocznością na froncie.
              </p>
            </div>
          </div>
          <div className="admin-settings-mode-grid">
            {GAME_MODE_SETTINGS.map(mode => {
              const isActive = !!activeGameModes[mode.id];
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`admin-settings-mode-card ${isActive ? 'admin-settings-mode-card--active' : ''}`}
                  onClick={() => handleToggleGameMode(mode.id)}
                >
                  <span className="svg-icon" style={{ '--icon': `url(${mode.icon})` }} aria-hidden="true" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="admin-feature-toggle">
          <div className="admin-feature-toggle__main">
            <span className="admin-feature-toggle__icon svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
            <div>
              <h3>Domyślny czas rundy</h3>
              <p>
                Wartość zapisywana w ustawieniach aplikacji do użycia przy kolejnych zmianach flow gry.
              </p>
            </div>
          </div>
          <div className="admin-settings-control">
            <input
              type="number"
              min="3"
              max="60"
              value={appSettings.defaultRoundTime}
              onChange={handleRoundTimeChange}
            />
            <span>s</span>
          </div>
        </div>

        <div className="admin-feature-toggle admin-feature-toggle--stacked">
          <div className="admin-feature-toggle__main">
            <span className="admin-feature-toggle__icon svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
            <div>
              <h3>Komunikat globalny</h3>
              <p>
                Tekst gotowy do wyświetlenia w aplikacji po podpięciu widocznego bannera.
              </p>
            </div>
          </div>
          <textarea
            className="admin-settings-message"
            value={appSettings.globalMessage}
            onChange={handleGlobalMessageChange}
            placeholder="Np. Dzisiaj testujemy nowe wyzwania."
            rows="3"
          />
        </div>

        <div className="admin-feature-toggle">
          <div className="admin-feature-toggle__main">
            <span className="admin-feature-toggle__icon line-icon line-icon--pin" aria-hidden="true" />
            <div>
              <h3>Mapa rozegranych rund w podsumowaniu pojedynku</h3>
              <p>
                Po wyłączeniu podsumowanie multiplayera pokaże tylko wynik i listę rund, bez mapy z numerami rund.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`admin-switch ${appSettings.summaryMapEnabled ? 'admin-switch--on' : ''}`}
            onClick={onToggleSummaryMap}
            aria-pressed={appSettings.summaryMapEnabled}
          >
            <span className="admin-switch__thumb" />
            <span className="admin-switch__label">
              {appSettings.summaryMapEnabled ? 'Włączona' : 'Wyłączona'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default AdminSettingsPanel;
