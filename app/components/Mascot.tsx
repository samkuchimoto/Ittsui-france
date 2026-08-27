"use client";
// /app/components/Mascot.tsx
// Ergonomic single-character wrapper over MascotAvatar/lib/mascots.config
// — named size tokens and animation intents instead of raw pixel values,
// for the specific hero/reaction moments that want one character (not a
// pair): empty states, success confirmations, error states. Doesn't
// replace MascotAvatar/MascotPair (still used directly wherever a raw
// size or the paired-brand-mark behavior is what's wanted, e.g.
// PageMascotHeader) — this sits alongside them for the call sites that
// want the friendlier name/size/animation vocabulary.

import { motion } from "framer-motion";
import { MascotAvatar } from "./MascotAvatar";
import type { CharacterId } from "@/lib/mascots.config";

// sm: inline status badges/list rows. md: category card accents, modal
// sub-headers. lg: confirmation cards, alerts, state screens. xl: hero
// empty states, major visual focal points.
export type MascotSize = "sm" | "md" | "lg" | "xl";
const SIZE_PX: Record<MascotSize, number> = { sm: 32, md: 56, lg: 96, xl: 160 };

export type MascotAnimation = "none" | "bounce";
// "confused" has no separate pose art (one static illustration per
// character, not a sprite sheet) — approximated honestly with a slight
// head-tilt + a small "?" mark rather than claiming a bespoke expression
// that doesn't exist.
export type MascotVariant = "default" | "confused";

const BOUNCE_ANIMATION = { y: [0, -14, 0, -6, 0], scale: [1, 1.05, 1, 1.02, 1] };

export function Mascot({
  name,
  size = "md",
  animation = "none",
  variant = "default",
  float = false,
  className,
}: {
  name: CharacterId;
  size?: MascotSize;
  animation?: MascotAnimation;
  variant?: MascotVariant;
  // Continuous, low-amplitude idle motion — opt-in per call site (not a
  // default on every mascot everywhere) for the specific hero/xl moments
  // where "feels alive" earns the motion; a bust icon in a picker or a
  // header brand mark stays static, matching this app's existing
  // restraint on unprompted, unbounded animation.
  float?: boolean;
  className?: string;
}) {
  const px = SIZE_PX[size];

  return (
    <motion.span
      className={className}
      style={{ position: "relative", display: "inline-block", rotate: variant === "confused" ? -8 : 0 }}
      whileHover={{ scale: 1.08, transition: { type: "spring", stiffness: 300, damping: 15 } }}
      initial={animation === "bounce" ? { y: 0, scale: 1 } : false}
      animate={
        animation === "bounce"
          ? BOUNCE_ANIMATION
          : float
            ? { y: [0, -6, 0] }
            : undefined
      }
      transition={
        animation === "bounce"
          ? { duration: 0.9, ease: "easeInOut" }
          : float
            ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            : undefined
      }
    >
      <MascotAvatar characterId={name} variant="full" size={px} />
      {variant === "confused" && (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm"
          style={{ color: "#B84E2A" }}
          aria-hidden="true"
        >
          ?
        </span>
      )}
    </motion.span>
  );
}
