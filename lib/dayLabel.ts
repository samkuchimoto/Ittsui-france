// French weekday label — split out of lib/notify.ts (which pulls in
// firebase-admin, server-only) so client components can use the exact
// same labels without dragging that dependency into the browser bundle.
// lib/notify.ts re-exports from here, so every existing server-side
// import site (weekly-propose, rsvp, parseMeetingRequest) is unaffected.

const DAY_LABELS: Record<string, string> = {
  mon: "lundi",
  tue: "mardi",
  wed: "mercredi",
  thu: "jeudi",
  fri: "vendredi",
  sat: "samedi",
  sun: "dimanche",
};

// Falls back to the input unchanged for anything unrecognized — values
// crossing a JSON API boundary (e.g. an activation response) aren't
// actually type-checked at runtime the way an in-process Pair["agreedDay"]
// value is, so this stays defensive rather than assuming the 7-key map is
// exhaustive.
export function dayLabel(day: string): string {
  return DAY_LABELS[day] ?? day;
}
