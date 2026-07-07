import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from './authService';

function GoogleSignInButton({
  disabled = false,
  isSigningIn = false,
  onCredentialResponse,
  onPopupLogin,
  gsiWrapperClassName,
  gsiClassName,
  popupClassName = 'btn-secondary',
  popupStyle,
  popupLabel = 'Zaloguj przez Google',
  signingInLabel = 'Logowanie...',
  showPopupButton = true,
  width = 320,
  gsiOptions = {},
}) {
  const googleBtnRef = useRef(null);
  const isRenderedRef = useRef(false);

  useEffect(() => {
    let intervalId = null;

    const initGoogleGsi = () => {
      if (isRenderedRef.current) return true;
      if (window.google?.accounts?.id && googleBtnRef.current && !isRenderedRef.current) {
        try {
          isRenderedRef.current = true;
          if (intervalId) clearInterval(intervalId);

          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: onCredentialResponse,
            auto_select: false,
            ...gsiOptions,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
            width,
          });
          return true;
        } catch (err) {
          console.warn('Google GSI initialization warning:', err);
          isRenderedRef.current = false;
        }
      }
      return false;
    };

    if (!initGoogleGsi()) {
      intervalId = setInterval(() => {
        if (initGoogleGsi() && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 300);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gsiOptions, onCredentialResponse, width]);

  const gsiButton = <div ref={googleBtnRef} className={gsiClassName} />;

  return (
    <>
      {gsiWrapperClassName ? (
        <div className={gsiWrapperClassName}>
          {gsiButton}
        </div>
      ) : gsiButton}
      {showPopupButton && (
        <button
          className={popupClassName}
          type="button"
          onClick={onPopupLogin}
          disabled={disabled || isSigningIn}
          style={popupStyle}
        >
          {isSigningIn ? signingInLabel : popupLabel}
        </button>
      )}
    </>
  );
}

export default GoogleSignInButton;
