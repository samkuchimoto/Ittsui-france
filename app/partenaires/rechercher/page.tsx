"use client";
// /app/partenaires/rechercher/page.tsx
// Public search over real, active Ittsui Partenaires venues — the
// "browse and pick a lieu that can actually be booked" surface, distinct
// from /request/new's free-text venue field (which stays exactly as-is;
// this is additive, not a replacement, since most venues aren't Ittsui
// partners and free text still needs to work for them).

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

const CATEGORIES: { value: "" | "cafe" | "restaurant" | "museum" | "autre"; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "museum", label: "Lieu culturel" },
];

interface SearchResult {
  id: string;
  venueName: string;
  category: string;
  address: string;
  postalCode: string | null;
  nextSlots: { id: string; date: string; time: string }[];
}

export default function SearchPartnersPage() {
  const [postalCode, setPostalCode] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (postalCode) params.set("postalCode", postalCode);
      if (category) params.set("category", category);
      const res = await fetch(`/api/venue-partners/search?${params}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-xl px-6 py-14">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>

        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}>
          Lieux partenaires
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Ces lieux ont un vrai créneau disponible et se réservent directement — sans appel.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            inputMode="numeric"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Code postal (75004)"
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none"
            style={{ borderColor: BORDER }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none sm:w-auto"
            style={{ borderColor: BORDER }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={searching}
            className="shrink-0 rounded-full px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {searching ? "..." : "Chercher"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {results !== null && results.length === 0 && (
            <p className="text-sm" style={{ color: MUTED }}>
              Aucun lieu partenaire disponible pour l&apos;instant dans cette zone.{" "}
              <Link href="/partenaires" className="underline underline-offset-4" style={{ color: ACCENT }}>
                Vous en connaissez un ?
              </Link>
            </p>
          )}
          {results?.map((r) => (
            <Link
              key={r.id}
              href={`/partenaires/${r.id}/reserver`}
              className="block rounded-2xl border p-4 transition-colors hover:border-current"
              style={{ borderColor: BORDER, backgroundColor: "white" }}
            >
              <p className="text-sm font-medium">{r.venueName}</p>
              <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                {r.address}
              </p>
              <p className="mt-2 text-xs" style={{ color: ACCENT }}>
                {r.nextSlots.length} créneau{r.nextSlots.length > 1 ? "x" : ""} disponible
                {r.nextSlots.length > 1 ? "s" : ""} — dès le {r.nextSlots[0]?.date}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
