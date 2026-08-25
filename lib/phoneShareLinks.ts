// Turns a recipient's phone number into direct, number-targeted deep links
// for the two channels that actually dominate in France (WhatsApp reaches
// ~67% of French internet users, per Statista Q3 2024 — well ahead of
// anything else outside SMS itself) — not a generic "share somewhere"
// fallback, an actual chat opened with that exact person, message
// pre-filled, one tap from sent. Anything else (Messenger, Telegram,
// email) is still covered by the native share sheet (lib/shareLink.ts).
//
// Best-effort French-first normalization, not a validator — French mobile
// numbers get written many ways (+33 6 12 34 56 78, 06 12 34 56 78,
// 0612345678) and this only ever needs to produce something wa.me/sms:
// will accept, never to prove the number is real or dialable.

export function normalizePhoneForShare(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits.replace("+", "")) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `+33${digits.slice(1)}`; // French local format
  return `+${digits}`; // already has a country code (33...) or some other country's number
}

export function whatsappLinkForNumber(phone: string, text: string): string | null {
  const normalized = normalizePhoneForShare(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(text)}`;
}

export function smsLinkForNumber(phone: string, text: string): string | null {
  const normalized = normalizePhoneForShare(phone);
  if (!normalized) return null;
  // Both `?` (Android) and `&` (iOS) before body= are used together on
  // purpose — a well-known cross-platform trick, since both OSes' sms:
  // URI parsers tolerate the redundant separator, and this repo has no
  // existing platform-detection for URI building to branch on instead.
  return `sms:${normalized}?&body=${encodeURIComponent(text)}`;
}
