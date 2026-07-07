import GoogleSignInButton from '../auth/GoogleSignInButton';

function AdminAccessGate({
  actionStatus,
  children,
  isSigningIn,
  loginWithCredentialResponse,
  loginWithPopup,
  navigate,
  onRefreshAdminClaim,
  setActionStatus,
  user,
}) {
  if (!user.authReady) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card glass-card animate-scale-in">
          <div className="admin-badge">WERYFIKACJA ADMINISTRATORA</div>
          <h1 className="admin-title text-display">Sprawdzanie uprawnień</h1>
          <p className="admin-subtitle">Weryfikuję sesję Firebase Auth.</p>
        </div>
      </div>
    );
  }

  if (!user.isLoggedIn) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card glass-card animate-scale-in">
          <div className="admin-badge">WERYFIKACJA ADMINISTRATORA</div>
          <h1 className="admin-title text-display">Panel Administracyjny</h1>
          <p className="admin-subtitle">
            Dostęp do zarządzania kontami Spotastreet wymaga zalogowania autoryzowanym kontem Google Administratora.
          </p>

          {actionStatus && (
            <div className={`admin-alert admin-alert--${actionStatus.type}`}>
              {actionStatus.message}
            </div>
          )}

          <GoogleSignInButton
            gsiWrapperClassName="admin-gsi-wrapper"
            gsiClassName="admin-gsi-btn"
            isSigningIn={isSigningIn}
            onCredentialResponse={loginWithCredentialResponse}
            onPopupLogin={() => {
              setActionStatus(null);
              loginWithPopup();
            }}
            popupStyle={{ marginTop: '1rem' }}
            width={300}
          />

          <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
            ← Powrót do aplikacji
          </button>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card glass-card animate-scale-in">
          <div className="admin-badge admin-badge--danger">BRAK UPRAWNIEŃ</div>
          <h1 className="admin-title text-display">Odmowa Dostępu</h1>
          <p className="admin-subtitle">
            To konto nie ma aktywnego uprawnienia administratora w Firebase Auth.
          </p>
          <p className="admin-info-note">
            Dostęp do panelu wymaga custom claim <code>admin=true</code> nadanego po stronie backendu.
          </p>

          <div className="admin-actions-row" style={{ marginTop: '1.5rem', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={onRefreshAdminClaim}>
              Odśwież uprawnienia
            </button>
            <button className="btn-primary" onClick={() => user.logout()}>
              Zaloguj na inne konto
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              ← Wróć do gry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminAccessGate;
