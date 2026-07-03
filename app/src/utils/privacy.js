export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'e-mail ukryty';
  }

  const [localPart, domain] = email.trim().split('@');
  if (!localPart || !domain) return 'e-mail ukryty';

  const visible = localPart.slice(0, 3);
  return `${visible}...${domain}`;
}
