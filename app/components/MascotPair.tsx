"use client";
// /app/components/MascotPair.tsx
// Composes two MascotAvatars using lib/mascots.config.ts's named pairs —
// the "render any character pair" half of the architecture, kept separate
// from MascotAvatar itself rather than folded into it, since a picker or
// empty state sometimes wants one character (a single bust icon) and
// sometimes wants the pair relationship shown together.

import { MascotAvatar, type MascotAvatarVariant, type MascotMood } from "./MascotAvatar";
import { MASCOT_PAIRS, DEFAULT_PAIR, type MascotPairId } from "@/lib/mascots.config";

export function MascotPair({
  pairId,
  variant = "full",
  size = 56,
  className,
  nod = false,
  mood = "idle",
}: {
  pairId?: MascotPairId;
  variant?: MascotAvatarVariant;
  size?: number;
  className?: string;
  nod?: boolean;
  mood?: MascotMood;
}) {
  const [a, b] = pairId ? MASCOT_PAIRS[pairId] : DEFAULT_PAIR;
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "flex-end", gap: size * 0.12 }}>
      <MascotAvatar characterId={a} variant={variant} size={size} nod={nod} mood={mood} />
      <MascotAvatar characterId={b} variant={variant} size={size} nod={nod} mood={mood} />
    </span>
  );
}
