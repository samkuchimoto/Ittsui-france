"use client";
// /app/partenaires/[id]/gerer/page.tsx
// A venue partner's own view: add/remove the specific open slots
// they're willing to host an Ittsui rendez-vous at. Token-protected bearer
// link (see the approval email) — no login, same trust model as every
// other bearer link in this app.

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import type { VenuePartnerSlot } from "@/lib/types";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export default function ManagePartnerSlotsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [venueName, setVenueName] = useState<string | null>(null);
  const [slots, setSlots] = useState<VenuePartnerSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide — il manque le jeton d'accès.");
      return;
    }
    fetch(`/api/venue-partners/${params.id}/availability?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
        setVenueName(data.venueName);
        setSlots(data.slots);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Une erreur est survenue."));
  }, [params.id, token]);

  async function save(nextSlots: VenuePartnerSlot[]) {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/venue-partners/${params.id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slots: nextSlots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setSlots(data.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  function addSlot() {
    if (!newDate || !newTime || !slots) return;
    const slot: VenuePartnerSlot = { id: crypto.randomUUID(), date: newDate, time: newTime, booked: false };
    save([...slots, slot].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    setNewDate("");
    setNewTime("");
  }

  function removeSlot(id: string) {
    if (!slots) return;
    save(slots.filter((s) => s.id !== id));
  }

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-14">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>

        {error && (
          <p className="mt-6 text-sm" style={{ color: ACCENT }}>
            {error}
          </p>
        )}

        {!error && slots === null && (
          <p className="mt-6 text-center text-sm" style={{ color: MUTED }}>
            <FriendlyLoading />
          </p>
        )}

        {slots !== null && (
          <>
            <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
              {venueName}
            </h1>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Ajoutez les créneaux où vous pouvez accueillir une rencontre Ittsui. Un créneau déjà réservé
              (en vert) ne peut plus être retiré — la personne compte dessus.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none"
                style={{ borderColor: BORDER }}
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none"
                style={{ borderColor: BORDER }}
              />
              <button
                type="button"
                onClick={addSlot}
                disabled={!newDate || !newTime || saving}
                className="shrink-0 rounded-full px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                Ajouter
              </button>
            </div>

            <ul className="mt-6 space-y-2">
              {slots.length === 0 && (
                <p className="text-sm" style={{ color: MUTED }}>
                  Aucun créneau pour l&apos;instant.
                </p>
              )}
              {slots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border p-3"
                  style={{ borderColor: s.booked ? "#1E7A4C55" : BORDER, backgroundColor: s.booked ? "#1E7A4C0D" : "white" }}
                >
                  <span className="text-sm">
                    {s.date} à {s.time}
                    {s.booked && (
                      <span className="ml-2 text-xs font-medium" style={{ color: "#1E7A4C" }}>
                        Réservé
                      </span>
                    )}
                  </span>
                  {!s.booked && (
                    <button
                      type="button"
                      onClick={() => removeSlot(s.id)}
                      disabled={saving}
                      className="text-xs underline underline-offset-4 disabled:opacity-50"
                      style={{ color: MUTED }}
                    >
                      Retirer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
