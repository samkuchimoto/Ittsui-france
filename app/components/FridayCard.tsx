"use client";
// /app/components/FridayCard.tsx
// The homepage's live proposal card — the product's entire mechanic,
// playable before signing up.
//
// Three states: default -> swapped -> confirmed. Two ways in: buttons or
// a native drag gesture (swipe right = validate, swipe left = swap). No
// gesture library for the drag maths — pointer coordinates and a
// spring-back transform, wrapped in useTransition so the snap feels
// immediate while React schedules the state update.
//
// Kept on useTransition deliberately (a 2026-08-28 review proposed
// removing it, citing "frame drops alongside Framer Motion values" —
// rejected: framer-motion's useMotionValue/useTransform already update via
// direct DOM mutation, bypassing React's render cycle entirely, so the
// drag itself was never competing with these state transitions in the way
// that claim assumed, and no measurement backed it up).
//
// Two changes driven by real user feedback:
//
//   1. The venue is a button now, not a caption ("Image not clikable",
//      "Adress not / Je rentre"). Tapping it opens VenueSheet with the
//      real address, the nearest metro, and a live map link.
//   2. Confirming no longer ends on a self-congratulatory checkmark. It
//      reveals the actual SMS/WhatsApp the invitee would receive, plus
//      the one fact that dissolves most of the scepticism about adopting
//      a new social app: the other person needs no account and no
//      install. That guarantee used to be a 12px line of grey text in
//      the hero; here it lands at the moment someone is actually
//      wondering "yes, but what does this make my friend do?".
//
// The card is driven by a scenario (lib/sandboxScenarios.ts) rather than
// two hardcoded venues, so the duo-context tiles above it can reconfigure
// it instead of sitting there as dead decoration.

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { MascotPair } from "@/app/components/MascotPair";
import { IconCheck } from "@/app/components/HomeIcons";
import { VenueSheet } from "@/app/components/VenueSheet";
import { SANDBOX_SCENARIOS, type SandboxScenario, type SandboxVenue } from "@/lib/sandboxScenarios";

type CardState = "default" | "swapped" | "confirmed";

const SWIPE_THRESHOLD = 76; // px before a drag commits to an action

export function FridayCard({ scenario = SANDBOX_SCENARIOS[0] }: { scenario?: SandboxScenario }) {
  const [cardState, setCardState] = useState<CardState>("default");
  const [skipped, setSkipped] = useState(false);
  const [sheetVenue, setSheetVenue] = useState<SandboxVenue | null>(null);
  const [, startTransition] = useTransition();

  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spring physics via framer-motion instead of a hand-rolled
  // pointer/touch tracker — the AGENTS.md "no animation library" stance
  // this replaced was a conscious, explicit product call (tester
  // feedback: too formal next to Duolingo/Alan), not a quiet workaround.
  // dragConstraints at {0,0} + dragElastic lets the card move freely
  // under a finger/pointer but spring back to center on release unless a
  // swipe crosses SWIPE_THRESHOLD, at which point the state change below
  // takes over instead of letting it settle back.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-140, 140], [-8, 8]);

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  // Switching duo context mid-demo has to reset the card: leaving it on
  // "confirmed" would show a rendez-vous locked at the previous
  // scenario's venue under the new context's heading.
  useEffect(() => {
    setCardState("default");
    setSkipped(false);
    setSheetVenue(null);
  }, [scenario.id]);

  function handleDragEnd(_event: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      confirmCard();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      swapCard();
    }
  }

  function swapCard() {
    startTransition(() => {
      setCardState((s) => (s === "swapped" ? "default" : "swapped"));
    });
  }

  function confirmCard() {
    startTransition(() => setCardState("confirmed"));
  }

  function resetDemo() {
    startTransition(() => {
      setCardState("default");
      setSkipped(false);
    });
  }

  function skipWeek() {
    setSkipped(true);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setCardState("default");
        setSkipped(false);
      });
    }, 1800);
  }

  const venue = cardState === "swapped" ? scenario.alternative : scenario.primary;
  const { sampleRecipient, when } = scenario;

  return (
    <div className="mx-auto max-w-sm">
      <motion.div
        className="touch-pan-y select-none overflow-hidden rounded-3xl border bg-white shadow-sm"
        style={{ borderColor: BORDER, x, rotate }}
        drag={cardState === "confirmed" ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        dragTransition={{ bounceStiffness: 320, bounceDamping: 22 }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.03 }}
      >
        {cardState === "confirmed" ? (
          <div className="px-6 py-8 text-center">
            <MascotPair size={40} nod />
            <h3 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.35rem" }}>
              C&apos;est bloqué.
            </h3>
            <p className="mx-auto mt-1.5 max-w-[26ch] text-sm" style={{ color: MUTED }}>
              {venue.name} · {when}. Plus rien à gérer jusqu&apos;à la semaine prochaine.
            </p>

            {/* The message the invitee actually receives. Showing it
                verbatim is the point: no mystery about what lands in
                someone else's phone, and no account on the other end. */}
            <div className="mt-5 rounded-2xl border p-4 text-left" style={{ borderColor: BORDER, backgroundColor: "#FFFDF9" }}>
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                Ce que {sampleRecipient} reçoit
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: INK }}>
                « Salut {sampleRecipient}, Ittsui nous propose de nous retrouver {when.toLowerCase()} à {venue.name}. Tu es
                partant(e) ? »
              </p>
              <div className="mt-3 flex gap-2">
                <span
                  className="flex-1 rounded-full py-2 text-center text-xs font-medium text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  Je viens
                </span>
                <span className="flex-1 rounded-full border py-2 text-center text-xs font-medium" style={{ borderColor: BORDER }}>
                  Pas dispo
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                Un lien, un geste, et le moment est bloqué dans son agenda. Aucun compte, aucune application à installer
                pour elle ou lui.
              </p>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              className="mt-5 text-xs underline underline-offset-4"
              style={{ color: MUTED }}
            >
              Réessayer la démonstration
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center border-b px-4 py-3" style={{ borderColor: BORDER }}>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "#FFFDF9", color: MUTED }}>
                Rendez-vous du {when}
              </span>
            </div>
            <div className="relative h-48 w-full">
              <Image
                src={venue.photo}
                alt={venue.photoAlt}
                fill
                sizes="384px"
                draggable={false}
                className="pointer-events-none object-cover"
              />
              {cardState === "swapped" && (
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  Alternative 1/1 · {when}
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              {/* Was a static <p>. Real feedback: "Image not clikable",
                  "Adress not". The venue is the one thing on this card a
                  visitor actually wants to interrogate. */}
              <button
                type="button"
                onClick={() => setSheetVenue(venue)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-sm font-medium underline decoration-dotted underline-offset-4">
                    {venue.shortLabel}
                  </span>
                  <span className="mt-0.5 block text-xs" style={{ color: MUTED }}>
                    {venue.ambience.slice(0, 2).join(" · ")}
                  </span>
                </span>
                <span
                  className="mt-0.5 shrink-0 rounded-full px-2 py-1 text-[10px] font-medium"
                  style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
                >
                  Voir le lieu
                </span>
              </button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <motion.button
                  type="button"
                  onClick={swapCard}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="transition-colors"
                  style={{ color: MUTED }}
                >
                  ← {cardState === "swapped" ? "Option initiale" : "Échanger"}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={confirmCard}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex items-center gap-1 font-medium transition-colors"
                  style={{ color: ACCENT }}
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  Valider →
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {cardState !== "confirmed" && (
        <div className="mt-4 text-center" style={{ minHeight: "1.25rem" }}>
          {skipped ? (
            <div className="flex flex-col items-center gap-2">
              <MascotPair size={30} />
              <p className="text-xs" style={{ color: MUTED }}>
                Pas de pression cette semaine. On s&apos;occupe du reste — à la semaine prochaine.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={skipWeek}
              className="text-xs underline underline-offset-4 transition-colors"
              style={{ color: MUTED }}
            >
              Passer cette semaine
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-center text-xs">
        <Link href="/a-propos" className="underline underline-offset-4" style={{ color: MUTED }}>
          Pourquoi on a créé Ittsui →
        </Link>
      </p>

      <VenueSheet venue={sheetVenue} onClose={() => setSheetVenue(null)} />
    </div>
  );
}
