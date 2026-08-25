// Shared client-side email format check. Deliberately loose (catches
// "missing @", "no domain", stray spaces — not RFC 5322 in full) since the
// job here is catching an obvious typo before a wasted invite/request
// email goes out, not being the source of truth on validity — the server
// side of every route that accepts an email is the actual boundary.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}
