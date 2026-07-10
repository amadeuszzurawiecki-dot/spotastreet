import { useEffect, useMemo, useState } from 'react';
import { loadStreetNames } from '../../utils/streets';
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
  const [streetNameInput, setStreetNameInput] = useState('');
  const [streetNames, setStreetNames] = useState([]);
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
    loadingChallenges,
    openChallengeCreator,
    updateForm,
  } = adminChallenges;

  useEffect(() => {
    loadStreetNames().then(setStreetNames).catch(() => setStreetNames([]));
  }, []);

  const gameModeOptions = [
    {
      id: 'where-is-street',
      title: 'Wskaż ulicę',
      subtitle: 'Umieść pinezkę nad tą ulicą',
      icon: '/icons/umiesc.svg',
    },
    {
      id: 'what-street',
      title: 'Nazwij ulicę',
      subtitle: 'Nazwij podświetloną ulicę',
      icon: '/icons/nazwij.svg',
    },
    {
      id: 'where-is-place',
      title: 'Wskaż miejsce',
      subtitle: 'Znajdź kultowe miejsce',
      icon: '/icons/pin.svg',
    },
  ];

  const selectedStreetNames = useMemo(() => (
    form.challengeStreets
      .split('\n')
      .map(name => name.trim())
      .filter(Boolean)
  ), [form.challengeStreets]);

  const updateSelectedStreets = (items) => {
    updateForm('challengeStreets', items.join('\n'));
  };

  const handleAddStreet = () => {
    const value = streetNameInput.trim();
    if (!value || selectedStreetNames.some(name => name.toLowerCase() === value.toLowerCase())) return;
    updateSelectedStreets([...selectedStreetNames, value]);
    setStreetNameInput('');
  };

  const handleRemoveStreet = (nameToRemove) => {
    updateSelectedStreets(selectedStreetNames.filter(name => name !== nameToRemove));
  };

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
              <span>Od</span>
              <strong>{formatDateTime(startAt)}</strong>
            </div>
            <div>
              <span>Do</span>
              <strong>{formatDateTime(endAt)}</strong>
            </div>
          </div>

          <div className="admin-mobile-card__pills">
            <span className="challenge-pill challenge-pill--light">
              <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
              {Number(ch.rounds) || 0}x
            </span>
            <span className="challenge-pill challenge-pill--dark">
              <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
              {Number(ch.timeLimit) || 0}s
            </span>
            <span className={`admin-challenge-status admin-challenge-status--${status.type}`}>
              {status.label}
            </span>
            <div className="admin-mobile-card__actions">
              <button className="admin-icon-btn" type="button" onClick={() => handleStartEdit(ch)} aria-label={`Edytuj ${ch.title || 'wyzwanie'}`} title="Edytuj">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/edit.svg)' }} aria-hidden="true" />
              </button>
              <button className="admin-icon-btn admin-icon-btn--danger" type="button" onClick={() => handleDeleteChallenge(ch.id)} aria-label={`Usuń ${ch.title || 'wyzwanie'}`} title="Usuń">
                <span className="svg-icon" style={{ '--icon': 'url(/icons/trash.svg)' }} aria-hidden="true" />
              </button>
            </div>
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
            <section className={`admin-section glass-card admin-challenge-group admin-challenge-group--${group.id}`} key={group.id}>
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
        <div className="admin-modal-overlay animate-fade-in" onClick={handleCancelEdit}>
          <section className="admin-modal admin-challenge-editor-modal glass-card animate-scale-in" onClick={(event) => event.stopPropagation()}>
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
              <div className="admin-challenge-form-grid">
                <div className="admin-challenge-form-column">
                  <div className="form-group">
                    <label>Tytuł wyzwania *</label>
                    <input
                      type="text"
                      placeholder="np. Znawca Dzielnicy Cudów"
                      value={form.challengeTitle}
                      onChange={(e) => updateForm('challengeTitle', e.target.value)}
                      required
                    />
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

                  <div className="form-group">
                    <label>Tryb rozgrywki</label>
                    <div className="admin-mode-chooser" role="tablist" aria-label="Tryb wyzwania">
                      {gameModeOptions.map(option => {
                        const isActive = form.challengeGameMode === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`admin-mode-card ${isActive ? 'admin-mode-card--active' : ''}`}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => updateForm('challengeGameMode', option.id)}
                          >
                            <span className="admin-mode-card__icon svg-icon" style={{ '--icon': `url(${option.icon})` }} aria-hidden="true" />
                            <span className="admin-mode-card__copy">
                              <strong>{option.title}</strong>
                              <small>{option.subtitle}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-row">
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
                  </div>

                  <div className="form-group">
                    <label>Lista ulic</label>
                    <div className="admin-street-picker">
                      <input
                        type="text"
                        list="admin-street-names"
                        placeholder="Wpisz nazwę ulicy..."
                        value={streetNameInput}
                        onChange={(e) => setStreetNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddStreet();
                          }
                        }}
                      />
                      <button type="button" className="btn-secondary" onClick={handleAddStreet}>
                        Dodaj
                      </button>
                      <datalist id="admin-street-names">
                        {streetNames.map(name => <option key={name} value={name} />)}
                      </datalist>
                    </div>
                    <div className="admin-street-pill-list">
                      {selectedStreetNames.map(name => (
                        <span className="admin-street-pill" key={name}>
                          {name}
                          <button type="button" onClick={() => handleRemoveStreet(name)} aria-label={`Usuń ${name}`}>
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/x.svg)' }} aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="admin-challenge-form-column">
                  <div className="form-group">
                    <label>Zdjęcie wyzwania</label>
                    <div className="admin-challenge-image-row">
                      <div className="admin-challenge-image-fields">
                        <input type="file" accept="image/*" onChange={handleImageFileChange} />
                        <label>Link do zdjęcia</label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={form.challengeImageUrl}
                          onChange={(e) => updateForm('challengeImageUrl', e.target.value)}
                        />
                        <label>Ikona liniowa</label>
                        <input
                          type="text"
                          placeholder="np. target, pin, scan"
                          value={form.challengeIcon}
                          onChange={(e) => updateForm('challengeIcon', e.target.value)}
                        />
                      </div>
                      <div className="admin-challenge-preview">
                        <span>Podgląd miniatury</span>
                        {form.challengeImageUrl ? (
                          <img src={form.challengeImageUrl} alt="Podgląd wyzwania" />
                        ) : (
                          <div className="admin-challenge-preview__empty">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="admin-live-challenge-preview">
                    <span className="admin-editor-section__title">Podgląd kafelka</span>
                    <div className="challenge-card challenges-page__card">
                      <div className="challenge-card__top">
                        {form.challengeImageUrl ? (
                          <img src={form.challengeImageUrl} alt="" className="challenge-card__img" />
                        ) : (
                          <div className="challenge-card__fallback-img">
                            <span className="challenge-card__fallback-icon svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
                          </div>
                        )}
                        <div className="challenge-card__image-pills">
                          <span className="challenge-pill challenge-pill--light">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/flag.svg)' }} aria-hidden="true" />
                            {Number(form.challengeRounds) || 0} rund
                          </span>
                          <span className="challenge-pill challenge-pill--dark">
                            <span className="svg-icon" style={{ '--icon': 'url(/icons/alarm.svg)' }} aria-hidden="true" />
                            {Number(form.challengeTimeLimit) || 0}s
                          </span>
                        </div>
                      </div>
                      <div className="challenge-card__bottom">
                        <div className="challenge-card__details">
                          <h3 className="challenge-card__title">{form.challengeTitle || 'Tytuł wyzwania'}</h3>
                          <p className="challenge-card__desc">{form.challengeDesc || 'Opis wyzwania'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-challenge-form-actions">
                <div className="admin-challenge-form-actions__left">
                  <button type="button" className="btn-secondary" onClick={() => updateForm('challengeDisabled', true)}>
                    Wstrzymaj wyzwanie
                  </button>
                  {editingChallengeId && (
                    <button type="button" className="btn-danger" onClick={() => handleDeleteChallenge(editingChallengeId)}>
                      Usuń wyzwanie
                    </button>
                  )}
                </div>
                <div className="admin-challenge-form-actions__right">
                  <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                    Anuluj
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingChallengeId ? 'Zapisz zmiany' : 'Utwórz wyzwanie'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminChallengesPanel;
