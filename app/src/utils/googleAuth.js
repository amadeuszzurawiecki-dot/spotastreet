/**
 * Utility for Google Identity Services (GIS) token decoding
 */

// Official Google Client ID for Bolters Legnica
export const GOOGLE_CLIENT_ID = "682532361864-fluu75rdrs0hf342dmsk7v1psgnshpqu.apps.googleusercontent.com";

/**
 * Decode base64 JWT token payload returned by Google Sign-In
 * @param {string} token - Google ID Token (JWT)
 * @returns {Object} Decoded payload with email, name, picture, sub
 */
export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google JWT token:', e);
    return null;
  }
}
