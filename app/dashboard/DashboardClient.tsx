"use client";
// /app/dashboard/DashboardClient.tsx
// Shows this week's proposal (if any) and its status. Real-time via
// Firestore listeners, so both people see a lock/cancel the moment it happens.
//
// Split out of page.tsx so page.tsx can stay a Server Component that
// exports `dynamic = "force-dynamic"` — that route-segment config is
// only honored in Server Components, not files starting with
// "use client". Without the split, Next.js still attempts a build-time
// prerender of this page, which runs lib/firebase.ts's client init in
// the Node build sandbox — harmless when real NEXT_PUBLIC_* env vars are
// present (Vercel always has them), but a hard build failure anywhere
// they aren't (a clean CI checkout with no secrets configured).
//
// Brought onto the same design system as app/page.tsx and
// app/setup/SetupClient.tsx (Fraunces/Work Sans, INK/MUTED/ACCENT/BORDER)
// — this is the screen people actually see every week, and it had never
// received that treatment, unlike the marketing and setup pages. Every
// piece of existing logic (auth watcher, Firestore listeners, respond(),
// the Hitbonenut pause timing, the swipe gesture) is unchanged; only
// presentation and the new venue photo are new. Status badge colors
// (amber/emerald/neutral) stay as semantic status coding, not brand
// chrome, same reasoning as leaving error text on its own color pattern
// elsewhere in the app.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Fraunces, Work_Sans } from "next/font/google";
import { auth, db, watchAuthState, signOutUser } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, getCountFromServer } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair, Week, VenueType } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { tapHaptic } from "@/lib/haptics";

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

const INK = "#1C1917";
const MUTED = "#78716C";
const ACCENT = "#A84B38";
const BORDER = "#E8E2D9";
const CREAM = "#FBF9F5";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FBF9F5] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-12">{children}</div>
    </main>
  );
}

// Real photos for venue types with a confident match in /public — same
// assets already used elsewhere in the app, not new stock. Restaurant and
// museum (and any week from before venueType existed, or sourced from the
// RAG tier which doesn't return one) fall back to a plain tinted block
// rather than a mismatched photo — same honesty rule as DiscoveryTile on
// the discovery-grid branch.
const VENUE_PHOTOS: Partial<Record<VenueType, string>> = {
  cafe: "/friends-cafe-terrace.jpg",
  park: "/grandmother-granddaughter-park.jpg",
  home: "/couple-living-room.jpg",
};

function VenuePhoto({ venueType }: { venueType?: VenueType }) {
  const src = venueType ? VENUE_PHOTOS[venueType] : undefined;
  return (
    <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl" style={{ backgroundColor: `${ACCENT}14` }}>
      {src && <Image src={src} alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" />}
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();

  // null = not checked yet, false = checked and not signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [pairChecked, setPairChecked] = useState(false);
  const [week, setWeek] = useState<Week | null>(null);
  const [responding, setResponding] = useState(false);

  // Watch auth state on mount
  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u ?? false);
    });
    return unsub;
  }, []);

  // Redirect to setup if not signed in
  useEffect(() => {
    if (user === false) {
      router.push("/setup");
    }
  }, [user, router]);

  // Find the pair this user belongs to. Note: userIds array-contains also
  // matches a pending pair (inviter's uid is in the array before the
  // partner joins), so status is checked separately below before treating
  // it as an active pair.
  // NOTE: array-contains has no natural order — always take the MOST
  // RECENT pair (createdAt desc), not just docs[0], so a stale
  // declined/expired pair can't shadow a fresh one.
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "pairs"),
      where("userIds", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPair({ id: snap.docs[0].id, ...snap.docs[0].data() } as Pair);
      } else {
        setPair(null);
      }
      setPairChecked(true);
    });
    return unsub;
  }, [user]);

  // If the matched pair isn't active yet, route to the right place instead
  // of rendering it as if it were a live dashboard. Was previously missing
  // the "cancelled" status (a pair obsoleted by a newer invite) — since
  // the render below treats anything non-active as "still loading," a
  // cancelled pair with no matching redirect branch here meant the page
  // just showed a spinner forever with no way out. Covering every
  // non-active, non-pending status the same way (-> /setup) instead of
  // enumerating each one closes that gap for good.
  useEffect(() => {
    if (!pair) return;
    if (pair.status === "pending") {
      router.push("/setup/pending");
    } else if (pair.status !== "active") {
      router.push("/setup");
    }
  }, [pair, router]);

  // Listen for the most recent week doc under that pair, only once active
  useEffect(() => {
    if (!pair || pair.status !== "active") return;
    const q = query(
      collection(db, "pairs", pair.id, "weeks"),
      orderBy("weekOf", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setWeek({ id: snap.docs[0].id, ...snap.docs[0].data() } as Week);
      }
    });
    return unsub;
  }, [pair]);

  // How many rendez-vous this pair has actually locked in, ever — the
  // dashboard otherwise only ever shows this single week's proposal, with
  // no sense of accumulated momentum (unlike friendship-tracker apps,
  // whose whole premise is showing relationship history). A count query,
  // not a live listener: this only changes once a week at most, so a
  // one-time read is enough and cheaper than a standing subscription.
  // Re-fetched whenever this week's own status changes to "confirmed" so
  // it doesn't need its own separate write path or day-boundary logic.
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  useEffect(() => {
    if (!pair || pair.status !== "active") return;
    const q = query(collection(db, "pairs", pair.id, "weeks"), where("status", "==", "confirmed"));
    getCountFromServer(q)
      .then((snap) => setConfirmedCount(snap.data().count))
      .catch(() => setConfirmedCount(null));
  }, [pair, week?.status]);

  async function handleSignOut() {
    await signOutUser();
  }

  // GDPR Article 17 (droit à l'effacement) — see api/user/delete/route.ts
  // for exactly what is and isn't deleted and why. window.confirm is a
  // deliberately minimal irreversibility gate; nothing fancier is needed
  // for a single yes/no on a destructive action.
  async function handleDeleteAccount() {
    if (!user) return;
    const confirmed = window.confirm(
      "Supprimer définitivement votre compte Ittsui ? Cette action est irréversible."
    );
    if (!confirmed) return;
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/user/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
    } finally {
      await signOutUser();
      router.push("/");
    }
  }

  async function respond(response: "yes" | "no" | "A" | "B") {
    if (!pair || !week || !user) return;
    setResponding(true);
    try {
      await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId: pair.id,
          weekId: week.id,
          userId: user.uid,
          response,
        }),
      });
    } finally {
      setResponding(false);
    }
  }

  // Hitbonenut: a brief, unskippable-but-short pause between choosing and
  // it actually locking in — the moment worth protecting is agreeing to
  // something, not declining, so "no" bypasses this and stays instant
  // (matches the existing no-renegotiation rule elsewhere in this file).
  const [pendingResponse, setPendingResponse] = useState<"yes" | "A" | "B" | null>(null);

  function queueResponse(response: "yes" | "no" | "A" | "B") {
    if (response === "no") {
      respond("no");
      return;
    }
    setPendingResponse(response);
  }

  async function confirmPending() {
    if (!pendingResponse) return;
    tapHaptic();
    await respond(pendingResponse);
    setPendingResponse(null);
  }

  const pendingVenueName =
    pendingResponse === "A" ? week?.optionA?.venueName : pendingResponse === "B" ? week?.optionB?.venueName : week?.venueName;

  // A proposal nobody acted on more than a day past its meeting time just
  // goes quiet rather than lingering — display-only, no write, matches
  // "silence the rest of the week" without needing a cron job for it.
  function isLapsed(w: Week): boolean {
    return w.status === "proposed" && Date.now() > new Date(w.proposedTime).getTime() + 24 * 60 * 60 * 1000;
  }

  // Still checking auth state
  if (user === null) {
    return (
      <Shell>
        <p className="text-center text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
      </Shell>
    );
  }

  // Not signed in, redirect effect above handles navigation
  if (user === false) {
    return null;
  }

  // Signed in, still checking for a pair, or a pending/declined/expired
  // pair that's about to redirect away
  if (!pairChecked || (pair && pair.status !== "active")) {
    return (
      <Shell>
        <p className="text-center text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
      </Shell>
    );
  }

  if (!pair) {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-sm" style={{ color: MUTED }}>
            Aucune personne liée pour le moment.
          </p>
          <button onClick={handleSignOut} className="mt-6 text-xs underline underline-offset-4" style={{ color: MUTED }}>
            Se déconnecter
          </button>
          <button
            onClick={handleDeleteAccount}
            className="mt-2 block text-xs text-red-500 underline underline-offset-4"
          >
            Supprimer mon compte
          </button>
        </div>
      </Shell>
    );
  }

  const myId = user.uid;
  const myResponse = week && myId ? week.responses[myId] : null;

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>Cette semaine</h1>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleSignOut} className="text-xs underline underline-offset-4" style={{ color: MUTED }}>
            Se déconnecter
          </button>
          <button onClick={handleDeleteAccount} className="text-xs text-red-500 underline underline-offset-4">
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Momentum, not just this week's card — silent for a brand-new pair
          (0 confirmed yet isn't an encouraging thing to announce). */}
      {!!confirmedCount && (
        <span
          className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          {confirmedCount === 1 ? "1er rendez-vous protégé ensemble" : `${confirmedCount}e rendez-vous protégé ensemble`}
        </span>
      )}

      {!week && (
        <p className="mt-6 text-sm" style={{ color: MUTED }}>
          Rien de proposé pour l&apos;instant. Ça arrive automatiquement le jour convenu.
        </p>
      )}

      {week && !week.optionB && (
        <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: BORDER, backgroundColor: "white" }}>
          <VenuePhoto venueType={week.optionA?.venueType} />
          <p className="text-base font-medium">{week.confirmationText}</p>

          <StatusBadge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />

          {week.status === "proposed" && !isLapsed(week) && myResponse === null && (
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => queueResponse("yes")}
                disabled={responding}
                className="min-h-[56px] flex-1 rounded-full text-lg font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                Oui
              </button>
              <button
                onClick={() => queueResponse("no")}
                disabled={responding}
                className="min-h-[56px] flex-1 rounded-full border text-lg font-medium disabled:opacity-50"
                style={{ borderColor: BORDER, color: INK }}
              >
                Non
              </button>
            </div>
          )}

          {week.status === "proposed" && !isLapsed(week) && myResponse !== null && (
            <p className="mt-4 text-sm" style={{ color: MUTED }}>
              En attente de l&apos;autre personne…
            </p>
          )}
        </div>
      )}

      {week && week.optionB && (
        <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: BORDER, backgroundColor: "white" }}>
          <p className="text-base font-medium">
            {week.status === "proposed" ? "Deux propositions pour vous cette semaine :" : week.confirmationText}
          </p>

          <StatusBadge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />

          {week.status === "proposed" && !isLapsed(week) && myResponse === null && (
            <TwoOptionPicker week={week} onVote={queueResponse} voting={responding} />
          )}

          {week.status === "proposed" && !isLapsed(week) && myResponse !== null && (
            <p className="mt-4 text-sm" style={{ color: MUTED }}>
              En attente de l&apos;autre personne…
            </p>
          )}
        </div>
      )}

      <HitbonenutPause
        open={pendingResponse !== null}
        venueName={pendingVenueName ?? ""}
        onConfirm={confirmPending}
        onCancel={() => setPendingResponse(null)}
        confirming={responding}
      />
    </Shell>
  );
}

// A brief pause between choosing and it actually locking in — long enough
// to notice you're doing it, short enough to never feel like friction.
// No skip button: at under 3 seconds, a skip would defeat the one thing
// this exists to do. Declining bypasses it entirely (see queueResponse
// in DashboardClient) — this is only ever in the path of saying yes.
const PAUSE_MS = 2400;

function HitbonenutPause({
  open,
  venueName,
  onConfirm,
  onCancel,
  confirming,
}: {
  open: boolean;
  venueName: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const timer = setTimeout(() => setReady(true), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" role="dialog" aria-modal="true">
      <style jsx>{`
        .breath {
          animation: breathe 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .breath {
            animation: none;
          }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center">
        <span
          className={`breath mx-auto block h-9 w-9 rounded-full border-2 ${ready ? "border-emerald-600" : ""}`}
          style={ready ? {} : { borderColor: BORDER }}
        />
        <p className="mt-4 text-sm" style={{ color: MUTED }}>
          Un instant, avant de confirmer.
        </p>
        <p className="mt-1 text-base font-medium">{venueName}</p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!ready || confirming}
          className="mt-6 min-h-[56px] w-full rounded-full text-lg font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          {ready ? "Confirmer" : "…"}
        </button>
        <button type="button" onClick={onCancel} className="mt-3 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, lapsed = false }: { status: Week["status"]; lapsed?: boolean }) {
  const styles: Record<Week["status"], string> = {
    proposed: "bg-amber-50 text-amber-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  const labels: Record<Week["status"], string> = {
    proposed: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé",
  };
  return (
    <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {lapsed ? "Expiré" : labels[status]}
    </span>
  );
}

// Two real venue options, view-both + large tap-to-choose buttons as the
// primary path (56px touch targets — readable and tappable across ages),
// plus an optional drag gesture mirroring the marketing page's FridayCard
// demo (swipe right = choose what's showing, swipe left = see the other
// option). Confirms only once both people pick the same option — see
// api/rsvp/route.ts.
const SWIPE_THRESHOLD = 76;

function TwoOptionPicker({
  week,
  onVote,
  voting,
}: {
  week: Week;
  onVote: (choice: "A" | "B") => void;
  voting: boolean;
}) {
  const [viewing, setViewing] = useState<"A" | "B">("A");
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const option = viewing === "A" ? week.optionA! : week.optionB!;

  function beginDrag(clientX: number) {
    if (voting) return;
    draggingRef.current = true;
    startXRef.current = clientX;
  }
  function moveDrag(clientX: number) {
    if (!draggingRef.current) return;
    setDragX(Math.max(-140, Math.min(140, clientX - startXRef.current)));
  }
  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragX > SWIPE_THRESHOLD) {
      onVote(viewing);
    } else if (dragX < -SWIPE_THRESHOLD) {
      setViewing((v) => (v === "A" ? "B" : "A"));
    }
    setDragX(0);
  }

  return (
    <div className="mt-5">
      <div
        className="touch-pan-y select-none rounded-2xl border p-4"
        style={{
          borderColor: BORDER,
          transform: `translateX(${dragX}px) rotate(${dragX / 26}deg)`,
          transition: draggingRef.current ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
        onTouchStart={(e) => beginDrag(e.touches[0].clientX)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
        onTouchEnd={endDrag}
        onPointerDown={(e) => beginDrag(e.clientX)}
        onPointerMove={(e) => moveDrag(e.clientX)}
        onPointerUp={endDrag}
        onPointerLeave={() => draggingRef.current && endDrag()}
      >
        <VenuePhoto venueType={option.venueType} />
        <p className="text-xs" style={{ color: MUTED }}>
          {viewing === "A" ? "Option 1 sur 2" : "Option 2 sur 2"}
        </p>
        <p className="mt-1 text-base font-medium">{option.venueName}</p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {option.venueAddress}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setViewing((v) => (v === "A" ? "B" : "A"))}
        disabled={voting}
        className="mt-3 w-full text-sm underline underline-offset-4 disabled:opacity-50"
        style={{ color: MUTED }}
      >
        ← Voir l&apos;autre option
      </button>

      <button
        type="button"
        onClick={() => onVote(viewing)}
        disabled={voting}
        className="mt-3 min-h-[56px] w-full rounded-full text-lg font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: ACCENT }}
      >
        Choisir cette option →
      </button>
    </div>
  );
}
