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
// specific YYYY-MM-DD is given) into the correct UTC instant.
//
// Works by guessing the instant naively (as if HH:MM on the given date
// were already UTC), rendering that guess back in Paris, then shifting by
// the FULL timestamp gap between the render and the intended wall-clock
// moment — not just an hour-of-day subtraction.
//
// That distinction is load-bearing, found via direct testing (not a
// hypothetical): an earlier version compared bare hour numbers
// (`h - parisHour`), which quietly breaks the moment the naive guess
// lands on a different Paris calendar day than intended — e.g. any time
// from 22:00-23:59 in summer (CEST, +2) or 23:00-23:59 in winter (CET,
// +1), which is an every-single-day window, not a rare edge case, plus
// two narrower cases right at the instant of each DST transition. In
// those cases the "hour difference" stops being the small ±1/±2 offset
// the old code assumed and becomes up to ±23, corrupting the result by
// nearly a full day. Diffing full timestamps sidesteps the day-boundary
// entirely; one correction pass handles the ordinary case, a second
// absorbs the rare case where that first shift itself crosses into a
// different DST regime.
export function parisWallClockToUTCISOString(hhmm: string, dateStr?: string): string {
  const anchorDate = dateStr ?? parisNow().dateStr;
  const target = new Date(`${anchorDate}T${hhmm}:00.000Z`).getTime();

  let guess = new Date(target);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: PARIS_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(guess);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    const hour = get("hour") === "24" ? "00" : get("hour"); // defensive: some ICU builds render midnight as "24"
    const renderedAsUTC = new Date(`${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:00.000Z`).getTime();
    guess = new Date(guess.getTime() + (target - renderedAsUTC));
  }

  return guess.toISOString();
}

// Renders a stored UTC ISO instant (e.g. Week.proposedTime) back into its
// Paris wall-clock date/time — the inverse of parisWallClockToUTCISOString,
// needed wherever a stored instant has to be handed to something that wants
// a plain Paris date/time, like googleCalendarLink's {date, time} shape.
// Same formatToParts + "24"-as-midnight defensive handling as the function
// above, for the same reason: a plain .format() string isn't safe to slice.
export function parisDateTimeParts(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ }).format(d); // YYYY-MM-DD
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date, time: `${hour}:${get("minute")}` };
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
