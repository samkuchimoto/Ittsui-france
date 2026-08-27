"use client";
// /app/components/MascotAvatar.tsx
// Renders one character from lib/mascots.config.ts as a real 2D
// illustrated cutout — no code-drawn placeholder shape stands in for
// missing art (explicit direction: brand assets are never substituted
// with basic shapes or glyphs). Until real files exist at each
// character's imageSrc (see that file's header), this will show a broken
// image rather than a fake stand-in — an honest state, not a bug.
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

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { MASCOTS, type CharacterId } from "@/lib/mascots.config";

export type MascotAvatarVariant = "full" | "bust";

const NOD_ANIMATION = { rotate: [0, -8, 6, -3, 0], y: [0, -4, 0, -2, 0] };

export function MascotAvatar({
  characterId,
  variant = "full",
  size = 64,
  className,
  nod = false,
}: {
  characterId: CharacterId;
  variant?: MascotAvatarVariant;
  size?: number;
  className?: string;
  nod?: boolean;
}) {
  const character = MASCOTS[characterId];
  const [imageFailed, setImageFailed] = useState(false);

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
          src={character.imageSrc}
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
