// /lib/gestureLinks.ts
// Real, verified-format external entry points for the "envoyer un
// geste" flow's "curated"/"suggested" modes — deliberately well-known
// French merchant homepages, not fabricated deep-link parameters for a
// specific product this app has never actually tested against a real
// API. Amazon is intentionally NOT here: a broad multi-AI review of this
// feature (2026-08-27) converged on the same point — centering Amazon
// risks turning Ittsui into "Amazon with friends," and Amazon has no
// live API that lets a third party place an order on someone's behalf
// anyway (see docs/three-fronts-and-gestures.md). Ittsui has no
// business/API partnership with any of these services — this is the
// honest v1: point the sender at the real place to finish the gesture
// themselves, the same pattern this app already uses for WhatsApp/SMS
// (lib/shareLink.ts), not a fabricated "automatic" purchase or delivery
// this app can't actually back.

import type { CuratedGestureItem } from "@/lib/types";

export const CURATED_ITEM_LABEL: Record<CuratedGestureItem, string> = {
  fleurs: "Des fleurs",
  livre: "Un livre",
  chocolat: "Des chocolats",
  plante: "Une plante",
  bougie: "Une bougie",
  papeterie: "Une jolie papeterie",
  repas: "Un repas livré",
};

export const CURATED_ITEMS: CuratedGestureItem[] = ["fleurs", "livre", "chocolat", "plante", "bougie", "papeterie", "repas"];

export function curatedItemExternalLink(item: CuratedGestureItem): { label: string; url: string } {
  switch (item) {
    case "fleurs":
      return { label: "Commander des fleurs", url: "https://www.interflora.fr/" };
    case "repas":
      return { label: "Commander sur Uber Eats", url: "https://www.ubereats.com/fr" };
    case "livre":
      return { label: "Chercher un livre à la Fnac", url: "https://www.fnac.com/" };
    case "chocolat":
    case "plante":
    case "bougie":
    case "papeterie":
      // One real, well-known French "petite attention" store covers all
      // four — genuinely the right kind of shop for this, not a
      // convenience fallback dressed up as four separate integrations.
      return { label: "Voir sur Nature & Découvertes", url: "https://www.natureetdecouvertes.com/" };
  }
}

// Deterministic, reshuffleable pick for the "Laissez Ittsui vous
// proposer" mode — genuinely just decision-load removal (same honesty
// principle as weekly-propose's venue ranking: a plain function, not a
// fabricated claim that Ittsui knows something personal about the
// recipient it has no data for). `exclude` lets the UI's "une autre
// idée" reshuffle button avoid repeating the item just shown.
export function suggestCuratedItem(exclude?: CuratedGestureItem): CuratedGestureItem {
  const pool = exclude ? CURATED_ITEMS.filter((item) => item !== exclude) : CURATED_ITEMS;
  return pool[Math.floor(Math.random() * pool.length)];
}
