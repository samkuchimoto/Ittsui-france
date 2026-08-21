// /lib/venueCatalog.ts
// Shared, framework-agnostic venue data — no firebase-admin import, safe
// to use from both a "use client" component and an app/api/** route
// (server-only modules must never be imported into client files; see
// AGENTS.md's stack constraints).
//
// Extracted out of weekly-propose/route.ts's tier-3 static-rule-engine
// fallback so the setup wizard's one-tap CTA preview (SetupClient.tsx) can
// read the exact same curated, real venues the actual weekly proposal
// pipeline would fall back to — rather than a second, disconnected guess
// that could name a different place than what the pair actually gets
// proposed later.

import type { VenueType } from "@/lib/types";

export type Metro = "paris" | "marseille" | "lyon" | "lille" | "bordeaux";

// Coarse department-level routing from a French postal code's first two
// digits — good enough to pick the right metro's landmarks, not precise
// geolocation. Returns null for anywhere else in France (still ~most of
// the country by area, honestly not by population) rather than guessing.
export function departmentFromPostalCode(postalCode: string | undefined): Metro | null {
  if (!postalCode || postalCode.length < 2) return null;
  const prefix = postalCode.slice(0, 2);
  if (["75", "92", "93", "94"].includes(prefix)) return "paris"; // Paris + inner ring
  if (prefix === "13") return "marseille";
  if (prefix === "69") return "lyon";
  if (prefix === "59") return "lille";
  if (prefix === "33") return "bordeaux";
  return null;
}

// Real, large, long-standing public institutions only — parks and museums
// are the kind of landmark that doesn't quietly close or move, which is a
// deliberately higher confidence bar than a small private café/restaurant
// whose current address isn't something to guess at for a city nobody's
// verified. Cafe/restaurant stay Paris-only for that reason.
export const STATIC_CATALOG: Record<Metro, Partial<Record<VenueType, { name: string; address: string }[]>>> = {
  paris: {
    cafe: [
      { name: "Café de Flore", address: "172 Bd Saint-Germain, 75006 Paris" },
      { name: "Café de l'Industrie", address: "16 Rue Saint-Sabin, 75011 Paris" },
    ],
    restaurant: [{ name: "Chez Janou", address: "2 Rue Roger Verlomme, 75003 Paris" }],
    park: [{ name: "Jardin du Luxembourg", address: "75006 Paris" }],
    museum: [{ name: "Musée Rodin", address: "77 Rue de Varenne, 75007 Paris" }],
  },
  marseille: {
    park: [{ name: "Parc Borély", address: "Av. du Parc Borély, 13008 Marseille" }],
    museum: [{ name: "MuCEM", address: "7 Promenade Robert Laffont, 13002 Marseille" }],
  },
  lyon: {
    park: [{ name: "Parc de la Tête d'Or", address: "Place du Général Leclerc, 69006 Lyon" }],
    museum: [{ name: "Musée des Beaux-Arts de Lyon", address: "20 Place des Terreaux, 69001 Lyon" }],
  },
  lille: {
    park: [{ name: "Parc de la Citadelle", address: "Av. Mathias Delobel, 59000 Lille" }],
    museum: [{ name: "Palais des Beaux-Arts de Lille", address: "Place de la République, 59000 Lille" }],
  },
  bordeaux: {
    park: [{ name: "Jardin Public de Bordeaux", address: "Cours de Verdun, 33000 Bordeaux" }],
    museum: [{ name: "Musée d'Aquitaine", address: "20 Cours Pasteur, 33000 Bordeaux" }],
  },
};

// Pulls the 5-digit postal code back out of a catalog entry's address
// string (e.g. "172 Bd Saint-Germain, 75006 Paris" -> "75006"), so a
// display label can pair a venue name with a real postal code without a
// second, hand-maintained copy of the same number.
export function postalCodeFromAddress(address: string): string | null {
  const match = address.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

// Walks preferred venue types in order and returns the first one with real
// coverage in the given metro (falling back to Paris if no metro is
// known yet) — mirrors staticRuleEngineFallback()'s own preference walk in
// weekly-propose/route.ts, minus the pair-specific rotation/response
// shaping that route needs and this preview doesn't.
export function previewVenue(
  postalCode: string | undefined,
  preferredTypes: VenueType[] = ["cafe", "park"]
): { name: string; postalCode: string; type: VenueType } | null {
  const metro = departmentFromPostalCode(postalCode) ?? "paris";
  const catalog = STATIC_CATALOG[metro];
  for (const type of preferredTypes) {
    const options = catalog[type];
    if (options?.length) {
      const venue = options[0];
      // Show the postal code the person actually entered/detected, not
      // the catalog venue's own address — pairing "[real landmark] (your
      // postal code)" falsely implied the landmark was AT that postal
      // code (the catalog only has metro-level, not neighborhood-level,
      // coverage — see departmentFromPostalCode()'s own comment). Only
      // fall back to the venue's own postal code when no postal code is
      // known yet at all, matching the Paris-default behavior used
      // elsewhere in this flow.
      const code = postalCode || postalCodeFromAddress(venue.address) || "";
      return { name: venue.name, postalCode: code, type };
    }
  }
  return null;
}
