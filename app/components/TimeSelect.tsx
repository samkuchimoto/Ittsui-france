"use client";
// /app/components/TimeSelect.tsx
// Extracted from SetupClient.tsx once a second page (the meeting-request
// form) needed it — see lib/theme.ts's own note on what happens when every
// page redefines the same thing locally. Native <input type="time"> renders
// in whatever format the OS/browser locale dictates (12h AM/PM on plenty of
// real devices) regardless of the page's own French UI — the underlying
// value is always a 24h "HH:MM" string per the HTML spec either way, but
// that's not what gets *shown*. A controlled pair of <select>s sidesteps
// that: same "HH:MM" string state, but the displayed label is always
// guaranteed French 24h ("15h", "15h30"), not locale-dependent.

import { BORDER } from "@/lib/theme";

const HOURS_24H = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES_15MIN = ["00", "15", "30", "45"];

export function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [hh, mm] = value.split(":");
  return (
    <div className="flex items-center gap-1">
      <select
        aria-label={`${label} — heure`}
        value={hh}
        onChange={(e) => onChange(`${e.target.value}:${mm}`)}
        className="rounded-lg border bg-white px-2 py-2 text-sm"
        style={{ borderColor: BORDER }}
      >
        {HOURS_24H.map((h) => (
          <option key={h} value={h}>
            {h}h
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} — minutes`}
        value={mm}
        onChange={(e) => onChange(`${hh}:${e.target.value}`)}
        className="rounded-lg border bg-white px-2 py-2 text-sm"
        style={{ borderColor: BORDER }}
      >
        {MINUTES_15MIN.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
