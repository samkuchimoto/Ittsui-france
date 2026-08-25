// Native share sheet first (lets someone pick literally any app they
// actually use — SMS, WhatsApp, Messenger — not one hardcoded choice) ->
// WhatsApp direct link if unsupported or the sheet itself fails to open ->
// clipboard as the last resort. Extracted from SetupClient.tsx's original
// handleShare so /request/new's phone-only flow (2026-08-25: real users
// know a friend's phone number, not their email, so the sender now hands
// the link over themselves instead of the app trying to email an address
// it was never given) can reuse the exact same fallback chain instead of
// a second copy that would drift from it.

import { tapHaptic, ImpactStyle } from "@/lib/haptics";

export type ShareResult = "shared" | "cancelled" | "opened-whatsapp" | "copied" | "failed";

export async function shareLink({ title, text, url }: { title: string; text: string; url: string }): Promise<ShareResult> {
  tapHaptic(ImpactStyle.Light);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      // The person closed the share sheet without picking anything — an
      // expected, non-error outcome, not something to fall through to
      // WhatsApp/clipboard for.
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const opened = typeof window !== "undefined" ? window.open(whatsappHref, "_blank", "noopener,noreferrer") : null;
  if (opened) return "opened-whatsapp";

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
