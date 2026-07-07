import GoogleSignInButton from '../features/auth/GoogleSignInButton';
import useGoogleAuth from '../features/auth/useGoogleAuth';
import './Welcome.css';

export function Welcome({ onLoginSuccess }) {
  const {
    error: errorMsg,
    isSigningIn,
    loginWithCredentialResponse,
    loginWithPopup,
  } = useGoogleAuth({ onSuccess: onLoginSuccess });

  return (
    <div className="welcome">
      <div className="welcome__glow" />
      
      <div className="welcome__content glass-card animate-scale-in">
        <div className="welcome__badge">QUIZ TOPOGRAFICZNY</div>
        
        <h1 className="welcome__title text-display" style={{ fontSize: '3rem', letterSpacing: '0.05em' }}>
          SPOTASTREET
        </h1>
        
        <p className="welcome__desc">
          Zaloguj się oficjalnym kontem Google, aby wziąć udział w wyzwaniach topograficznych i dołączyć do rankingu!
        </p>

        {errorMsg && (
          <div className="welcome__error animate-fade-in">
            <span className="line-icon line-icon--alert" aria-hidden="true" />
            {errorMsg}
          </div>
        )}

        <GoogleSignInButton
          gsiWrapperClassName="welcome__gsi-container"
          gsiClassName="welcome__gsi-btn"
          isSigningIn={isSigningIn}
          onCredentialResponse={loginWithCredentialResponse}
          onPopupLogin={loginWithPopup}
          popupStyle={{ width: '100%', marginTop: '12px' }}
          gsiOptions={{ cancel_on_tap_outside: true }}
          width={320}
        />

        <div className="welcome__footer-note">
          Logowanie jest dostępne wyłącznie przez oficjalne konto Google.
        </div>
      </div>
    </div>
  );
}

export default Welcome;
