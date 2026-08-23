// /lib/googleCalendarLink.ts
// Builds a Google Calendar "quick add" link — the plain render-URL
// template Google has supported for years, not the Calendar API. No
// OAuth, no scopes, no credentials: it just pre-fills Google Calendar's
// own "create event" screen for whoever clicks it, works for anyone with
// a Google account (or lets non-Google users ignore it), and needs
// nothing from this app beyond the event's own details. Framework-
// agnostic — no firebase-admin import — safe from both a "use client"
// component and an app/api/** route, same reasoning as lib/venueCatalog.ts.

export function googleCalendarLink(opts: {
  title: string;
  details: string;
  venueAddress: string;
  date: string; // "YYYY-MM-DD", Europe/Paris calendar date
  time: string; // "HH:MM", Europe/Paris wall-clock
}): string {
  const [year, month, day] = opts.date.split("-").map(Number);
  const [hour, minute] = opts.time.split(":").map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h default — this app doesn't collect a meeting duration

  const pad = (n: number) => String(n).padStart(2, "0");
  const format = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${format(start)}/${format(end)}`,
    details: opts.details,
    location: opts.venueAddress,
    // Tells Google Calendar to read the naive "dates" values above as
    // Europe/Paris wall-clock time, matching how date/time are already
    // stored everywhere else in this app — not a real UTC instant.
    ctz: "Europe/Paris",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
