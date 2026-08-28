"use client";
// /app/dashboard/archive/ArchiveClient.tsx
// Read-only history of this pair's confirmed rendez-vous — venue, date,
// photo where available. Free for every pair, not a Plus perk (real
// product call 2026-08-28: relationship history is a baseline
// expectation, not a paid differentiator). No new backend: every week's
// data already sits in the same "pairs/{pairId}/weeks" collection
// DashboardClient.tsx already reads from — this is purely a different,
// read-only view of data that already exists.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Fraunces, Work_Sans } from "next/font/google";
import { auth, db, watchAuthState } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair, Week, VenueType } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { mostRecentByCreatedAt } from "@/lib/sort";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { VENUE_PHOTOS } from "@/lib/venuePhotos";

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

// Same derivation DashboardClient.tsx's confirmedVenueType() uses — kept
// as its own small copy rather than a shared import, matching this
// codebase's existing pattern of not sharing tiny per-file helpers
// (see e.g. the FROM_ADDRESS constant in the various email-sending routes).
function confirmedVenueType(w: Week): VenueType | undefined {
  if (!w.optionB) return w.optionA?.venueType;
  const winner = Object.values(w.responses).find((v) => v === "A" || v === "B");
  return winner === "B" ? w.optionB?.venueType : w.optionA?.venueType;
}

function formatWeekOf(weekOf: string): string {
  const d = new Date(`${weekOf}T00:00:00`);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default function ArchiveClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | false>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [pairChecked, setPairChecked] = useState(false);
  const [weeks, setWeeks] = useState<Week[] | null>(null);

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
    return unsub;
  }, []);

  useEffect(() => {
    if (user === false) router.push("/setup");
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
    getDocs(q)
      .then((snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pair);
        setPair(mostRecentByCreatedAt(docs));
        setPairChecked(true);
      })
      .catch(() => setPairChecked(true));
  }, [user]);

  useEffect(() => {
    if (!pair || pair.status !== "active") return;
    const q = query(
      collection(db, "pairs", pair.id, "weeks"),
      where("status", "==", "confirmed"),
      orderBy("weekOf", "desc"),
      limit(52)
    );
    getDocs(q)
      .then((snap) => setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Week)))
      .catch(() => setWeeks([]));
  }, [pair]);

  const loading = user === null || !pairChecked || (pair && weeks === null);

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/dashboard" className="text-sm" style={{ color: MUTED }}>
          ← Tableau de bord
        </Link>
        <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          Vos moments ensemble
        </h1>

        {loading && (
          <p className="mt-8 text-center text-sm" style={{ color: MUTED }}>
            <FriendlyLoading />
          </p>
        )}

        {!loading && (!pair || pair.status !== "active") && (
          <p className="mt-6 text-sm" style={{ color: MUTED }}>
            Aucune personne liée pour le moment.
          </p>
        )}

        {!loading && pair && pair.status === "active" && weeks && weeks.length === 0 && (
          <p className="mt-6 text-sm" style={{ color: MUTED }}>
            Vos moments confirmés apparaîtront ici, à mesure qu&apos;ils se confirment.
          </p>
        )}

        {!loading && weeks && weeks.length > 0 && (
          <div className="mt-8 space-y-4">
            {weeks.map((w) => {
              const type = confirmedVenueType(w);
              const photo = type ? VENUE_PHOTOS[type] : undefined;
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-4 overflow-hidden rounded-2xl border bg-white"
                  style={{ borderColor: BORDER }}
                >
                  {photo && (
                    <div className="relative h-20 w-20 shrink-0">
                      <Image src={photo} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 py-3 pr-4">
                    <p className="truncate text-sm font-medium">{w.venueName}</p>
                    <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                      {formatWeekOf(w.weekOf)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
