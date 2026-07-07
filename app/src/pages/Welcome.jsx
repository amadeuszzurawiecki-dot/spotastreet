import GoogleSignInButton from '../features/auth/GoogleSignInButton';
import useGoogleAuth from '../features/auth/useGoogleAuth';
import './Welcome.css';

function WelcomeLogo() {
  return (
    <div className="welcome-logo" aria-label="Spotastreet">
      <svg className="welcome-logo__sygnet" viewBox="0 0 596.3 535.4" width="34" height="31" aria-hidden="true">
        <path
          d="M520.4 66.1c-10.1-9.1-21.2-16.9-33.3-23.5-48.3-26.5-112.5-35-189-35C119.6 7.6 8.4 53.7 8.4 267.7c0 99.3 23.9 162.5 67.4 201.7 10.1 9.1 21.2 16.9 33.3 23.5 48.3 26.5 112.5 35 189 35 178.6 0 289.7-46.1 289.7-260.2.1-99.3-23.9-162.5-67.4-201.6m-392 340.7-30.1 35.9c-.9 1-2.5 0-2-1.2l20.8-48c-4.7-6.9-8.8-14.8-12.3-24C95 344 90 309.7 90 267.7s5-76.2 14.7-101.7c7.4-19.3 17.3-33.3 31.1-43.8 29.5-22.6 81.1-33.1 162.3-33.1 65 0 88.7 8.3 8.3 106.4zm363.1-37.4c-7.4 19.3-17.3 33.3-31.1 43.8-29.5 22.6-81.1 33.1-162.3 33.1-65 0-88.7-8.3-8.3-106.4l178.1-211.2L498 92.8c.9-1 2.5 0 2 1.2l-20.8 48c4.7 6.9 8.8 14.8 12.3 24 9.8 25.5 14.7 59.7 14.7 101.7.1 42-4.9 76.3-14.7 101.7"
          fill="currentColor"
        />
      </svg>
      <span className="welcome-logo__text">SPOTASTREET</span>
    </div>
  );
}

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
        
        <h1 className="welcome__title text-display">
          <WelcomeLogo />
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
          gsiOptions={{ cancel_on_tap_outside: true }}
          showPopupButton={false}
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
