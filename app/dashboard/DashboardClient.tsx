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
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Fraunces, Work_Sans } from "next/font/google";
import { auth, db, watchAuthState, signOutUser } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, getCountFromServer, doc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair, Week, VenueType } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { CockpitStatus } from "@/app/components/CockpitStatus";
import { MascotPair } from "@/app/components/MascotPair";
import { RELATIONSHIP_PAIR } from "@/lib/mascots.config";
import { Mascot } from "@/app/components/Mascot";
import { SlowLoadFallback } from "@/app/components/SlowLoadFallback";
import { mostRecentByCreatedAt } from "@/lib/sort";
import { tapHaptic } from "@/lib/haptics";
import { registerPasskey, listPasskeys, removePasskey, type PasskeySummary } from "@/lib/passkeyClient";
import { RequestsPanel } from "@/app/dashboard/RequestsPanel";
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

// The small dual bear/rabbit header thumbnail was removed here per
// direct product feedback — this page already has purposeful, larger
// mascot moments (the empty state's xl Mochi, the confirmed-moment nod,
// list-row status badges), so a redundant small pair at the very top
// added noise rather than warmth. Other pages that have no bigger
// mascot moment of their own keep PageMascotHeader.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-12">
        {/* One-tap way back to the homepage from any state on this page —
            real feedback: some screens had no way out short of the
            browser's own back button. */}
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>
        {children}
      </div>
    </main>
  );
}

// Any week from before venueType existed, or sourced from the RAG tier
// which doesn't return one, falls back to a plain tinted block rather
// than a mismatched photo — same honesty rule as DiscoveryTile on the
// discovery-grid branch. VENUE_PHOTOS itself now lives in
// lib/venuePhotos.ts, shared with RequestFormClient and VenuePreviewCard
// (a third, independent copy of this exact mapping was found to have
// never been written at all, silently depending on the AI-mood
// illustration fallback with no API key configured — sharing one source
// closes that drift risk for good).

function VenuePhoto({ venueType }: { venueType?: VenueType }) {
  const src = venueType ? VENUE_PHOTOS[venueType] : undefined;
  return (
    <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl" style={{ backgroundColor: `${ACCENT}14` }}>
      {src && <Image src={src} alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" />}
    </div>
  );
}

// "Cette semaine" was hardcoded before Pair.cadence existed — every pair
// was weekly, so it was always true. Now a monthly/yearly pair would see
// a page heading claiming "this week" while actually being proposed to
// once a month or once a year, which is exactly the kind of mismatch
// worth catching rather than leaving as a stale assumption.
function cadenceHeading(cadence: Pair["cadence"]): string {
  if (cadence === "monthly") return "Ce mois-ci";
  if (cadence === "yearly") return "Cette année";
  return "Cette semaine";
}

function cadenceThisPeriod(cadence: Pair["cadence"]): string {
  if (cadence === "monthly") return "ce mois-ci";
  if (cadence === "yearly") return "cette année";
  return "cette semaine";
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // null = not checked yet, false = checked and not signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [pairChecked, setPairChecked] = useState(false);
  const [pauseUpdating, setPauseUpdating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  // Set from ?plus=success|cancelled, the redirect Stripe Checkout sends
  // people back to (see /api/stripe/checkout's success_url/cancel_url).
  // "success" here means Checkout completed, not that Plus is active yet
  // — the webhook is what actually flips subscriptionStatus, and the
  // existing onSnapshot listener on `pair` below picks that up on its own
  // once it lands, typically within a second or two.
  const [plusRedirect, setPlusRedirect] = useState<"success" | "cancelled" | null>(null);
  useEffect(() => {
    const value = searchParams.get("plus");
    if (value === "success" || value === "cancelled") {
      setPlusRedirect(value);
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [week, setWeek] = useState<Week | null>(null);
  const [responding, setResponding] = useState(false);
  // 3-second escape hatch, matching /invite's existing "slowConnection"
  // pattern — this page never had one at all before, meaning any genuinely
  // stuck load (or just a slow connection) had literally no way out short
  // of a manual browser refresh.
  const [slowLoad, setSlowLoad] = useState(false);

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

  // 3-second ceiling on the loading state — once either check has already
  // resolved, this is a no-op forever (the timer firing after the fact
  // does nothing, since the loading branches below stop rendering).
  useEffect(() => {
    if (user !== null && pairChecked) return;
    const timer = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(timer);
  }, [user, pairChecked]);

  // Find the pair this user belongs to. Note: userIds array-contains also
  // matches a pending pair (inviter's uid is in the array before the
  // partner joins), so status is checked separately below before treating
  // it as an active pair.
  // NOTE: array-contains has no natural order — always take the MOST
  // RECENT pair (createdAt desc), not just docs[0], so a stale
  // declined/expired pair can't shadow a fresh one. Sorted client-side
  // (mostRecentByCreatedAt) rather than via orderBy() in the query itself
  // — array-contains + orderBy on a different field is a composite query
  // Firestore needs an index for, which this project doesn't have; a
  // plain where() needs no index, and one person only ever has a handful
  // of pairs, so fetching all of them instead of a single limit(1) is
  // negligible.
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pair);
        setPair(mostRecentByCreatedAt(docs));
        setPairChecked(true);
      },
      () => {
        // A real Firestore error (rules, connectivity, or — the one this
        // was rewritten to avoid needing — a missing composite index)
        // must still resolve the loading state rather than leave it
        // spinning forever; the redirect/error UI below already handles
        // pair === null correctly.
        setPair(null);
        setPairChecked(true);
      }
    );
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

  // Reversible, distinct from account deletion below: stops new weekly
  // proposals (weekly-propose/route.ts skips any pair with paused === true)
  // without touching the pair itself, its schedule, or its history — the
  // relationship picks back up exactly where it left off on "Reprendre".
  // Firestore rules already let either member of a pair update any field
  // on it (firestore.rules' pairs match), so this writes directly rather
  // than needing a dedicated API route. The onSnapshot listener above is
  // the source of truth for `pair` either way, so this doesn't set it
  // locally — just waits for that listener to reflect the write.
  async function handleTogglePause() {
    if (!pair || pauseUpdating) return;
    setPauseUpdating(true);
    try {
      await updateDoc(doc(db, "pairs", pair.id), { paused: !pair.paused });
    } catch {
      // best-effort — pair state above stays whatever it last was
    } finally {
      setPauseUpdating(false);
    }
  }

  // Real Stripe Checkout redirect — /api/stripe/checkout verifies this
  // user is actually part of `pair` server-side before creating a session,
  // so the ID token below isn't optional the way a plain userId would be
  // elsewhere in this app; this starts a real charge. 501 specifically
  // means STRIPE_PLUS_PRICE_ID isn't configured yet (billing not live),
  // surfaced as its own message rather than a generic error.
  async function handleUpgradeToPlus() {
    if (!user || !pair || upgrading) return;
    setUpgrading(true);
    setUpgradeError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ pairId: pair.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpgradeError(
          res.status === 501
            ? "Le paiement n'est pas encore activé — revenez bientôt."
            : (data?.error ?? "Une erreur est survenue.")
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setUpgradeError("Une erreur est survenue.");
    } finally {
      setUpgrading(false);
    }
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

  // A confirmed two-option week keeps BOTH optionA/optionB on the doc as
  // originally proposed (see api/rsvp/route.ts) — only the top-level
  // venueName/venueAddress get overwritten to the winning choice, never a
  // top-level venueType. The winning option is still derivable client-side
  // from which response value ("A"/"B") the pair actually agreed on.
  function confirmedVenueType(w: Week): VenueType | undefined {
    if (!w.optionB) return w.optionA?.venueType;
    const winner = Object.values(w.responses).find((v) => v === "A" || v === "B");
    return winner === "B" ? w.optionB?.venueType : w.optionA?.venueType;
  }

  // Still checking auth state
  if (user === null) {
    return (
      <Shell>
        <p className="text-center text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
        <SlowLoadFallback show={slowLoad} />
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
        <SlowLoadFallback show={slowLoad} />
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
          {/* Real gap fixed 2026-08-28: this screen previously had zero
              mention of Plus, a dead end for anyone who lands here without
              an active pair yet — subscriptionStatus lives on the Pair
              (see lib/types.ts), so real purchase genuinely can't happen
              until one exists; this is a link to the explanation, not a
              purchase button. */}
          <p className="mt-3 text-xs" style={{ color: MUTED }}>
            <Link href="/#plus" className="underline underline-offset-4">
              Découvrir Ittsui Plus
            </Link>
          </p>
          <button onClick={handleSignOut} className="mt-6 text-xs underline underline-offset-4" style={{ color: MUTED }}>
            Se déconnecter
          </button>
          <div className="mt-8 border-t pt-4" style={{ borderColor: BORDER }}>
            <button onClick={handleDeleteAccount} className="text-xs text-red-500 underline underline-offset-4">
              Supprimer mon compte
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const myId = user.uid;
  const myResponse = week && myId ? week.responses[myId] : null;

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>{cadenceHeading(pair.cadence)}</h1>
        <button onClick={handleSignOut} className="text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Se déconnecter
        </button>
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

      {pair && (
        <div className="mt-3">
          <CockpitStatus pair={pair} week={week} />
        </div>
      )}

      {/* Real purchase entry point (2026-08-28) — the paid tier used to
          only ever link out to the marketing page's teaser, with no way to
          actually become Plus from inside the app itself. subscriptionStatus
          here reflects the webhook's own write, never this button directly
          — a click only ever starts a Checkout session.

          The redirect messages live OUTSIDE the active/not-yet-active split
          below on purpose — real bug found 2026-08-28: they used to sit
          inside the "not active" branch only, so the very common case where
          the webhook lands before this page even finishes rendering meant
          "success" never got a chance to show at all, jumping straight to
          the badge with no acknowledgment of the payment someone just
          actually made. Now it shows regardless of which state the badge
          below is already in. */}
      {plusRedirect === "success" && (
        <p className="mt-2 text-xs" style={{ color: ACCENT }}>
          Merci — un vrai geste pour rester proche de {pair.partnerName ?? "cette personne"}. 💛
        </p>
      )}
      {plusRedirect === "cancelled" && (
        <p className="mt-2 text-xs" style={{ color: MUTED }}>
          Pas de souci, rien n&apos;a été débité — vous pouvez devenir membre fondateur quand vous voulez.
        </p>
      )}

      {pair.subscriptionStatus === "active" ? (
        <span
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          ✓ Membre Fondateur
        </span>
      ) : (
        <div className="mt-3">
          <button
            onClick={handleUpgradeToPlus}
            disabled={upgrading}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {upgrading ? "..." : "Devenir membre fondateur — 1 €/mois"}
          </button>
          {upgradeError && (
            <p className="mt-1.5 text-xs" style={{ color: ACCENT }}>
              {upgradeError}
            </p>
          )}
          <p className="mt-1.5 text-xs" style={{ color: MUTED }}>
            <Link href="/#plus" className="underline underline-offset-4">
              En savoir plus
            </Link>
          </p>
        </div>
      )}

      {pair && (
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: MUTED }}>
          {pair.paused && (
            <span className="rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: `${MUTED}1A`, color: MUTED }}>
              En pause
            </span>
          )}
          <button onClick={handleTogglePause} disabled={pauseUpdating} className="underline underline-offset-4 disabled:opacity-60">
            {pauseUpdating ? "..." : pair.paused ? "Reprendre les propositions" : "Mettre en pause"}
          </button>
        </div>
      )}

      {/* Cross-fades whenever the actual displayed state changes (empty ->
          proposed -> confirmed, etc.) instead of jump-cutting — the same
          "reduce the cognitive jump between steps" pattern applied to
          /geste/nouveau's mode switcher, here driven by real-time
          Firestore updates rather than a click. Purely presentational:
          every handler/prop below is unchanged. */}
      <AnimatePresence mode="wait">
        {!week ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 flex flex-col items-center gap-3 py-4 text-center"
          >
            {/* Single large hero character — Mochi's "little joy, full of
                wonder" fits the waiting mood itself, independent of which
                relationship this pair is. Gentle idle float since this is
                exactly the kind of contained, occasional hero moment worth
                the motion, unlike a bust icon or a header mark. */}
            <Mascot name="mochi" size="xl" float className={pair?.paused ? "opacity-40" : undefined} />
            <p className="text-sm" style={{ color: MUTED }}>
              {pair?.paused
                ? "En pause — aucune proposition ne sera envoyée tant que ce n'est pas repris."
                : "Rien de proposé pour l'instant. Ça arrive automatiquement le jour convenu."}
            </p>
          </motion.div>
        ) : !week.optionB ? (
          <motion.div
            key={`one-${week.id}-${isLapsed(week) ? "lapsed" : week.status}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-2xl border p-5"
            style={{ borderColor: BORDER, backgroundColor: "white" }}
          >
            <VenuePhoto venueType={week.optionA?.venueType} />
            <p className="text-base font-medium">{week.confirmationText}</p>

            <StatusBadge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />
            <ConfirmedMascotMoment
              status={isLapsed(week) ? "cancelled" : week.status}
              lapsed={isLapsed(week)}
              relationshipKind={pair.relationshipKind}
              venueType={confirmedVenueType(week)}
            />
            <PlusNudge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />
            <ReservationNote week={week} isLapsed={isLapsed(week)} confirmedVenueType={confirmedVenueType} />
            <NotificationTrail log={week.notificationLog} />

            {week.status === "proposed" && !isLapsed(week) && myResponse === null && (
              <div className="mt-5 flex gap-3">
                <motion.button
                  onClick={() => queueResponse("yes")}
                  disabled={responding}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="min-h-[56px] flex-1 rounded-full text-lg font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  Oui
                </motion.button>
                <motion.button
                  onClick={() => queueResponse("no")}
                  disabled={responding}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="min-h-[56px] flex-1 rounded-full border text-lg font-medium disabled:opacity-50"
                  style={{ borderColor: BORDER, color: INK }}
                >
                  Non
                </motion.button>
              </div>
            )}

            {week.status === "proposed" && !isLapsed(week) && myResponse !== null && (
              <p className="mt-4 text-sm" style={{ color: MUTED }}>
                En attente de l&apos;autre personne…
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`two-${week.id}-${isLapsed(week) ? "lapsed" : week.status}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-2xl border p-5"
            style={{ borderColor: BORDER, backgroundColor: "white" }}
          >
            <p className="text-base font-medium">
              {week.status === "proposed" ? `Deux propositions pour vous ${cadenceThisPeriod(pair.cadence)} :` : week.confirmationText}
            </p>

            <StatusBadge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />
            <ConfirmedMascotMoment
              status={isLapsed(week) ? "cancelled" : week.status}
              lapsed={isLapsed(week)}
              relationshipKind={pair.relationshipKind}
              venueType={confirmedVenueType(week)}
            />
            <PlusNudge status={isLapsed(week) ? "cancelled" : week.status} lapsed={isLapsed(week)} />
            <ReservationNote week={week} isLapsed={isLapsed(week)} confirmedVenueType={confirmedVenueType} />
            <NotificationTrail log={week.notificationLog} />

            {week.status === "proposed" && !isLapsed(week) && myResponse === null && (
              <TwoOptionPicker week={week} onVote={queueResponse} voting={responding} />
            )}

            {week.status === "proposed" && !isLapsed(week) && myResponse !== null && (
              <p className="mt-4 text-sm" style={{ color: MUTED }}>
                En attente de l&apos;autre personne…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <HitbonenutPause
        open={pendingResponse !== null}
        venueName={pendingVenueName ?? ""}
        onConfirm={confirmPending}
        onCancel={() => setPendingResponse(null)}
        confirming={responding}
      />

      <div className="mt-10 border-t pt-6" style={{ borderColor: BORDER }}>
        <RequestsPanel />
      </div>

      <div className="mt-8 border-t pt-6" style={{ borderColor: BORDER }}>
        <PasskeyManager />
      </div>

      {/* Deliberately separated from "Se déconnecter" above (they used to
          sit side by side as two same-size underlined text links, an easy
          mis-tap between a routine action and an irreversible one) — its
          own labeled section at the very end of the page, matching the
          usual "danger zone" placement convention. */}
      <div className="mt-8 border-t pt-6" style={{ borderColor: BORDER }}>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
          Zone de danger
        </p>
        <button onClick={handleDeleteAccount} className="mt-3 text-xs text-red-500 underline underline-offset-4">
          Supprimer mon compte
        </button>
      </div>
    </Shell>
  );
}

// Account-level setting, not tied to any one pair — additional sign-in
// method alongside Google (lib/firebase.ts's signInWithGoogle, unchanged),
// so this only ever adds passkeys to an account that's already signed in
// some other way. "Lost device" handling is exactly listing + removing:
// there's no other recovery path for a passkey that's gone, by design —
// the private key never left that device in the first place.
function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setPasskeys(await listPasskeys());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    setBusy(true);
    setMessage(null);
    const result = await registerPasskey();
    setBusy(false);
    if (result.ok) {
      setMessage("Clé d'accès ajoutée.");
      refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    await removePasskey(id);
    setBusy(false);
    refresh();
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
        Clés d&apos;accès
      </p>
      {passkeys && passkeys.length > 0 && (
        <ul className="mt-3 space-y-2">
          {passkeys.map((pk) => (
            <li key={pk.id} className="flex items-center justify-between text-sm">
              <span>{pk.label}</span>
              <button
                onClick={() => handleRemove(pk.id)}
                disabled={busy}
                className="text-xs text-red-500 underline underline-offset-4 disabled:opacity-50"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      {passkeys && passkeys.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Aucune clé d&apos;accès configurée — connectez-vous plus vite la prochaine fois, sans mot de passe.
        </p>
      )}
      <button
        onClick={handleAdd}
        disabled={busy}
        className="mt-3 text-xs underline underline-offset-4 disabled:opacity-50"
        style={{ color: ACCENT }}
      >
        + Ajouter une clé d&apos;accès sur cet appareil
      </button>
      {message && (
        <p className="mt-2 text-xs" style={{ color: MUTED }}>
          {message}
        </p>
      )}
    </div>
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
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={!ready || confirming}
          whileTap={ready ? { scale: 0.96 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="mt-6 min-h-[56px] w-full rounded-full text-lg font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          {ready ? "Confirmer" : "…"}
        </motion.button>
        <button type="button" onClick={onCancel} className="mt-3 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// The "cozy nod on 1-click validation" touchpoint, for the real
// confirmation (not just the landing-page demo). Only mounts once status
// is actually "confirmed" — the nod plays once, on that mount, rather
// than looping or re-triggering on every re-render. relationshipKind
// comes straight from the real Pair document when present (see
// lib/types.ts) so this genuinely varies by category instead of always
// showing the default pair.
// Real composited "mascot holding a venue icon" art doesn't exist (no
// image-gen tool available), so the venue association is a small emoji
// badge riding along next to the pair instead — an honest approximation
// of "the mascot duo + where you're going" rather than a literal claim
// this is bespoke illustration.
const VENUE_EMOJI: Partial<Record<VenueType, string>> = {
  cafe: "☕",
  restaurant: "🍽️",
  home: "🏠",
  park: "🌳",
  museum: "🖼️",
};

function ConfirmedMascotMoment({
  status,
  lapsed,
  relationshipKind,
  venueType,
}: {
  status: Week["status"];
  lapsed: boolean;
  relationshipKind?: Pair["relationshipKind"];
  venueType?: VenueType;
}) {
  if (status !== "confirmed" || lapsed) return null;
  const emoji = venueType ? VENUE_EMOJI[venueType] : undefined;
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="relative inline-flex">
        <MascotPair pairId={relationshipKind ? RELATIONSHIP_PAIR[relationshipKind] : undefined} size={32} nod mood="success" />
        {emoji && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow-sm">
            {emoji}
          </span>
        )}
      </span>
      <p className="text-xs" style={{ color: MUTED }}>Rendez-vous calé. On se tait jusqu&apos;à la prochaine fois.</p>
    </div>
  );
}

// Surfaced at the one moment the product has just visibly worked — the
// core loop delivering a real, locked-in rendez-vous — rather than as a
// disconnected line in a footer nobody scrolls to. Kept deliberately
// quiet (a plain text link, not a banner or button) to match this app's
// existing restraint elsewhere, not a paywall interruption; real
// 2026-08-28 pricing feedback (Dror Sharon) drove both the €1/mois
// figure and the "show the value, then ask" placement.
function PlusNudge({ status, lapsed }: { status: Week["status"]; lapsed: boolean }) {
  if (status !== "confirmed" || lapsed) return null;
  return (
    <p className="mt-2 text-xs" style={{ color: MUTED }}>
      <Link href="/#plus" className="underline underline-offset-4">
        Ittsui Plus, 1&nbsp;€/mois
      </Link>{" "}
      — le prix d&apos;un café pour garder ce lien vivant.
    </p>
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

// Honest status, not just a checkmark and a venue name: a restaurant or
// museum commonly still needs an actual reservation or ticket, which
// nothing in this app has booked — see the identical amber/green
// distinction on /request/[requestId]'s accept screen for the fuller
// reasoning. Silent for a proposed/cancelled/lapsed week, or any venue
// type that doesn't typically need booking (cafe/park/home) — absence of
// the card already signals "nothing to do here" without adding noise.
function ReservationNote({
  week,
  isLapsed,
  confirmedVenueType,
}: {
  week: Week;
  isLapsed: boolean;
  confirmedVenueType: (w: Week) => VenueType | undefined;
}) {
  if (week.status !== "confirmed" || isLapsed) return null;
  const type = confirmedVenueType(week);
  if (type !== "restaurant" && type !== "museum") return null;
  return (
    <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "#B0890033", backgroundColor: "#B0890014" }}>
      <p className="text-sm font-medium" style={{ color: "#B08900" }}>
        ⚠ Réservation requise
      </p>
      <p className="mt-1 text-xs" style={{ color: MUTED }}>
        {week.venueName} n&apos;a pas été réservé pour vous — pensez à appeler ou réserver directement.
      </p>
    </div>
  );
}

// The actual delivery record for the latest notification (proposal or
// lock confirmation) — real status, not an assumption that firing the
// send meant it arrived. "X/Y" rather than a bare checkmark on purpose:
// a push failing over to email still counts as delivered, but a genuine
// failure (no token, no email, or the Resend call itself failing) is
// visibly different from success rather than silently the same green tick.
function NotificationTrail({ log }: { log: Week["notificationLog"] }) {
  if (!log || log.length === 0) return null;
  const latest = log[log.length - 1];
  const delivered = latest.results.filter((r) => r.status === "push" || r.status === "email").length;
  const total = latest.results.length;
  const allDelivered = total > 0 && delivered === total;
  const eventLabel = latest.event === "proposed" ? "Proposition" : "Confirmation";
  const time = new Date(latest.sentAt).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <p className="mt-2 text-xs" style={{ color: allDelivered ? MUTED : ACCENT }}>
      {allDelivered ? "✓" : "⚠"} {eventLabel} notifiée {delivered}/{total} · {time}
    </p>
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
