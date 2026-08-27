// /app/components/MascotAvatar.tsx
// Renders one character from lib/mascots.config.ts as a real 2D
// illustrated cutout — no code-drawn placeholder shape stands in for
// missing art (explicit direction: brand assets are never substituted
// with basic shapes or glyphs). Until real files exist at each
// character's imageSrc (see that file's header), this will show a broken
// image rather than a fake stand-in — an honest state, not a bug.

import Image from "next/image";
import { MASCOTS, type CharacterId } from "@/lib/mascots.config";

export type MascotAvatarVariant = "full" | "bust";

export function MascotAvatar({
  characterId,
  variant = "full",
  size = 64,
  className,
}: {
  characterId: CharacterId;
  variant?: MascotAvatarVariant;
  size?: number;
  className?: string;
}) {
  const character = MASCOTS[characterId];

  return (
    <span
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
    >
      <Image
        src={character.imageSrc}
        alt={character.name}
        fill
        sizes={`${size}px`}
        style={{ objectFit: variant === "bust" ? "cover" : "contain", objectPosition: variant === "bust" ? "top" : "center" }}
      />
    </span>
  );
}
