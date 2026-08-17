"use client";
// /app/dashboard/page.tsx
// Shows this week's proposal (if any) and its status. Real-time via
// Firestore listeners, so both people see a lock/cancel the moment it happens.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, watchAuthState, signOutUser } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair, Week } from "@/lib/types";

export default function DashboardPage() {
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
  // of rendering it as if it were a live dashboard.
  useEffect(() => {
    if (!pair) return;
    if (pair.status === "pending") {
      router.push("/setup/pending");
    } else if (pair.status === "declined" || pair.status === "expired") {
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

  async function handleSignOut() {
    await signOutUser();
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
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement…</p>
      </main>
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
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement…</p>
      </main>
    );
  }

  if (!pair) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">
          Aucune personne liée pour le moment.
        </p>
        <button
          onClick={handleSignOut}
          className="mt-6 text-xs text-neutral-400 underline underline-offset-4"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  const myId = user.uid;
  const myResponse = week && myId ? week.responses[myId] : null;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Cette semaine</h1>
        <button
          onClick={handleSignOut}
          className="text-xs text-neutral-400 underline underline-offset-4"
        >
          Se déconnecter
        </button>
      </div>

      {!week && (
        <p className="mt-6 text-sm text-neutral-500">
          Rien de proposé pour l'instant. Ça arrive automatiquement le jour convenu.
        </p>
      )}

      {week && !week.optionB && (
        <div className="mt-6 rounded-xl border border-neutral-200 p-5">
          <p className="text-base text-neutral-900">{week.confirmationText}</p>

          <StatusBadge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />

          {week.status === "proposed" && !isLapsed(week) && myResponse === null && (
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => queueResponse("yes")}
                disabled={responding}
                className="min-h-[56px] flex-1 rounded-lg bg-neutral-900 text-lg font-medium text-white disabled:opacity-50"
              >
                Oui
              </button>
              <button
                onClick={() => queueResponse("no")}
                disabled={responding}
                className="min-h-[56px] flex-1 rounded-lg border border-neutral-300 text-lg font-medium text-neutral-700 disabled:opacity-50"
              >
                Non
              </button>
            </div>
          )}

          {week.status === "proposed" && !isLapsed(week) && myResponse !== null && (
            <p className="mt-4 text-sm text-neutral-500">
              En attente de l'autre personne…
            </p>
          )}
        </div>
      )}

      {week && week.optionB && (
        <div className="mt-6 rounded-xl border border-neutral-200 p-5">
          <p className="text-base text-neutral-900">
            {week.status === "proposed" ? "Deux propositions pour vous cette semaine :" : week.confirmationText}
          </p>

          <StatusBadge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />

          {week.status === "proposed" && !isLapsed(week) && myResponse === null && (
            <TwoOptionPicker week={week} onVote={queueResponse} voting={responding} />
          )}

          {week.status === "proposed" && !isLapsed(week) && myResponse !== null && (
            <p className="mt-4 text-sm text-neutral-500">
              En attente de l'autre personne…
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
    </main>
  );
}

// A brief pause between choosing and it actually locking in — long enough
// to notice you're doing it, short enough to never feel like friction.
// No skip button: at under 3 seconds, a skip would defeat the one thing
// this exists to do. Declining bypasses it entirely (see queueResponse
// in DashboardPage) — this is only ever in the path of saying yes.
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
          className={`breath mx-auto block h-9 w-9 rounded-full border-2 ${ready ? "border-emerald-600" : "border-neutral-300"}`}
        />
        <p className="mt-4 text-sm text-neutral-500">Un instant, avant de confirmer.</p>
        <p className="mt-1 text-base font-medium text-neutral-900">{venueName}</p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!ready || confirming}
          className="mt-6 min-h-[56px] w-full rounded-lg bg-neutral-900 text-lg font-medium text-white disabled:opacity-40"
        >
          {ready ? "Confirmer" : "…"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-xs text-neutral-400 underline underline-offset-4"
        >
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
        className="touch-pan-y select-none rounded-lg border border-neutral-200 p-4"
        style={{
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
        <p className="text-xs text-neutral-400">{viewing === "A" ? "Option 1 sur 2" : "Option 2 sur 2"}</p>
        <p className="mt-1 text-base font-medium text-neutral-900">{option.venueName}</p>
        <p className="mt-1 text-sm text-neutral-500">{option.venueAddress}</p>
      </div>

      <button
        type="button"
        onClick={() => setViewing((v) => (v === "A" ? "B" : "A"))}
        disabled={voting}
        className="mt-3 w-full text-sm text-neutral-500 underline underline-offset-4 disabled:opacity-50"
      >
        ← Voir l'autre option
      </button>

      <button
        type="button"
        onClick={() => onVote(viewing)}
        disabled={voting}
        className="mt-3 min-h-[56px] w-full rounded-lg bg-neutral-900 text-lg font-medium text-white disabled:opacity-50"
      >
        Choisir cette option →
      </button>
    </div>
  );
}