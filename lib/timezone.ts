// /lib/timezone.ts
// Wall-clock time in a meeting's own timezone (lib/cities.ts). Vercel's
// serverless functions run with TZ=UTC, so anything built from bare
// new Date().getDay()/.setHours() etc. silently uses UTC instead of the
// meeting's city — wrong by hours, and by a DST offset for part of the
// year. No date library added for this — Intl.DateTimeFormat with an
// explicit IANA zone already knows the correct offset for any given date,
// DST included. Every function takes the zone; Paris, the only zone before
// 2026-10-23, stays the default, and the paris* names stay for the code
// that is Paris-only by nature.

export const PARIS_TZ = "Europe/Paris";
export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Today's date ("YYYY-MM-DD") and weekday in `tz`. */
export function zonedNow(tz: string = PARIS_TZ): { dateStr: string; weekday: Weekday } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD
  const shortName = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(now);
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(shortName);
  return { dateStr, weekday: WEEKDAYS[idx] };
}

/**
 * The UTC instant of a wall-clock time ("HH:MM") on a date in `tz`. Two
 * correction passes settle the offset, DST changes included; a time that
 * doesn't exist (the spring-forward hour) lands on the next valid one.
 */
export function wallClockToUTCISOString(hhmm: string, dateStr?: string, tz: string = PARIS_TZ): string {
  const anchorDate = dateStr ?? zonedNow(tz).dateStr;
  const target = new Date(`${anchorDate}T${hhmm}:00.000Z`).getTime();

  let guess = new Date(target);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
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

/** A UTC instant's local date and time in `tz`. */
export function zonedDateTimeParts(isoString: string, tz: string = PARIS_TZ): { date: string; time: string } {
  const d = new Date(isoString);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date, time: `${hour}:${get("minute")}` };
}

/** This week's Monday ("YYYY-MM-DD") in `tz`. */
export function mondayISO(tz: string = PARIS_TZ): string {
  const { dateStr } = zonedNow(tz);
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split("T")[0];
}

export const parisNow = (): { dateStr: string; weekday: Weekday } => zonedNow(PARIS_TZ);
export const parisWallClockToUTCISOString = (hhmm: string, dateStr?: string): string => wallClockToUTCISOString(hhmm, dateStr, PARIS_TZ);
export const parisDateTimeParts = (isoString: string): { date: string; time: string } => zonedDateTimeParts(isoString, PARIS_TZ);
export const parisMondayISO = (): string => mondayISO(PARIS_TZ);
