"use client";
// /lib/geoVenueSuggestions.ts
// Real, free, keyless geocoding + nearby-venue lookup for the
// /request/new postal-code suggestion chips — replaces a static 5-metro
// hardcoded bucket (STATIC_CATALOG, still used elsewhere as the
// dependency-free fallback tier — see weekly-propose/route.ts) that
// showed the exact same handful of Paris landmarks for every postal code
// in that metro, a real reported bug ("the five suggestions are the
// same"). Uses the same two free government/OSM APIs already relied on
// elsewhere in this app, both already allowlisted in next.config.js's CSP:
//   1. api-adresse.data.gouv.fr (BAN) — postal code -> real coordinates.
//      useUserLocation.ts already calls this API's reverse direction
//      (coordinates -> postal code); this is the forward direction,
//      confirmed working for both major cities and small towns via a
//      real query before writing this (?q=<code>&postcode=<code>&type=
//      municipality&limit=1 reliably returns that commune's centroid).
//   2. overpass-api.de (OpenStreetMap) — real, currently-mapped venues
//      near those coordinates. useNearbyVenue.ts already uses this same
//      source for a single GPS-based suggestion; this generalizes it to
//      several results across more categories, for a picker UI that
//      needs distinct options rather than one auto-suggestion.
//
// Bounded to hard timeouts and fails completely silently (empty array)
// on any error — RequestFormClient.tsx falls back to the static catalog
// when this returns nothing, same "enhancement layered on top of an
// already-working fallback" philosophy useNearbyVenue.ts documents.

import type { VenueType } from "@/lib/types";

export interface GeoVenueSuggestion {
  name: string;
  address: string;
  venueType: VenueType;
}

const GEOCODE_TIMEOUT_MS = 3000;
const OVERPASS_TIMEOUT_MS = 4000;
const SEARCH_RADIUS_M = 1500;
const MAX_RESULTS = 6;

async function postalCodeToCoords(postalCode: string): Promise<{ lat: number; lon: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${postalCode}&postcode=${postalCode}&type=municipality&limit=1`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coords: unknown = data?.features?.[0]?.geometry?.coordinates;
    return Array.isArray(coords) && coords.length === 2 ? { lon: coords[0], lat: coords[1] } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface OverpassTags {
  name?: string;
  amenity?: string;
  leisure?: string;
  tourism?: string;
  "addr:housenumber"?: string;
  "addr:street"?: string;
  "addr:city"?: string;
  "addr:postcode"?: string;
}

interface OverpassElement {
  tags?: OverpassTags;
}

function typeForTags(tags: OverpassTags | undefined): VenueType | null {
  if (!tags) return null;
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.leisure === "park") return "park";
  if (tags.tourism === "museum") return "museum";
  return null;
}

function addressFromTags(tags: OverpassTags | undefined, fallbackPostalCode: string): string {
  if (!tags) return fallbackPostalCode;
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const cityLine = [tags["addr:postcode"] ?? fallbackPostalCode, tags["addr:city"]].filter(Boolean).join(" ");
  return [street, cityLine].filter(Boolean).join(", ") || fallbackPostalCode;
}

// Great-circle distance in km. Only used to rank BAN candidates against a
// known reference point, so the cheap spherical formula is far more
// precision than the job needs.
function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A BAN result further than this from the reference point is a different
// place that happens to share a name, not the one the user meant. ~40km
// covers a metro area and its suburbs (all of Île-de-France from central
// Paris) without reaching the next city.
const MAX_REFERENCE_DISTANCE_KM = 40;

// Lowercase, strip accents, treat hyphens and apostrophes as spaces,
// collapse runs of whitespace. Needed on both sides of the name check
// below because BAN's own labels punctuate inconsistently: the query
// "Saint-Germain-des-Prés" comes back labelled "Place Saint-Germain des
// Prés", hyphenated in one half and spaced in the other.
function normalizePlaceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface BanFeature {
  properties?: { postcode?: unknown; label?: unknown };
  geometry?: { coordinates?: unknown };
}

/**
 * Resolves a free-text area or landmark name ("Bastille", "Croix-Rousse")
 * to a real French postal code, disambiguated against a reference point.
 *
 * Why `near` is required rather than optional: BAN is a nationwide address
 * database with no notion of a default city, so a bare neighbourhood name
 * matches an identically-named lane anywhere in France, and its top hit is
 * frequently a hamlet hundreds of kilometres from where the user is. The
 * earlier version of this function sent `?q=<name>&limit=1` and took the
 * first result, which measured, against the live API:
 *
 *     "Bastille"               -> 35190  a street in Saint-Thual, Brittany
 *     "Croix-Rousse"           -> 24530  a street in Quinsac, Dordogne
 *     "Saint-Germain-des-Prés" -> 45220  a commune in the Loiret
 *
 * Those postal codes then drove fetchNearbyVenueSuggestions(), so someone
 * typing "on se voit vers Bastille" in Paris was offered cafés 350km away
 * in rural Brittany, silently. That is strictly worse than the no-
 * suggestions behaviour it was meant to improve on, so the reference point
 * is now part of the type: it cannot be called in the broken way.
 *
 * BAN's `lat`/`lon` proximity-bias parameters do NOT solve this — measured
 * directly, biasing to Paris and to Lyon returned byte-identical results.
 * Nor does appending a city name to the query, which fails confidently
 * when the guess is wrong ("Croix-Rousse Paris" -> 75017 Passage Roux, an
 * unrelated street). So this asks for real candidates and ranks them
 * itself.
 *
 * Two filters, both load-bearing, neither sufficient alone.
 *
 * Distance alone cannot reject nonsense: BAN answers a name it doesn't
 * really have with a phonetic near-miss, and some of those land close by.
 * "Le Panier" returns "Les Moques Paniers" 22km from Paris and "Le Moque
 * Panier" at 30km, both comfortably inside any sane radius.
 *
 * The name check alone cannot pick a city: every "Rue de la Bastille" in
 * France is an equally exact match, from Dunkerque to Arles.
 *
 * Note what is deliberately NOT used as the second filter — BAN's own
 * `score`. It looks like the right tool and isn't: the genuine matches
 * here measure 0.69-0.95 and the junk 0.30-0.57, which reads as a clean
 * gap until "Le Moque Panier" turns up at 0.515 and lands inside it. Any
 * cutoff is a tuned magic number sitting in a populated region. Requiring
 * the query to appear in the result's label as a contiguous phrase is
 * structural instead: "Place de la Bastille" contains "bastille", "Le
 * Moque Panier" does not contain "le panier", and there is nothing to
 * tune. Verified against the live API:
 *
 *     query                     ref        -> result
 *     "Bastille"                Paris      -> 75011 Place de la Bastille       (1km)
 *     "Bastille"                Lyon       -> 69100 Rue de la Bastille         (3km)
 *     "Bastille"                Marseille  -> null  (nearest is Arles, 73km)
 *     "Croix-Rousse"            Lyon       -> 69001 Bd de la Croix-Rousse      (1km)
 *     "Croix-Rousse"            Paris      -> null  (nearest is Châteaudun, 115km)
 *     "Saint-Germain-des-Prés"  Paris      -> 75006 Pl. Saint-Germain des Prés (1km)
 *     "Bellecour"               Lyon       -> 69002 Place Bellecour            (1km)
 *     "Le Panier"               Paris      -> null  (only phonetic near-misses nearby)
 *     "Le Panier"               Marseille  -> null  (BAN has no Marseille quartier by that name)
 *     "zzzqqq"                  any        -> null  (no candidates)
 *
 * That second-to-last row is the honest cost of this approach: a real
 * Marseille neighbourhood BAN simply doesn't carry returns nothing rather
 * than something wrong. Every failure mode here — a business name BAN has
 * no address for, a place too far from the reference, a name that doesn't
 * really match, a timeout, a network error — returns null, sets no postal
 * code and fires no suggestions, exactly as if this never ran.
 */
export async function placeNameToPostalCode(
  query: string,
  near: { lat: number; lon: number },
): Promise<string | null> {
  const needle = normalizePlaceText(query);
  if (!needle) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    // limit=15, not 1: the correct city's match is regularly outside
    // BAN's own top result for a bare neighbourhood name, and ranking by
    // real distance is only possible over a pool of candidates.
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=15`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: { features?: BanFeature[] } = await res.json();

    let best: { postcode: string; distance: number } | null = null;
    for (const feature of data.features ?? []) {
      const postcode = feature.properties?.postcode;
      const label = feature.properties?.label;
      const coords = feature.geometry?.coordinates;
      if (typeof postcode !== "string" || !/^\d{5}$/.test(postcode)) continue;
      if (typeof label !== "string" || !normalizePlaceText(label).includes(needle)) continue;
      if (!Array.isArray(coords) || coords.length !== 2) continue;
      const [lon, lat] = coords as [number, number];
      if (typeof lat !== "number" || typeof lon !== "number") continue;

      const distance = distanceKm(near, { lat, lon });
      if (distance > MAX_REFERENCE_DISTANCE_KM) continue;
      if (!best || distance < best.distance) best = { postcode, distance };
    }
    return best?.postcode ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNearbyVenueSuggestions(postalCode: string): Promise<GeoVenueSuggestion[]> {
  const coords = await postalCodeToCoords(postalCode);
  if (!coords) return [];

  const ql =
    `[out:json][timeout:4];(` +
    `node["amenity"="cafe"]["name"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});` +
    `node["amenity"="restaurant"]["name"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});` +
    `node["leisure"="park"]["name"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});` +
    `node["tourism"="museum"]["name"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});` +
    `);out body ${MAX_RESULTS * 3};`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data: { elements?: OverpassElement[] } = await res.json();

    const seen = new Set<string>();
    const results: GeoVenueSuggestion[] = [];
    for (const el of data.elements ?? []) {
      const name = el.tags?.name;
      const venueType = typeForTags(el.tags);
      if (!name || !venueType || seen.has(name)) continue;
      seen.add(name);
      results.push({ name, address: addressFromTags(el.tags, postalCode), venueType });
      if (results.length >= MAX_RESULTS) break;
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
