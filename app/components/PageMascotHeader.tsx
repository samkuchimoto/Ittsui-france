"use client";
// /app/components/PageMascotHeader.tsx
// A consistent brand-mascot mark for the top of every real app screen —
// real tester feedback plus a direct correction from the product owner:
// the mascot system was wired into only a handful of contextual spots
// (setup's duo picker, the dashboard empty/confirmed states), which read
// as "not implemented" on every other page a real user actually passes
// through (landing, setup steps, pending, invite, request, contacts).
// This is the fix: one small, reusable pair mark, dropped at the top of
// every page/branch below, so the cast is genuinely visible everywhere,
// not just in the couple of places it happened to make contextual sense.
//
// Tap-to-react: the Gen Z tester's other core ask ("plus d'animation,
// plus attractif") was about the app feeling static, not just about the
// mascots existing — a purely decorative image doesn't answer that. A
// tap plays a satisfied little squish-and-wiggle via Framer Motion, real
// tactile feedback on the one element that now appears on every single
// screen, without an idle/looping animation running unprompted on every
// page load (which would read as noisy rather than "more alive").
//
// Defaults to the core pair (Kokoro & Hikari) — most of these pages have
// no relationship-kind context to react to (an invite link, a request
// preview, a pending screen), so this stays a constant brand mark rather
// than guessing. Pages that DO know the real relationship (dashboard)
// keep their own dynamic MascotPair wiring exactly as before; this
// component is additive, not a replacement for that.

import { motion } from "framer-motion";
import { MascotPair } from "./MascotPair";
import type { MascotPairId } from "@/lib/mascots.config";

export function PageMascotHeader({ pairId, size = 40 }: { pairId?: MascotPairId; size?: number }) {
  return (
    <div className="mb-3 flex justify-center">
      <motion.button
        type="button"
        aria-label="Dire bonjour"
        whileTap={{ scale: 0.82, rotate: [0, -6, 6, -3, 0] }}
        transition={{ type: "spring", stiffness: 420, damping: 12 }}
        className="cursor-pointer rounded-full"
      >
        <MascotPair pairId={pairId} size={size} />
      </motion.button>
    </div>
  );
}
