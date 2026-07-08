import { gameModeLabels } from './useAdminChallenges';

const gameModeIcons = {
  'where-is-street': '/icons/umiesc.svg',
  'where-is-place': '/icons/pin.svg',
  'what-street': '/icons/nazwij.svg',
};

function getChallengeWindow(challenge) {
  const startAt = challenge.startAt || (challenge.date ? `${challenge.date}T00:00` : '');
  const endAt = challenge.endAt || (challenge.date ? `${challenge.date}T23:59` : '');
  return { startAt, endAt };
}

function formatDateTime(value) {
  if (!value) return 'Brak daty';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function AdminChallengesPanel({ adminChallenges }) {
  const {
    challengeEditorOpen,
    challengeGroups,
    challenges,
    editingChallengeId,
    form,
    getChallengeStatus,
    handleCancelEdit,
    handleCreateChallenge,
    handleDeleteChallenge,
    handleImageFileChange,
    handleStartEdit,
    handleToggleDisable,
    loadChallengesList,
    loadingChallenges,
    openChallengeCreator,
    updateForm,
  } = adminChallenges;

  const renderChallengeRows = (items, emptyMessage) => {
    if (items.length === 0) {
      return (
        <tr>
          <td className="admin-challenge-empty-row" colSpan="6">
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return items.map((ch) => {
      const status = getChallengeStatus(ch);
      const { startAt, endAt } = getChallengeWindow(ch);
      const modeIcon = gameModeIcons[ch.gameMode] || '/icons/flag.svg';
      return (
        <tr key={ch.id}>
          <td className="admin-challenge-table__date">
            <span>{formatDateTime(startAt)}</span>
            <small>{formatDateTime(endAt)}</small>
          </td>
          <td>
            <div className="admin-challenge-table__challenge">
              {ch.imageUrl ? (
                <img className="admin-challenge-table__thumb" src={ch.imageUrl} alt="" />
              ) : (
                <span className={`admin-challenge-table__icon line-icon line-icon--${ch.icon || 'target'}`} aria-hidden="true" />
              )}
              <div>
                <strong>{ch.title || 'Bez tytułu'}</strong>
                <span>{ch.description || 'Brak opisu'}</span>
              </div>
            </div>
          </td>
          <td>
            <span
              className="admin-challenge-mode-icon svg-icon"
              style={{ '--icon': `url(${modeIcon})` }}
              title={gameModeLabels[ch.gameMode] || ch.gameMode || 'Nieznany tryb'}
              aria-label={gameModeLabels[ch.gameMode] || ch.gameMode || 'Nieznany tryb'}
            />
          </td>
          <td>
            <div className="admin-challenge-round-pills">
              <span className="challenge-pill challenge-pill--light">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
                {Number(ch.rounds) || 0} rund
              </span>
              <span className="challenge-pill challenge-pill--dark">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
                {Number(ch.timeLimit) || 0}s
              </span>
            </div>
          </td>
          <td>
            <span className={`admin-challenge-status admin-challenge-status--${status.type}`}>
              {status.label}
            </span>
          </td>
          <td>
            <div className="admin-challenge-actions">
              <button className="admin-icon-btn" type="button" onClick={() => handleStartEdit(ch)} aria-label={`Edytuj ${ch.title || 'wyzwanie'}`} title="Edytuj">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/edit.svg)' }} aria-hidden="true" />
              </button>
              <button className="admin-icon-btn" type="button" onClick={() => handleToggleDisable(ch)} aria-label={ch.disabled ? 'Włącz wyzwanie' : 'Wyłącz wyzwanie'} title={ch.disabled ? 'Włącz' : 'Wyłącz'}>
                <span className="svg-icon" style={{ '--icon': `url(${ch.disabled ? '/icons/play.svg' : '/icons/x.svg'})` }} aria-hidden="true" />
              </button>
              <button className="admin-icon-btn admin-icon-btn--danger" type="button" onClick={() => handleDeleteChallenge(ch.id)} aria-label={`Usuń ${ch.title || 'wyzwanie'}`} title="Usuń">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/trash.svg)' }} aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  const renderChallengeCards = (items, emptyMessage) => {
    if (items.length === 0) {
      return (
        <div className="admin-mobile-card admin-mobile-card--empty">
          {emptyMessage}
        </div>
      );
    }

    return items.map((ch) => {
      const status = getChallengeStatus(ch);
      const { startAt, endAt } = getChallengeWindow(ch);
      const modeIcon = gameModeIcons[ch.gameMode] || '/icons/flag.svg';
      return (
        <article className="admin-mobile-card admin-mobile-challenge-card" key={`${ch.id}-card`}>
          <div className="admin-mobile-card__top">
            {ch.imageUrl ? (
              <img className="admin-mobile-challenge-card__thumb" src={ch.imageUrl} alt="" />
            ) : (
              <span className={`admin-mobile-challenge-card__thumb line-icon line-icon--${ch.icon || 'target'}`} aria-hidden="true" />
            )}
            <div className="admin-mobile-card__identity">
              <strong>{ch.title || 'Bez tytułu'}</strong>
              <span>{ch.description || 'Brak opisu'}</span>
            </div>
            <span
              className="admin-challenge-mode-icon svg-icon"
              style={{ '--icon': `url(${modeIcon})` }}
              title={gameModeLabels[ch.gameMode] || ch.gameMode || 'Nieznany tryb'}
              aria-hidden="true"
            />
          </div>

          <div className="admin-mobile-card__meta">
            <div>
              <span>Start</span>
              <strong>{formatDateTime(startAt)}</strong>
            </div>
            <div>
              <span>Koniec</span>
              <strong>{formatDateTime(endAt)}</strong>
            </div>
          </div>

          <div className="admin-mobile-card__pills">
            <span className="challenge-pill challenge-pill--light">
              <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
              {Number(ch.rounds) || 0} rund
            </span>
            <span className="challenge-pill challenge-pill--dark">
              <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
              {Number(ch.timeLimit) || 0}s
            </span>
            <span className={`admin-challenge-status admin-challenge-status--${status.type}`}>
              {status.label}
            </span>
          </div>

          <div className="admin-mobile-card__actions">
            <button className="admin-icon-btn" type="button" onClick={() => handleStartEdit(ch)} aria-label={`Edytuj ${ch.title || 'wyzwanie'}`} title="Edytuj">
              <span className="svg-icon" style={{ '--icon': 'url(/icons/edit.svg)' }} aria-hidden="true" />
            </button>
            <button className="admin-icon-btn" type="button" onClick={() => handleToggleDisable(ch)} aria-label={ch.disabled ? 'Włącz wyzwanie' : 'Wyłącz wyzwanie'} title={ch.disabled ? 'Włącz' : 'Wyłącz'}>
              <span className="svg-icon" style={{ '--icon': `url(${ch.disabled ? '/icons/play.svg' : '/icons/x.svg'})` }} aria-hidden="true" />
            </button>
            <button className="admin-icon-btn admin-icon-btn--danger" type="button" onClick={() => handleDeleteChallenge(ch.id)} aria-label={`Usuń ${ch.title || 'wyzwanie'}`} title="Usuń">
              <span className="svg-icon" style={{ '--icon': 'url(/icons/trash.svg)' }} aria-hidden="true" />
            </button>
          </div>
        </article>
      );
    });
  };

  return (
    <div className="admin-challenges-container admin-challenges-container--table">
      <section className="admin-section glass-card admin-challenges-overview">
        <div className="admin-section__header admin-challenges-toolbar">
          <div>
            <h2 className="admin-section__title">Wyzwania codzienne</h2>
            <p className="admin-section__desc">Tabela wyzwań podzielona na aktywne, zaplanowane i historyczne.</p>
          </div>
          <div className="admin-challenges-actions">
            <button type="button" className="btn-primary" onClick={openChallengeCreator}>
              Stwórz nowe
            </button>
            <button type="button" className="btn-secondary" onClick={loadChallengesList}>
              Odśwież
            </button>
          </div>
        </div>

        {loadingChallenges ? (
          <div className="admin-loading-state">
            <div className="admin-spinner"></div>
            <p>Wczytywanie wyzwań...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="admin-empty-state">
            <p>Brak wyzwań codziennych. Stwórz pierwsze wyzwanie przyciskiem powyżej.</p>
          </div>
        ) : null}
      </section>

      {!loadingChallenges && challenges.length > 0 && (
        <div className="admin-challenge-groups">
          {challengeGroups.map(group => (
            <section className="admin-section glass-card admin-challenge-group" key={group.id}>
              <div className="admin-challenge-group__header">
                <div>
                  <h3>{group.title}</h3>
                  <p>{group.desc}</p>
                </div>
                <span>{group.items.length}</span>
              </div>
              <div className="admin-challenge-table-wrap">
                <table className="admin-challenge-table">
                  <thead>
                    <tr>
                      <th>Ramy</th>
                      <th>Wyzwanie</th>
                      <th>Tryb</th>
                      <th>Rundy</th>
                      <th>Status</th>
                      <th>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderChallengeRows(group.items, group.empty)}
                  </tbody>
                </table>
              </div>
              <div className="admin-challenge-mobile-list">
                {renderChallengeCards(group.items, group.empty)}
              </div>
            </section>
          ))}
        </div>
      )}

      {challengeEditorOpen && (
        <div className="admin-modal-overlay animate-fade-in">
          <section className="admin-modal admin-challenge-editor-modal glass-card animate-scale-in">
            <div className="admin-modal__header admin-challenge-editor-header">
              <div>
                <h3>{editingChallengeId ? 'Edycja wyzwania' : 'Nowe wyzwanie'}</h3>
                <p>
                  {editingChallengeId ? 'Zmień ustawienia wybranego wyzwania.' : 'Utwórz wyzwanie i zaplanuj jego ramy czasowe.'}
                </p>
              </div>
              <button type="button" className="admin-icon-btn" onClick={handleCancelEdit} aria-label="Zamknij edycję">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/x.svg)' }} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="admin-challenge-form">
              <div className="form-row">
              <div className="form-group flex-2">
                <label>Tytuł wyzwania *</label>
                <input
                  type="text"
                  placeholder="np. Znawca Dzielnicy Cudów"
                  value={form.challengeTitle}
                  onChange={(e) => updateForm('challengeTitle', e.target.value)}
                  required
                />
              </div>
              <div className="form-group flex-1">
                <label>Ikona liniowa</label>
                <input
                  type="text"
                  placeholder="np. target, pin, scan"
                  value={form.challengeIcon}
                  onChange={(e) => updateForm('challengeIcon', e.target.value)}
                />
              </div>
              </div>

            <div className="form-group">
              <label>Opis / Podtytuł wyzwania</label>
              <input
                type="text"
                placeholder="np. Henryk byłby dumny"
                value={form.challengeDesc}
                onChange={(e) => updateForm('challengeDesc', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tryb rozgrywki</label>
                <select value={form.challengeGameMode} onChange={(e) => updateForm('challengeGameMode', e.target.value)}>
                  <option value="where-is-street">Gdzie jest ta ulica? (pinezka)</option>
                  <option value="where-is-place">Gdzie jest to miejsce? (miejsca)</option>
                  <option value="what-street">Co to za ulica? (quiz 4 opcje)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Liczba rund</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.challengeRounds}
                  onChange={(e) => updateForm('challengeRounds', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Czas na rundę (sekund)</label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={form.challengeTimeLimit}
                  onChange={(e) => updateForm('challengeTimeLimit', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Początek wyzwania *</label>
                <input
                  type="datetime-local"
                  value={form.challengeStartAt}
                  onChange={(e) => updateForm('challengeStartAt', e.target.value)}
                  required
                />
              </div>
              <div className="form-group flex-1">
                <label>Koniec wyzwania *</label>
                <input
                  type="datetime-local"
                  value={form.challengeEndAt}
                  onChange={(e) => updateForm('challengeEndAt', e.target.value)}
                  required
                />
              </div>
              <div className="form-group flex-2 admin-checkbox-field">
                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.challengeDisabled}
                    onChange={(e) => updateForm('challengeDisabled', e.target.checked)}
                  />
                  Wyzwanie wyłączone / zablokowane
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Zdjęcie wyzwania</label>
              <div className="admin-challenge-image-row">
                <input type="file" accept="image/*" onChange={handleImageFileChange} />
                <input
                  type="text"
                  placeholder="Lub wpisz bezpośredni URL do obrazka..."
                  value={form.challengeImageUrl}
                  onChange={(e) => updateForm('challengeImageUrl', e.target.value)}
                />
              </div>
              {form.challengeImageUrl && (
                <div className="admin-challenge-preview">
                  <span>Podgląd miniatury:</span>
                  <img src={form.challengeImageUrl} alt="Podgląd wyzwania" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Lista nazw ulic lub kultowych miejsc</label>
              <textarea
                rows="6"
                placeholder="np.&#10;Kamienna&#10;Partyzantów&#10;Henryka Pobożnego"
                value={form.challengeStreets}
                onChange={(e) => updateForm('challengeStreets', e.target.value)}
              />
            </div>

            <div className="admin-challenge-form-actions">
              <button type="submit" className="btn-primary">
                {editingChallengeId ? 'Zapisz zmiany' : 'Zaplanuj wyzwanie'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                Anuluj
              </button>
            </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminChallengesPanel;
