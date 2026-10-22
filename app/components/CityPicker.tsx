"use client";
// /app/components/CityPicker.tsx
// "Where is the meeting?": the eight cities (lib/cities.ts) as chips, in
// setup and the request form. The meeting's city decides its timezone and
// venue suggestions. The choice is always the person's: never guessed from
// their IP, GPS or store country. This device remembers the last one, and
// a city landing page passes its own with ?city=.

import { CITY_IDS, CITIES, isCityId, type CityId } from "@/lib/cities";
import { ACCENT, BORDER, INK, MUTED } from "@/lib/theme";
import { useLang, useT } from "@/app/components/site/LangProvider";
import { COMPONENTS } from "./components.i18n";

const STORAGE_KEY = "ittsui_city";

/** The link's ?city=, else the one chosen last on this device; null on the server. */
export function initialCity(): CityId | null {
  if (typeof window === "undefined") return null;
  const fromLink = new URLSearchParams(window.location.search).get("city");
  if (isCityId(fromLink)) return fromLink;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isCityId(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function CityPicker({ value, onChange }: { value: CityId | null; onChange: (id: CityId) => void }) {
  const { lang } = useLang();
  const t = useT(COMPONENTS);
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
        {t("Ville du rendez-vous")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CITY_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, id);
              } catch {
                // Private mode: the choice still applies to this meeting.
              }
              onChange(id);
            }}
            className="rounded-full border px-3 py-1.5 text-xs"
            style={{
              borderColor: value === id ? ACCENT : BORDER,
              color: value === id ? ACCENT : INK,
              backgroundColor: value === id ? `${ACCENT}14` : undefined,
            }}
          >
            {CITIES[id].name[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
