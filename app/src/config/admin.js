/**
 * Admin Configuration and Authorization Helpers
 */

export const ADMIN_EMAILS = [
  'amadeuszzurawiecki@gmail.com',
  'zurawiecki.design@gmail.com'
];


/**
 * Check if the provided email address has administrator access
 * @param {string} email 
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
