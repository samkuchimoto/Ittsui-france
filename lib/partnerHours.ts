// /lib/partnerHours.ts
// The partner pilot's shared pieces, safe for the server and the browser.
// A partner venue (venuePartnerApplications/{id}, lib/partnerPilot.ts) sets
// weekly slow hours ("mardi 14:00-17:00") and a perk for Ittsui guests
// ("café offert"); Ittsui suggests it first for a rendez-vous inside those
// hours, in its postal code, labelled "Partenaire · {perk}".

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

/** One weekly window, "HH:MM" on both ends, start before end. */
export interface SlowHour {
  day: Day;
  start: string;
  end: string;
}

export const PERK_MAX = 40;
export const SLOW_HOURS_MAX = 14;

const JS_DAYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** The weekday of a "YYYY-MM-DD" date. */
export function dayOfDate(date: string): Day {
  return JS_DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/** Whether a rendez-vous on `day` at `time` ("HH:MM") falls in the venue's slow hours. */
export function inSlowHours(slowHours: SlowHour[] | undefined, day: Day, time: string): boolean {
  return (slowHours ?? []).some((s) => s.day === day && s.start <= time && time < s.end);
}
