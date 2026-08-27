// /lib/giftLinks.ts
// Real, verified-format external entry points for the "envoyer un
// geste" flow — deliberately homepages/well-documented search patterns,
// not fabricated deep-link parameters for a specific product/restaurant
// this app has never actually tested against those platforms' real
// APIs. Ittsui has no business/API partnership with any of these
// services (see docs/gift-feature.md for what a real one would need) —
// this is the honest v1: point the sender at the real place to finish
// the gesture themselves, the same pattern this app already uses for
// WhatsApp/SMS (lib/shareLink.ts), not a fabricated "automatic" purchase
// or delivery this app can't actually back.

import type { GiftCategory } from "@/lib/types";

export const GIFT_CATEGORY_LABEL: Record<GiftCategory, string> = {
  repas: "Un repas livré",
  objet: "Un objet",
  fleurs: "Des fleurs",
  autre: "Autre",
};

// Amazon's `/s?k=` search pattern is real and stable (a standard,
// widely-documented URL, not guessed) — everything else here is a
// homepage on purpose: a restaurant- or product-specific deep link would
// need real API access this app doesn't have to construct correctly.
export function giftExternalLink(category: GiftCategory): { label: string; url: string } {
  switch (category) {
    case "repas":
      return { label: "Commander sur Uber Eats", url: "https://www.ubereats.com/fr" };
    case "objet":
      return { label: "Chercher sur Amazon", url: "https://www.amazon.fr/s?k=cadeau" };
    case "fleurs":
      return { label: "Commander des fleurs", url: "https://www.interflora.fr/" };
    case "autre":
      return { label: "", url: "" };
  }
}
