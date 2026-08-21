"use client";
// /app/hooks/useNearbyVenue.ts
// Given real coordinates (from useUserLocation — this hook doesn't ask for
// location itself, so using both together never triggers two permission
// prompts), finds a real, currently-mapped café or park nearby via
// OpenStreetMap's Overpass API — free, keyless, no account to configure.
//
// This is deliberately NOT a photo: Overpass returns arbitrary real-world
// points with a name tag, and Ittsui has no photo for any of them. Showing
// an AI-generated or stock image next to a specific real address would
// imply it's a picture of that actual place, which it wouldn't be — the
// same honesty line already drawn for DiscoveryTile and the dashboard's
// VenuePhoto (a real photo only where one is actually known, a plain
// block otherwise, never a fabricated one). A name and a real distance is
// the honest version of "visual and immersive" this can actually deliver
// without a licensed venue-photo database.
//
// Bounded to a hard timeout and fails completely silently on any error —
// this is an enhancement layered on top of the already-working static
// catalog (lib/venueCatalog.ts), never a replacement its caller depends on.

import { useEffect, useState } from "react";
import type { Coords } from "@/app/hooks/useUserLocation";

export type NearbyVenueStatus = "idle" | "loading" | "done" | "unavailable";

export interface NearbyVenue {
  name: string;
  kind: "cafe" | "park";
  distanceMeters: number;
}

const OVERPASS_TIMEOUT_MS = 4000;
const SEARCH_RADIUS_M = 1200;

function haversineMeters(a: Coords, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface OverpassElement {
  lat: number;
  lon: number;
  tags?: { name?: string; amenity?: string; leisure?: string };
}

async function queryOverpass(coords: Coords): Promise<NearbyVenue | null> {
  const ql = `[out:json][timeout:3];(node["amenity"="cafe"]["name"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});node["leisure"="park"]["name"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon}););out body 20;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: { elements?: OverpassElement[] } = await res.json();
    const candidates = (data.elements ?? [])
      .filter((el): el is OverpassElement & { tags: { name: string } } => Boolean(el.tags?.name))
      .map((el) => ({
        name: el.tags.name,
        kind: (el.tags.amenity === "cafe" ? "cafe" : "park") as "cafe" | "park",
        distanceMeters: Math.round(haversineMeters(coords, { lat: el.lat, lon: el.lon })),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
    return candidates[0] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function useNearbyVenue(coords: Coords | null): { status: NearbyVenueStatus; venue: NearbyVenue | null } {
  const [status, setStatus] = useState<NearbyVenueStatus>("idle");
  const [venue, setVenue] = useState<NearbyVenue | null>(null);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setStatus("loading");
    queryOverpass(coords).then((result) => {
      if (cancelled) return;
      setVenue(result);
      setStatus(result ? "done" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  return { status, venue };
}
