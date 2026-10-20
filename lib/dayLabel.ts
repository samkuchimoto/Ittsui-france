// French weekday label — split out of lib/notify.ts (which pulls in
// firebase-admin, server-only) so client components can use the exact
// same labels without dragging that dependency into the browser bundle.
// lib/notify.ts re-exports from here, so every existing server-side
// import site (weekly-propose, rsvp, parseMeetingRequest) is unaffected.

import type { Locale } from "@/lib/i18n";

const DAY_LABELS: Record<string, string> = {
  mon: "lundi",
  tue: "mardi",
  wed: "mercredi",
  thu: "jeudi",
  fri: "vendredi",
  sat: "samedi",
  sun: "dimanche",
};

// English and Japanese, for screens and emails in those languages.
const OTHER_DAY_LABELS: Record<Exclude<Locale, "fr">, Record<string, string>> = {
  en: { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" },
  ja: { mon: "月曜日", tue: "火曜日", wed: "水曜日", thu: "木曜日", fri: "金曜日", sat: "土曜日", sun: "日曜日" },
};

// Falls back to the input unchanged for anything unrecognized — values
// crossing a JSON API boundary (e.g. an activation response) aren't
// actually type-checked at runtime the way an in-process Pair["agreedDay"]
// value is, so this stays defensive rather than assuming the 7-key map is
// exhaustive.
export function dayLabel(day: string, lang: Locale = "fr"): string {
  if (lang !== "fr") return OTHER_DAY_LABELS[lang][day] ?? day;
  return DAY_LABELS[day] ?? day;
}
