import { useState } from 'react';
import useUserProfile from '../../hooks/useUserProfile';

const DEFAULT_CREDENTIAL_ERROR = 'Nie udało się dokończyć logowania przyciskiem Google. Spróbuj alternatywnego logowania poniżej.';
const DEFAULT_POPUP_ERROR = 'Błąd autoryzacji konta Google';

export function useGoogleAuth({
  onSuccess,
  onError,
  credentialErrorMessage = DEFAULT_CREDENTIAL_ERROR,
  popupErrorPrefix = DEFAULT_POPUP_ERROR,
} = {}) {
  const user = useUserProfile();
  const [error, setError] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const reportError = (errorMessage, errorObject) => {
    setError(errorMessage);
    onError?.(errorMessage, errorObject);
  };

  const loginWithCredentialResponse = async (response) => {
    setIsSigningIn(true);
    setError(null);
    try {
      await user.loginWithGoogleCredential(response.credential);
      onSuccess?.();
    } catch (e) {
      console.error('GIS Error:', e);
      reportError(credentialErrorMessage, e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const loginWithPopup = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await user.loginWithGooglePopup();
      onSuccess?.();
    } catch (e) {
      console.error('Firebase popup login error:', e);
      reportError(`${popupErrorPrefix}${e?.code ? `: ${e.code}` : ''}.`, e);
    } finally {
      setIsSigningIn(false);
    }
  };

  return {
    error,
    isSigningIn,
    loginWithCredentialResponse,
    loginWithPopup,
    setError,
  };
}

export default useGoogleAuth;
