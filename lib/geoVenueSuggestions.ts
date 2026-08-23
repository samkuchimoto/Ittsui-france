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
