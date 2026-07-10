import { AVATARS } from '../../data/avatars';
import { maskEmail } from '../../utils/privacy';

function AdminUsersPanel({ adminUsers, user }) {
  const {
    allUsers,
    closeUserEditor,
    deletingEmail,
    editingUser,
    filteredUsers,
    getAvatarImage,
    handleDeleteConfirm,
    handleResetUserChallenge,
    handleSaveUserProfile,
    handleUserPhotoChange,
    loadProfiles,
    loading,
    openUserEditor,
    resetChallengeId,
    searchTerm,
    setDeletingEmail,
    setResetChallengeId,
    setSearchTerm,
    setUserDraft,
    userDraft,
  } = adminUsers;

  const renderUserAvatar = (u) => {
    const avatarImage = getAvatarImage(u);
    return (
      <span className={`admin-user-table-avatar ${u.isPremium ? 'premium-glow-avatar' : ''}`}>
        {avatarImage ? (
          <img src={avatarImage} alt="" />
        ) : (
          <span className="line-icon line-icon--user" aria-hidden="true" />
        )}
      </span>
    );
  };

  return (
    <>
      <section className="admin-section glass-card admin-users-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Użytkownicy</h2>
            <p className="admin-section__desc admin-section__desc--pill">{allUsers.length} aktywnych kont</p>
          </div>

          <div className="admin-section__actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Szukaj po nazwie, emailu lub mieście..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn-secondary admin-refresh-btn" onClick={loadProfiles} title="Odśwież listę kont">
              Odśwież
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper">
          {loading ? (
            <div className="admin-loading-state">
              <div className="admin-spinner"></div>
              <p>Pobieranie kont z bazy danych...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty-state">
              <p>Brak kont spełniających kryteria wyszukiwania.</p>
            </div>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table admin-users-table--management">
                <thead>
                  <tr>
                    <th>Imię</th>
                    <th>E-mail</th>
                    <th aria-label="Akcje"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const email = u.email || '';
                    const isSelf = email.toLowerCase().trim() === user.email?.toLowerCase()?.trim();
                    return (
                      <tr key={`${email}-${idx}`} className={isSelf ? 'row-highlight' : ''}>
                        <td>
                          <div className="table-user-info">
                            {renderUserAvatar(u)}
                            <span className="table-user-name">
                              {u.name || 'Bez nazwy'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="table-email">{email}</span>
                        </td>
                        <td>
                          <div className="admin-user-table-actions">
                            <button
                              type="button"
                              className="admin-icon-btn"
                              onClick={() => openUserEditor(u)}
                              aria-label={`Edytuj profil ${u.name || maskEmail(email)}`}
                            >
                              <span className="svg-icon" style={{ '--icon': 'url(/icons/edit.svg)' }} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn--danger"
                              onClick={() => setDeletingEmail(email)}
                              aria-label={`Usuń konto ${maskEmail(email)}`}
                            >
                              <span className="svg-icon" style={{ '--icon': 'url(/icons/trash.svg)' }} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="admin-users-mobile-list">
                {filteredUsers.map((u, idx) => {
                  const email = u.email || '';
                  const isSelf = email.toLowerCase().trim() === user.email?.toLowerCase()?.trim();
                  return (
                    <article key={`${email}-${idx}-card`} className={`admin-mobile-card admin-mobile-user-card ${isSelf ? 'admin-mobile-card--self' : ''}`}>
                      <div className="admin-mobile-card__top">
                        {renderUserAvatar(u)}
                        <div className="admin-mobile-card__identity">
                          <strong>{u.name || 'Bez nazwy'}</strong>
                          <span>{email}</span>
                        </div>
                      </div>

                      <div className="admin-mobile-card__actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => openUserEditor(u)}
                          aria-label={`Edytuj profil ${u.name || maskEmail(email)}`}
                        >
                          <span className="svg-icon" style={{ '--icon': 'url(/icons/edit.svg)' }} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          onClick={() => setDeletingEmail(email)}
                          aria-label={`Usuń konto ${maskEmail(email)}`}
                        >
                          <span className="svg-icon" style={{ '--icon': 'url(/icons/trash.svg)' }} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {deletingEmail && (
        <div className="admin-modal-overlay animate-fade-in">
          <div className="admin-modal glass-card animate-scale-in">
            <div className="admin-modal__header">
              <span className="admin-modal__icon line-icon line-icon--alert" aria-hidden="true" />
              <h3>Potwierdzenie usunięcia konta</h3>
            </div>
            <div className="admin-modal__body">
              <p>Czy na pewno chcesz usunąć konto użytkownika?</p>
              <div className="admin-modal__user-box">
                <code>{deletingEmail}</code>
              </div>
              <p className="admin-modal__warning">
                Operacja usunie konto z bazy Firestore oraz pamięci podręcznej. Akcja jest nieodwracalna.
              </p>
            </div>
            <div className="admin-modal__footer">
              <button className="btn-secondary" onClick={() => setDeletingEmail(null)}>
                Anuluj
              </button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>
                Tak, usuń konto
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && userDraft && (
        <div className="admin-modal-overlay animate-fade-in">
          <div className="admin-modal admin-user-editor glass-card animate-scale-in">
            <div className="admin-modal__header">
              <span className="admin-modal__icon line-icon line-icon--user" aria-hidden="true" />
              <div>
                <h3>Edytuj profil użytkownika</h3>
                <code className="admin-editor-email">{maskEmail(userDraft.email)}</code>
              </div>
            </div>

            <div className="admin-editor-layout">
              <aside className="admin-editor-side">
                <div className="admin-editor-photo">
                  {getAvatarImage(userDraft) ? (
                    <img src={getAvatarImage(userDraft)} alt="" />
                  ) : (
                    <span className="line-icon line-icon--user" aria-hidden="true" />
                  )}
                </div>
                <label className="btn-secondary btn-sm admin-file-btn">
                  Wgraj zdjęcie
                  <input type="file" accept="image/*" onChange={handleUserPhotoChange} />
                </label>
                {userDraft.customAvatar && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setUserDraft(prev => ({ ...prev, customAvatar: null }))}
                  >
                    Usuń zdjęcie
                  </button>
                )}
              </aside>

              <div className="admin-editor-main">
                <div className="admin-editor-grid">
                  <div className="form-group">
                    <label>Nazwa użytkownika</label>
                    <input
                      type="text"
                      value={userDraft.name}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Miejscowość</label>
                    <input
                      type="text"
                      value={userDraft.town}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, town: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="admin-editor-section">
                  <div className="admin-editor-section__title">Avatar aplikacji</div>
                  <div className="admin-avatar-picker">
                    {AVATARS.map(avatar => (
                      <button
                        key={avatar.id}
                        className={`admin-avatar-option ${userDraft.avatarId === avatar.id ? 'admin-avatar-option--active' : ''}`}
                        onClick={() => setUserDraft(prev => ({ ...prev, avatarId: avatar.id, customAvatar: null }))}
                        title={avatar.name}
                      >
                        {avatar.image ? (
                          <img src={avatar.image} alt={avatar.name} />
                        ) : (
                          <span>{avatar.emoji}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-editor-toggles">
                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={userDraft.hideEmail}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, hideEmail: e.target.checked }))}
                    />
                    <span>Ukryj adres email w widokach publicznych</span>
                  </label>
                  <label className="admin-toggle-row">
                    <input
                      type="checkbox"
                      checked={userDraft.isPremium}
                      onChange={(e) => setUserDraft(prev => ({ ...prev, isPremium: e.target.checked }))}
                    />
                    <span>Konto Premium</span>
                  </label>
                </div>

                <div className="admin-editor-section">
                  <div className="admin-editor-section__title">Statystyki</div>
                  <div className="admin-editor-stats">
                    {Object.entries(userDraft.stats || {}).map(([mode, values]) => (
                      <div key={mode}>
                        <span>{mode}</span>
                        <strong>{values?.wins || 0}W / {values?.losses || 0}L</strong>
                      </div>
                    ))}
                    <div>
                      <span>online</span>
                      <strong>{userDraft.onlineWins}W / {userDraft.onlineLosses}L / {userDraft.onlineDraws}D</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-editor-section">
                  <div className="admin-editor-section__title">Reset wyzwania</div>
                  <div className="admin-reset-row">
                    <select value={resetChallengeId} onChange={(e) => setResetChallengeId(e.target.value)}>
                      <option value="">Wszystkie zapisane wyzwania</option>
                      {Object.entries(userDraft.challengeAttempts || {}).map(([id, score]) => (
                        <option key={id} value={id}>{id} · {score} pkt</option>
                      ))}
                    </select>
                    <button className="btn-secondary btn-sm" onClick={handleResetUserChallenge}>
                      Resetuj
                    </button>
                  </div>
                  <div className="admin-challenge-attempts">
                    {Object.keys(userDraft.challengeAttempts || {}).length === 0 ? (
                      <span>Brak zapisanych podejść.</span>
                    ) : (
                      Object.entries(userDraft.challengeAttempts || {}).map(([id, score]) => (
                        <span key={id}>{id}: {score} pkt</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal__footer admin-editor-footer">
              <button
                className="btn-danger"
                onClick={() => {
                  const targetEmail = userDraft.email;
                  closeUserEditor();
                  setDeletingEmail(targetEmail);
                }}
              >
                Usuń konto
              </button>
              <div className="admin-editor-footer__right">
                <button className="btn-secondary" onClick={closeUserEditor}>
                  Anuluj
                </button>
                <button className="btn-primary" onClick={handleSaveUserProfile}>
                  Zapisz profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminUsersPanel;
