"use client";
// /app/partenaires/[id]/gerer/PilotPanel.tsx
// The venue's side of the partner pilot (lib/partnerPilot.ts), on its own
// manage page: what Ittsui brought this month, a box to validate the code
// guests show at the counter, the slow hours and the perk, and the list of
// rendez-vous. French only, like the rest of /partenaires.

import { useEffect, useState } from "react";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { DAYS, PERK_MAX, SLOW_HOURS_MAX, type Day, type SlowHour } from "@/lib/partnerHours";

const DAY_LABEL: Record<Day, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

interface VisitRow {
  id: string;
  source: "ritual" | "request";
  date: string;
  time: string;
  status: "confirmed" | "visited";
  checkedInAt: string | null;
}

interface PilotData {
  perk: string;
  slowHours: SlowHour[];
  month: { confirmed: number; visited: number };
  visits: VisitRow[];
}

const box = "rounded-2xl border bg-white p-4";
const input = "w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none";

export function PilotPanel({ id, token }: { id: string; token: string }) {
  const [data, setData] = useState<PilotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [perk, setPerk] = useState("");
  const [hours, setHours] = useState<SlowHour[]>([]);
  const [draft, setDraft] = useState<SlowHour>({ day: "tue", start: "14:00", end: "17:00" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState("");
  const [codeResult, setCodeResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch(`/api/venue-partners/${id}/pilot?token=${encodeURIComponent(token)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      setError(json?.error ?? "Une erreur est survenue.");
      return;
    }
    setData(json);
    setPerk(json.perk);
    setHours(json.slowHours);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function save(nextHours: SlowHour[] = hours) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/venue-partners/${id}/pilot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, perk, slowHours: nextHours }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Une erreur est survenue.");
      setHours(json.slowHours);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  function addHours() {
    if (draft.start >= draft.end || hours.length >= SLOW_HOURS_MAX) return;
    const next = [...hours, draft].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start));
    setHours(next);
    save(next);
  }

  async function validateCode() {
    setCodeResult(null);
    const res = await fetch(`/api/venue-partners/${id}/pilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, code }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setCodeResult({ ok: false, text: json?.error ?? "Code invalide." });
      return;
    }
    setCodeResult({ ok: true, text: `Code validé : rendez-vous du ${json.visit.date} à ${json.visit.time}${json.visit.perk ? ` (${json.visit.perk})` : ""}.` });
    setCode("");
    load();
  }

  if (error && !data) {
    return (
      <p className="mt-6 text-sm" style={{ color: ACCENT }}>
        {error}
      </p>
    );
  }
  if (!data) return null;

  return (
    <div className="mt-6 space-y-4">
      <div className={box} style={{ borderColor: BORDER }}>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
          Ce mois-ci, grâce à Ittsui
        </p>
        <p className="mt-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 500 }}>
          {data.month.confirmed} rendez-vous confirmés
        </p>
        <p className="text-sm" style={{ color: MUTED }}>
          dont {data.month.visited} venus chez vous (code validé)
        </p>
      </div>

      <div className={box} style={{ borderColor: ACCENT }}>
        <p className="text-sm font-medium">Valider un code client</p>
        <p className="mt-1 text-xs" style={{ color: MUTED }}>
          Les clients Ittsui montrent un code de 4 caractères au comptoir. Validez-le ici pour compter leur visite.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ex. 7K2Q"
            maxLength={8}
            autoCapitalize="characters"
            className={`${input} tracking-widest`}
            style={{ borderColor: BORDER }}
          />
          <button
            type="button"
            onClick={validateCode}
            disabled={code.trim().length < 4}
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            Valider
          </button>
        </div>
        {codeResult && (
          <p className="mt-2 text-sm" style={{ color: codeResult.ok ? "#1E7A4C" : ACCENT }}>
            {codeResult.text}
          </p>
        )}
      </div>

      <div className={box} style={{ borderColor: BORDER }}>
        <p className="text-sm font-medium">Vos heures creuses et votre avantage</p>
        <p className="mt-1 text-xs" style={{ color: MUTED }}>
          Pendant ces heures, Ittsui propose votre lieu en premier aux personnes de votre quartier, avec votre avantage :
          « Partenaire · {perk || "café offert"} ».
        </p>
        <label className="mt-3 block text-xs font-medium" style={{ color: MUTED }}>
          Avantage pour les clients Ittsui ({PERK_MAX} caractères max.)
        </label>
        <input
          value={perk}
          onChange={(e) => setPerk(e.target.value.slice(0, PERK_MAX))}
          onBlur={() => perk !== data.perk && save()}
          placeholder="café offert"
          className={`${input} mt-1`}
          style={{ borderColor: BORDER }}
        />

        <ul className="mt-3 space-y-2">
          {hours.map((h, i) => (
            <li key={`${h.day}-${h.start}-${i}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm" style={{ borderColor: BORDER }}>
              <span>
                {DAY_LABEL[h.day]}, {h.start} – {h.end}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = hours.filter((_, j) => j !== i);
                  setHours(next);
                  save(next);
                }}
                className="text-xs underline underline-offset-4"
                style={{ color: MUTED }}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <select value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value as Day })} className={input} style={{ borderColor: BORDER }}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABEL[d]}
              </option>
            ))}
          </select>
          <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={input} style={{ borderColor: BORDER }} />
          <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={input} style={{ borderColor: BORDER }} />
        </div>
        <button
          type="button"
          onClick={addHours}
          disabled={saving || draft.start >= draft.end || hours.length >= SLOW_HOURS_MAX}
          className="mt-3 rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          Ajouter ces heures
        </button>
        {saved && (
          <p className="mt-2 text-xs" style={{ color: "#1E7A4C" }}>
            Enregistré.
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs" style={{ color: ACCENT }}>
            {error}
          </p>
        )}
      </div>

      <div className={box} style={{ borderColor: BORDER }}>
        <p className="text-sm font-medium">Rendez-vous apportés par Ittsui</p>
        {data.visits.length === 0 ? (
          <p className="mt-2 text-xs" style={{ color: MUTED }}>
            Pas encore de rendez-vous. Ils apparaîtront ici dès qu&apos;une rencontre sera confirmée chez vous.
          </p>
        ) : (
          <ul className="mt-2 divide-y" style={{ borderColor: BORDER }}>
            {data.visits.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {v.date} à {v.time}
                  <span className="ml-2 text-xs" style={{ color: MUTED }}>
                    {v.source === "ritual" ? "rituel" : "demande"}
                  </span>
                </span>
                <span className="text-xs font-medium" style={{ color: v.status === "visited" ? "#1E7A4C" : MUTED }}>
                  {v.status === "visited" ? "✓ Venus" : "Confirmé"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs" style={{ color: INK }}>
        Pilote gratuit : pendant le pilote, rien n&apos;est facturé.
      </p>
    </div>
  );
}
