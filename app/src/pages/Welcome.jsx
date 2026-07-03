import { useState, useEffect, useRef } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import { GOOGLE_CLIENT_ID } from '../utils/googleAuth';
import './Welcome.css';

export function Welcome({ onLoginSuccess }) {
  const user = useUserProfile();
  const [errorMsg, setErrorMsg] = useState(null);
  const googleBtnRef = useRef(null);
  const isRenderedRef = useRef(false);

  const handleCredentialResponse = async (response) => {
    try {
      await user.loginWithGoogleCredential(response.credential);
      onLoginSuccess?.();
    } catch (e) {
      console.error('GIS Error:', e);
      setErrorMsg('Błąd autoryzacji konta Google.');
    }
  };

  useEffect(() => {
    localStorage.removeItem('bolters_google_client_id');

    let intervalId = null;

    const initGoogleGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current && !isRenderedRef.current) {
        try {
          isRenderedRef.current = true;
          if (intervalId) clearInterval(intervalId);

          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 320,
          });
        } catch (err) {
          console.warn('Google GSI initialization warning:', err);
          isRenderedRef.current = false;
        }
      }
    };

    initGoogleGsi();
    intervalId = setInterval(initGoogleGsi, 300);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

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

        {/* Official Google Sign-In Button Container */}
        <div className="welcome__gsi-container">
          <div ref={googleBtnRef} className="welcome__gsi-btn" />
        </div>

        <div className="welcome__footer-note">
          Logowanie jest dostępne wyłącznie przez oficjalne konto Google.
        </div>
      </div>
    </div>
  );
}

export default Welcome;
