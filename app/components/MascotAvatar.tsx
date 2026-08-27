"use client";
// /app/components/MascotAvatar.tsx
// Renders one character from lib/mascots.config.ts as a real 2D
// illustrated cutout — no code-drawn placeholder shape stands in for
// missing art (explicit direction: brand assets are never substituted
// with basic shapes or glyphs). Real art exists for every character
// except Ren as of 2026-08-27 (see that config file's header for why);
// for any character with no file yet, this falls back to plain initials
// rather than a broken image or a fake stand-in.
//
// `nod`: the "cozy nod on 1-click validation" micro-reaction from the
// mascot motion framework — a one-off spring animation that plays when
// this component mounts with nod=true. Deliberately not a prop that
// re-triggers on every render or loops: it's meant for a call site that
// only renders this element once the moment it's celebrating has
// actually happened (see DashboardClient's ConfirmedMascotMoment), not a
// constant idle wiggle. False/omitted (every call site before today)
// renders a fully static image, unchanged.
//
// Loading-state fallback: while public/images/mascots/{id} doesn't exist
// yet, a failed image renders as plain initials in a muted circle —
// deliberately NOT an illustrated shape standing in for the character
// (see git history: that was tried and explicitly reverted). Initials are
// the same "hasn't loaded yet" convention as any avatar placeholder
// (Slack, Gmail, etc.), not a design substitute — it disappears on its
// own the moment a real file is dropped in, no code change needed.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { MASCOTS, type CharacterId } from "@/lib/mascots.config";

export type MascotAvatarVariant = "full" | "bust";
export type MascotMood = "idle" | "success" | "empty";

const NOD_ANIMATION = { rotate: [0, -8, 6, -3, 0], y: [0, -4, 0, -2, 0] };

export function MascotAvatar({
  characterId,
  variant = "full",
  size = 64,
  className,
  nod = false,
  mood = "idle",
}: {
  characterId: CharacterId;
  variant?: MascotAvatarVariant;
  size?: number;
  className?: string;
  nod?: boolean;
  // Static-asset "conditional image swap" per mood, in place of a Rive/
  // Lottie state machine — see lib/mascots.config.ts's MascotConfig.states.
  // No mood-specific art exists yet (only the base imageSrc), so this
  // resolves to that same base image for every character today; it starts
  // working the instant a `states` entry is added for a character, no
  // other code change needed.
  mood?: MascotMood;
}) {
  const character = MASCOTS[characterId];
  const src = character.states?.[mood] ?? character.imageSrc;
  const [imageFailed, setImageFailed] = useState(false);

  // Without this, an already-mounted instance whose characterId or mood
  // changes (e.g. a future edit-relationship-kind UI) would keep showing
  // the PREVIOUS image's failure state — stale initials, or a stale
  // initial letter, instead of trying to load the new source.
  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <motion.span
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: variant === "bust" ? 9999 : undefined,
        overflow: variant === "bust" ? "hidden" : undefined,
        backgroundColor: character.palette.secondary,
      }}
      initial={nod ? { rotate: 0, y: 0 } : false}
      animate={nod ? NOD_ANIMATION : undefined}
      transition={nod ? { duration: 0.7, ease: "easeInOut" } : undefined}
    >
      {imageFailed ? (
        <span
          className="flex h-full w-full items-center justify-center font-medium"
          style={{ color: character.palette.primary, fontSize: size * 0.38 }}
          aria-label={character.name}
        >
          {character.name.charAt(0)}
        </span>
      ) : (
        <Image
          key={src}
          src={src}
          alt={character.name}
          fill
          sizes={`${size}px`}
          style={{ objectFit: variant === "bust" ? "cover" : "contain", objectPosition: variant === "bust" ? "top" : "center" }}
          onError={() => setImageFailed(true)}
        />
      )}
    </motion.span>
  );
}
