// /lib/timezone.ts
// Europe/Paris is the only timezone this app's scheduling needs to be
// correct in. Vercel's serverless functions run with TZ=UTC, so anything
// built from bare new Date().getDay()/.setHours() etc. silently uses UTC
// instead of Paris — wrong by 1 or 2 hours (the DST offset) for roughly
// half the year (CEST, late March-late October). No date library added
// for this — Intl.DateTimeFormat with an explicit IANA zone already knows
// the correct offset for any given date, DST included.

const PARIS_TZ = "Europe/Paris";
export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// The wall-clock date and weekday as they currently read in Paris right
// now — not wherever this server process happens to be running.
export function parisNow(): { dateStr: string; weekday: Weekday } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ }).format(now); // YYYY-MM-DD
  const shortName = new Intl.DateTimeFormat("en-US", { timeZone: PARIS_TZ, weekday: "short" }).format(now);
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(shortName);
  return { dateStr, weekday: WEEKDAYS[idx] };
}

// Converts an "HH:MM" Paris wall-clock time (today's Paris date unless a
// specific YYYY-MM-DD is given) into the correct UTC instant. Works by
// guessing the instant naively (as if HH:MM were already UTC), checking
// what hour that guess actually renders as in Paris, then shifting by the
// difference — self-correcting for CET (+1) vs CEST (+2) without needing
// to hardcode either offset or their transition dates.
export function parisWallClockToUTCISOString(hhmm: string, dateStr?: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const anchorDate = dateStr ?? parisNow().dateStr;
  const naiveUTC = new Date(`${anchorDate}T${hhmm}:00.000Z`);
  const parisHourOfNaiveUTC = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: PARIS_TZ, hour: "2-digit", hour12: false }).format(naiveUTC)
  );
  const offsetHours = h - parisHourOfNaiveUTC;
  const corrected = new Date(naiveUTC.getTime() + offsetHours * 3600_000);
  corrected.setUTCMinutes(m, 0, 0);
  return corrected.toISOString();
}

// Monday of the current week, as Paris's calendar reads it.
export function parisMondayISO(): string {
  const { dateStr } = parisNow();
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split("T")[0];
}
