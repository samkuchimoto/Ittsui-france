"use client";
// /app/hooks/useUserLocation.ts
// Best-effort postal code detection for the setup wizard's "Les lieux"
// step. The existing manual postal code input (SetupClient.tsx) stays the
// source of truth and the only required path — this just pre-fills it
// when geolocation + reverse-geocoding both succeed quickly. Denial,
// timeout, an unsupported browser, or a non-French result all fall back
// to silence, not an error state; the user still has the text input.

import { useCallback, useRef, useState } from "react";

export type LocationStatus = "idle" | "locating" | "resolving" | "done" | "denied" | "unavailable" | "error";

export interface Coords {
  lat: number;
  lon: number;
}

interface UseUserLocationResult {
  status: LocationStatus;
  postalCode: string | null;
  coords: Coords | null;
  detect: () => void;
}

const GEO_TIMEOUT_MS = 5000;

// French government's free, keyless reverse-geocoding API (Base Adresse
// Nationale) — no API key or env var to configure, and purpose-built for
// French addresses, which is the only coverage this app has today (see
// weekly-propose/route.ts's departmentFromPostalCode()).
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&type=municipality`);
  if (!res.ok) return null;
  const data = await res.json();
  const postcode: unknown = data?.features?.[0]?.properties?.postcode;
  return typeof postcode === "string" && /^\d{5}$/.test(postcode) ? postcode : null;
}

export function useUserLocation(): UseUserLocationResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [postalCode, setPostalCode] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  // Guards against overlapping requests (e.g. a double-click) while one is
  // actually in flight — NOT a permanent one-shot latch. It used to block
  // every later call unconditionally, so a real, common failure (denied
  // permission, a timeout, a flaky reverse-geocode response) permanently
  // killed the feature for the rest of that page load with no way to
  // retry — indistinguishable from "GPS doesn't work" from the outside,
  // since the caller's retry button (SetupClient.tsx) had nothing to call
  // that would ever do anything again.
  const inFlightRef = useRef(false);

  const detect = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      inFlightRef.current = false;
      setStatus("unavailable");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("resolving");
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        reverseGeocode(position.coords.latitude, position.coords.longitude)
          .then((code) => {
            inFlightRef.current = false;
            if (code) {
              setPostalCode(code);
              setStatus("done");
            } else {
              setStatus("error");
            }
          })
          .catch(() => {
            inFlightRef.current = false;
            setStatus("error");
          });
      },
      (err) => {
        inFlightRef.current = false;
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { timeout: GEO_TIMEOUT_MS, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { status, postalCode, coords, detect };
}
