// /lib/weather.ts
// Real-time atmospheric signal for the weekly proposal — extends the venue
// pipeline in weekly-propose/route.ts, not a separate feature. Open-Meteo:
// keyless, free for non-commercial use, aggregates Météo-France's own
// AROME/ARPEGE models (verified directly against Open-Meteo's docs,
// 2026-08-24). Metro-level coordinates only, matching the same 5-metro
// granularity departmentFromPostalCode() already uses in venueCatalog.ts —
// this steers a category swap (outdoor -> indoor), not a precise forecast
// for one exact address.
//
// OPEN QUESTION, not resolved here: Open-Meteo's free tier is scoped to
// "non-commercial use," and Ittsui has a paid tier planned (Ittsui Plus).
// Worth confirming directly with Open-Meteo that a freemium app's free
// base tier still qualifies before this runs at real production volume.
// Not a reason to block this from shipping — every call here is
// best-effort and fails silently either way — but a reason not to treat
// the vendor choice as permanently settled.

import { WEEKDAYS, type Weekday } from "@/lib/timezone";
import type { Metro } from "@/lib/venueCatalog";

const WEATHER_TIMEOUT_MS = 2000;
const RAIN_PROBABILITY_THRESHOLD = 50; // percent — deliberately a single simple signal, not a WMO weather-code taxonomy

const METRO_COORDS: Record<Metro, { lat: number; lon: number }> = {
  paris: { lat: 48.8566, lon: 2.3522 },
  marseille: { lat: 43.2965, lon: 5.3698 },
  lyon: { lat: 45.764, lon: 4.8357 },
  lille: { lat: 50.6292, lon: 3.0573 },
  bordeaux: { lat: 44.8378, lon: -0.5792 },
};

export interface WeatherSignal {
  rainLikely: boolean;
  precipitationProbability: number;
}

// Monday-relative date arithmetic, only needed here to turn "weekOf" (a
// Monday) + agreedDay into the actual calendar date Open-Meteo needs as
// start_date/end_date — not a general-purpose date util.
function targetDateForWeek(weekOf: string, agreedDay: Weekday): string {
  const offset = (WEEKDAYS.indexOf(agreedDay) - WEEKDAYS.indexOf("mon") + 7) % 7;
  const d = new Date(`${weekOf}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split("T")[0];
}

// Best-effort: returns null on any failure — unsupported metro, timeout,
// network error, malformed response, or a forecast date too far out for
// Open-Meteo to have real data for yet. Callers must already have a
// deterministic path that works with no weather signal at all, exactly
// like every other external-signal call in this codebase.
export async function getWeatherSignal(
  metro: Metro,
  weekOf: string,
  agreedDay: Weekday
): Promise<WeatherSignal | null> {
  const coords = METRO_COORDS[metro];
  const targetDate = targetDateForWeek(weekOf, agreedDay);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=precipitation_probability_max&start_date=${targetDate}&end_date=${targetDate}&timezone=Europe%2FParis`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const probability: unknown = data?.daily?.precipitation_probability_max?.[0];
    if (typeof probability !== "number") return null; // e.g. target date beyond Open-Meteo's real forecast range

    return { rainLikely: probability >= RAIN_PROBABILITY_THRESHOLD, precipitationProbability: probability };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
