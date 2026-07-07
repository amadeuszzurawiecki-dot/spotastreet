function AdminSettingsPanel({ appSettings, onToggleSummaryMap }) {
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
