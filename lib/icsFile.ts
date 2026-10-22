// /lib/icsFile.ts
// A real gap found while auditing the accept flow: lib/googleCalendarLink.ts
// only ever produces a Google-specific "quick add" URL — genuinely useless
// to an Apple Calendar or Outlook user, who gets no add-to-calendar option
// at all today. RFC 5545 .ics is the one universal format every major
// calendar app (Google, Apple, Outlook) already knows how to import, so
// this replaces the single Google-only link with one download every
// platform can actually use, rather than adding a second, narrower option
// alongside the first (two calendar buttons is worse UX than one that
// works everywhere).
//
// Client-side only, deliberately: all the data needed (venue, date, time)
// is already sitting in the page after an accept response — generating
// and downloading the file locally avoids a second network round-trip to
// a dedicated API route that would otherwise need to exist for this alone.

import { PARIS_TZ, wallClockToUTCISOString } from "@/lib/timezone";

// UTC ("...Z"), the one form every calendar reads the same way wherever the
// phone is: date/time are wall-clock in the meeting's city, converted with
// its timezone. (Until 2026-10-23 these were "floating" times, which each
// phone read in its own zone: a Paris 15:00 opened in Tokyo landed at 15:00
// Tokyo time.)
function formatICSDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// CRLF line endings and 75-octet line folding are both real RFC 5545
// requirements, not stylistic — Outlook in particular is known to reject
// or mis-render .ics files that skip either one.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    result += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return result;
}

function escapeICSText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICSContent(opts: {
  title: string;
  description: string;
  venueAddress: string;
  date: string; // "YYYY-MM-DD", in the meeting's city
  time: string; // "HH:MM", wall-clock in the meeting's city
  uid: string; // stable per-event id — the meeting request's own id is a natural fit
  timezone?: string; // the city's IANA zone (lib/cities.ts); Paris by default
}): string {
  const start = wallClockToUTCISOString(opts.time, opts.date, opts.timezone ?? PARIS_TZ);
  const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(); // 1h default — no duration is collected anywhere in this app

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ittsui//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@ittsui.fr`,
    `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICSText(opts.title)}`,
    `DESCRIPTION:${escapeICSText(opts.description)}`,
    `LOCATION:${escapeICSText(opts.venueAddress)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// Triggers a real file download in the browser — not the Artifact-sandbox
// situation this app has nothing to do with; a plain Next.js page can
// download a Blob URL normally, same as any other website.
export function downloadICSFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
