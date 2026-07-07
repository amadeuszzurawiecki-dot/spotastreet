import {
  signInWithGoogleIdToken,
  signInWithGooglePopup as signInWithFirebaseGooglePopup,
} from '../../config/firebase';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '210221782427-rkrlru0cap8l3lasnb6nkrchroulmmpi.apps.googleusercontent.com';

export function parseGoogleCredential(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google credential:', e);
    return null;
  }
}

export function canUseLocalGoogleCredentialFallback() {
  return import.meta.env.DEV;
}

export async function signInWithGoogleCredential(credential) {
  return signInWithGoogleIdToken(credential);
}

export async function signInWithGooglePopup() {
  return signInWithFirebaseGooglePopup();
}
