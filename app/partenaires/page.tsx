"use client";
// /app/partenaires/page.tsx
// The real first slice of "Ittsui Partenaires" — direct product
// request: let cafés, restaurants, and cultural venues be listed and,
// eventually, booked directly through Ittsui instead of a phone call.
//
// Deliberately honest about scope: this collects real interest from
// real venue owners (see /api/venue-partners) — it does NOT claim a
// live booking engine, real-time availability, or an AI matching layer
// exist yet. Those need real partner venues to exist first; faking any
// of them (e.g. pretending a specific real, unaffiliated restaurant is
// "on Ittsui" and instantly bookable) would mean a real user showing up
// to a "confirmed" booking no venue ever agreed to honor. This page is
// the honest, buildable step toward that vision, not a shortcut past it.

import { useState } from "react";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

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

const CATEGORIES: { value: "cafe" | "restaurant" | "museum" | "autre"; label: string }[] = [
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "museum", label: "Lieu culturel" },
  { value: "autre", label: "Autre" },
];

export default function PartenairesPage() {
  const [venueName, setVenueName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("cafe");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/venue-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName,
          category,
          address,
          contactName,
          contactEmail,
          ...(contactPhone ? { contactPhone } : {}),
          ...(notes ? { notes } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-xl px-6 py-16">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>

        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2rem, 4vw, 2.5rem)" }}>
          Ittsui Partenaires
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed" style={{ color: MUTED }}>
          Chaque semaine, Ittsui propose un lieu à deux personnes qui se retrouvent. L&apos;idée : que votre
          café, votre restaurant ou votre lieu puisse être ce lieu-là directement — et qu&apos;à terme,
          la réservation se fasse depuis Ittsui plutôt que par un appel.
        </p>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          C&apos;est un tout premier pas : aujourd&apos;hui, ce formulaire ne fait que recueillir votre
          intérêt — il n&apos;y a pas encore de réservation en direct ni de calendrier de disponibilité.
          On vous recontacte personnellement pour la suite.
        </p>

        {status === "done" ? (
          <div className="mt-8 rounded-2xl border p-6 text-center" style={{ borderColor: BORDER, backgroundColor: "white" }}>
            <p className="text-sm font-medium">Merci !</p>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>
              Votre demande est bien enregistrée — on vous recontacte directement pour la suite.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium">Nom du lieu</label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Type de lieu</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className="rounded-full border px-3.5 py-2 text-sm transition-colors"
                    style={
                      category === c.value
                        ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                        : { borderColor: BORDER, color: INK }
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Adresse</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Votre nom</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">E-mail</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Téléphone <span className="font-normal" style={{ color: MUTED }}>(optionnel)</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Message <span className="font-normal" style={{ color: MUTED }}>(optionnel)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: ACCENT }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {status === "submitting" ? "Envoi..." : "Envoyer ma demande"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
