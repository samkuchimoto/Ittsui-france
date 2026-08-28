"use client";
// /app/components/FridayCard.tsx
// Extracted out of app/page.tsx so that file can be a Server Component.
// Three states only: default -> swapped -> confirmed. Two ways in: buttons
// or a native drag gesture (swipe right = validate, swipe left = swap).
// No gesture library — just pointer/touch coordinates and a spring-back
// transform, wrapped in useTransition so the snap feels immediate even
// while React schedules the state update.
//
// Kept on useTransition deliberately (a 2026-08-28 review proposed
// removing it, citing "frame drops alongside Framer Motion values" —
// rejected: framer-motion's useMotionValue/useTransform already update via
// direct DOM mutation, bypassing React's render cycle entirely, so the
// drag itself was never competing with these state transitions in the way
// that claim assumed, and no measurement backed it up).

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { MUTED, ACCENT, BORDER } from "@/lib/theme";
import { MascotPair } from "@/app/components/MascotPair";
import { IconCheck } from "@/app/components/HomeIcons";

type CardState = "default" | "swapped" | "confirmed";

const OPTION_A = {
  name: "Café de Flore · Paris 6e",
  img: "/couple-parisian-cafe.jpg",
  alt: "Café de Flore, Paris 6e",
};
const OPTION_B = {
  name: "Jardin du Luxembourg · Paris 6e",
  img: "/grandmother-granddaughter-park.jpg",
  alt: "Jardin du Luxembourg, Paris 6e",
};

const SWIPE_THRESHOLD = 76; // px before a drag commits to an action

export function FridayCard() {
  const [cardState, setCardState] = useState<CardState>("default");
  const [skipped, setSkipped] = useState(false);
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

  const option = cardState === "swapped" ? OPTION_B : OPTION_A;

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
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <MascotPair size={44} nod />
            <h3 className="mt-5" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
              Rendez-vous verrouillé !
            </h3>
            <p className="mt-2 max-w-[22ch] text-sm" style={{ color: MUTED }}>
              ✓ Rendez-vous verrouillé pour Samedi 15:30. On se tait jusqu&apos;à samedi !
            </p>
            <button
              type="button"
              onClick={resetDemo}
              className="mt-6 text-xs underline underline-offset-4"
              style={{ color: MUTED }}
            >
              Réessayer la démonstration
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center border-b px-4 py-3" style={{ borderColor: BORDER }}>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "#FFFDF9", color: MUTED }}>
                Rendez-vous du Samedi · 15:30
              </span>
            </div>
            <div className="relative h-48 w-full">
              <Image
                src={option.img}
                alt={option.alt}
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
                  Alternative 1/1 · Samedi 15:30
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="text-sm font-medium">{option.name}</p>
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
    </div>
  );
}
