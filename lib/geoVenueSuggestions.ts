"use client";
// /lib/geoVenueSuggestions.ts
// Real, free, keyless place search for /request/new: the postal-code
// suggestion chips, the "Nom du lieu" search-as-you-type, and the
// per-type lists behind the Café/Restaurant/Parc/Musée tiles. Two free
// services, both allowlisted in next.config.js's CSP:
//   1. api-adresse.data.gouv.fr (BAN) — postal code <-> coordinates, and
//      the postcode for a place that has none of its own. BAN only knows
//      street addresses: "parc montsouris" matches "Rue du Parc de
//      Montsouris" and never the park itself.
//   2. photon.komoot.io (Photon) — OpenStreetMap search that knows named
//      places, including parks, which are mapped as areas.
//
// Photon replaced overpass-api.de on 2026-09-28. Overpass answered these
// queries in 8-16s against a 4s abort, so every lookup timed out and the
// form silently showed the static Paris landmark list for every postal
// code — Café de Flore for 75014. Its query also asked for nodes only,
// and parks are ways/relations, so no park could ever have been found.
// Photon measured 1.5-4.5s for the same jobs.
//
// Everything here fails silently to an empty result: RequestFormClient.tsx
// keeps the static catalog and the manual fields as its fallback.

import type { VenueType } from "@/lib/types";

export interface GeoVenueSuggestion {
  name: string;
  address: string;
  venueType?: VenueType;
  /** Set by searchVenuesByName — how well the typed text names this place:
   *  3 same name, 2 one contains the other, 1 every word appears, 0 only
   *  Photon thought it similar. See nameScore(). */
  matchScore?: number;
}

export interface Coords {
  lat: number;
  lon: number;
}

const GEOCODE_TIMEOUT_MS = 3000;
const PHOTON_TIMEOUT_MS = 7000;
const PHOTON_URL = "https://photon.komoot.io";

export async function postalCodeToCoords(postalCode: string): Promise<Coords | null> {
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

// --- Photon -----------------------------------------------------------------

interface PhotonProps {
  name?: string;
  osm_key?: string;
  osm_value?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
}

interface PhotonFeature {
  properties?: PhotonProps;
  geometry?: { coordinates?: unknown };
}

async function photon(endpoint: "api" | "reverse", params: URLSearchParams): Promise<PhotonFeature[]> {
  params.set("lang", "fr");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);
  try {
    const res = await fetch(`${PHOTON_URL}/${endpoint}?${params}`, { signal: controller.signal });
    if (!res.ok) return [];
    const data: { features?: PhotonFeature[] } = await res.json();
    return data.features ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function venueTypeFor(key?: string, value?: string): VenueType | undefined {
  if (key === "amenity") {
    if (value === "cafe" || value === "bar" || value === "pub" || value === "ice_cream") return "cafe";
    if (value === "restaurant" || value === "fast_food" || value === "food_court" || value === "biergarten") {
      return "restaurant";
    }
    if (value === "arts_centre") return "museum";
  }
  if (key === "leisure" && (value === "park" || value === "garden" || value === "nature_reserve")) return "park";
  if (key === "landuse" && (value === "forest" || value === "recreation_ground")) return "park";
  if (key === "tourism" && (value === "museum" || value === "gallery")) return "museum";
  return undefined;
}

// Named places that aren't one of the app's four types but are still
// somewhere to meet. Anything else Photon returns — bus and tram stops,
// map boards, streets, districts, shops — is dropped: a search for "parc
// montsouris" otherwise lists two bus stops and an information board.
const OTHER_MEETING_PLACES: Record<string, ReadonlySet<string> | "any"> = {
  amenity: new Set(["theatre", "cinema", "library", "marketplace", "community_centre", "nightclub"]),
  leisure: new Set(["playground", "sports_centre", "swimming_pool", "marina", "stadium"]),
  tourism: new Set(["attraction", "viewpoint", "zoo", "aquarium", "theme_park", "artwork", "hotel", "picnic_site"]),
  historic: "any",
  place: new Set(["square"]),
  natural: new Set(["beach", "peak"]),
};

function isMeetingPlace(key?: string, value?: string): boolean {
  if (venueTypeFor(key, value)) return true;
  const allowed = key ? OTHER_MEETING_PLACES[key] : undefined;
  return allowed === "any" || Boolean(allowed && value && allowed.has(value));
}

// Punctuation- and space-blind, so "PARC MONT-souris", "parc mont souris"
// and "Parc Montsouris" all compare equal.
function compact(value: string): string {
  return normalizePlaceText(value).replace(/[^a-z0-9]/g, "");
}

// Photon's own ranking is not enough on its own: for "PARC MONT-souris"
// near 75014 it ranks Parc du Mont-Valérien (8km away) and a cemetery
// above Parc Montsouris itself. 3 = the same name, 2 = one contains the
// other, 1 = every typed word appears, 0 = only Photon thought it similar.
function nameScore(query: string, name: string): number {
  const q = compact(query);
  const n = compact(name);
  if (!q || !n) return 0;
  if (n === q) return 3;
  if (n.includes(q) || q.includes(n)) return 2;
  const words = normalizePlaceText(query).split(" ").filter((w) => w.length >= 3);
  return words.length > 0 && words.every((w) => n.includes(w)) ? 1 : 0;
}

function bboxAround(c: Coords, km: number): string {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((c.lat * Math.PI) / 180));
  return [c.lon - dLon, c.lat - dLat, c.lon + dLon, c.lat + dLat].map((v) => v.toFixed(4)).join(",");
}

// Mainland France plus Corsica, for name searches with no reference point.
const FRANCE_BBOX = "-5.3,41.2,9.8,51.2";

interface Candidate {
  name: string;
  props: PhotonProps;
  coords: Coords;
  distance: number;
  venueType?: VenueType;
}

function toCandidates(features: PhotonFeature[], near: Coords | null): Candidate[] {
  const out: Candidate[] = [];
  for (const f of features) {
    const props = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!props.name || !isMeetingPlace(props.osm_key, props.osm_value)) continue;
    if (!Array.isArray(coords) || typeof coords[0] !== "number" || typeof coords[1] !== "number") continue;
    const point = { lon: coords[0], lat: coords[1] };
    out.push({
      name: props.name,
      props,
      coords: point,
      distance: near ? distanceKm(near, point) : 0,
      venueType: venueTypeFor(props.osm_key, props.osm_value),
    });
  }
  return out;
}

// Photon returns one place several times (a park mapped as two areas, a
// museum as both a building and a point). Same name = same place here;
// the copy nearest the reference wins.
function dedupeByName(candidates: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = compact(c.name);
    const existing = best.get(key);
    if (!existing || c.distance < existing.distance) best.set(key, c);
  }
  return [...best.values()];
}

async function postcodeAt(c: Coords): Promise<{ postcode: string; city: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${c.lon}&lat=${c.lat}&limit=1`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.features?.[0]?.properties;
    return typeof p?.postcode === "string" && typeof p?.city === "string" ? { postcode: p.postcode, city: p.city } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// A park or a big museum is an area with no street of its own, and Photon
// often leaves its postcode empty too (Parc Montsouris comes back as just
// "Paris"). BAN fills the postcode in from the coordinates, and the name
// goes in front so the address still locates the place on a map.
async function toSuggestion(c: Candidate): Promise<GeoVenueSuggestion> {
  const p = c.props;
  let postcode = p.postcode;
  let city = p.city;
  if (!postcode) {
    const found = await postcodeAt(c.coords);
    postcode = found?.postcode;
    city = city ?? found?.city;
  }
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const cityLine = [postcode, city].filter(Boolean).join(" ");
  const address = street ? [street, cityLine].filter(Boolean).join(", ") : [c.name, cityLine].filter(Boolean).join(", ");
  return { name: c.name, address, venueType: c.venueType };
}

/**
 * Search-as-you-type for the "Nom du lieu" field. `near` is the postal
 * code's centre or the person's position; without one the search covers
 * France. Best name matches first, then nearest.
 */
export async function searchVenuesByName(query: string, near: Coords | null): Promise<GeoVenueSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ q, limit: "15" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lon));
    params.set("bbox", bboxAround(near, 30));
  } else {
    params.set("bbox", FRANCE_BBOX);
  }
  const ranked = dedupeByName(toCandidates(await photon("api", params), near))
    .map((c) => ({ c, score: nameScore(q, c.name) }))
    .sort((a, b) => b.score - a.score || a.c.distance - b.c.distance)
    .slice(0, 6);
  return Promise.all(
    ranked.map(async ({ c, score }) => ({ ...(await toSuggestion(c)), matchScore: score })),
  );
}

type SearchableType = Exclude<VenueType, "home">;

const TYPE_SEARCH: Record<SearchableType, { words: string[]; tags: string[] }> = {
  cafe: { words: ["café"], tags: ["amenity:cafe"] },
  restaurant: { words: ["restaurant"], tags: ["amenity:restaurant"] },
  park: { words: ["parc", "jardin"], tags: ["leisure:park"] },
  museum: { words: ["musée"], tags: ["tourism:museum", "tourism:gallery"] },
};

// How far around the postal code (or position) a type list reaches.
const TYPE_RADIUS_KM = 3;

// The best-known places of a type in the area — Photon ranks text matches
// by prominence, which is what puts Parc Montsouris at the top for 75014.
async function notable(near: Coords, word: string, tags: string[], limit: number): Promise<Candidate[]> {
  const params = new URLSearchParams({
    q: word,
    lat: String(near.lat),
    lon: String(near.lon),
    bbox: bboxAround(near, TYPE_RADIUS_KM),
    limit: String(limit),
  });
  for (const t of tags) params.append("osm_tag", t);
  return toCandidates(await photon("api", params), near);
}

// The closest places of a type, whatever they're called — this is what
// finds the "Square ..." and "Jardin ..." a text search for "parc" misses.
async function nearest(near: Coords, tags: string[], limit: number): Promise<Candidate[]> {
  const params = new URLSearchParams({
    lat: String(near.lat),
    lon: String(near.lon),
    radius: String(TYPE_RADIUS_KM),
    limit: String(limit),
  });
  for (const t of tags) params.append("osm_tag", t);
  return toCandidates(await photon("reverse", params), near);
}

/** The list shown when a Café/Restaurant/Parc/Musée tile is picked: the
 *  best-known few in the area first, then everything else nearest first.
 *  Nearest-only buried the big parks — 75014 has ten small squares closer
 *  to its centre than Parc Montsouris, so a pure distance sort cut it. */
export async function fetchVenuesOfType(type: SearchableType, near: Coords): Promise<GeoVenueSuggestion[]> {
  const { words, tags } = TYPE_SEARCH[type];
  const [close, ...wordBatches] = await Promise.all([
    nearest(near, tags, 12),
    ...words.map((w) => notable(near, w, tags, 6)),
  ]);
  const inArea = (c: Candidate) => c.distance <= TYPE_RADIUS_KM * 1.5;
  const famous = dedupeByName(wordBatches.flat().filter(inArea)).slice(0, 4);
  const taken = new Set(famous.map((c) => compact(c.name)));
  const rest = dedupeByName(close.filter(inArea))
    .filter((c) => !taken.has(compact(c.name)))
    .sort((a, b) => a.distance - b.distance);
  return Promise.all([...famous, ...rest].slice(0, 12).map(toSuggestion));
}

/** The mixed chips shown as soon as a postal code is known: the nearest
 *  cafés and restaurants, and the best-known parks and museums. */
export async function fetchNearbyVenueSuggestions(near: Coords): Promise<GeoVenueSuggestion[]> {
  const [eateries, parks, museums] = await Promise.all([
    nearest(near, [...TYPE_SEARCH.cafe.tags, ...TYPE_SEARCH.restaurant.tags], 16),
    notable(near, "parc", TYPE_SEARCH.park.tags, 4),
    notable(near, "musée", TYPE_SEARCH.museum.tags, 4),
  ]);
  const pick = (list: Candidate[], type: SearchableType, n: number) =>
    dedupeByName(list.filter((c) => c.venueType === type)).slice(0, n);
  const chosen = [
    ...pick(eateries, "cafe", 2),
    ...pick(eateries, "restaurant", 2),
    ...pick(parks, "park", 2),
    ...pick(museums, "museum", 2),
  ];
  return Promise.all(chosen.map(toSuggestion));
}
