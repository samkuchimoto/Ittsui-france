// /app/components/PairGlyph.tsx
// The "mascot" real tester feedback asked for (Gen Z tester: "trop
// formel," "Duolingo a leur mascotte," "plus d'animation") — built as the
// minimal, abstract version, not a full illustrated character cast.
//
// A researched-and-attached reference (a 13-character LINE-FRIENDS-style
// kawaii cast) exists but is deliberately NOT what's implemented here: it
// needs real illustration/image-generation work this codebase has no tool
// for, and — more importantly — every grounded review of this specific
// product (the one that actually read AGENTS.md and this file tree, and
// the more careful of the two mascot briefs) converged on the same
// warning: a full named cast reads as the dating/social-app register
// Ittsui's own positioning already argues against, and this project has a
// real precedent of walking back exactly this kind of declarative
// brand-embellishment once already (see the reverted landing-page
// trust-copy block). Two abstract paired forms, one hue (ACCENT), varied
// only by spatial arrangement — cheap to be wrong about, easy to remove,
// and a bigger illustrated pass stays possible later if this earns it.
//
// Deliberately non-figurative (no face, no species) — see AGENTS.md /
// tester feedback re: the app's current visuals reading as one specific
// culture/ethnicity to at least one real tester; an abstract paired form
// sidesteps that question entirely rather than reintroducing it.

import type { CSSProperties } from "react";
import { ACCENT } from "@/lib/theme";

export type PairGlyphVariant = "ami" | "partenaire" | "famille";

const BASE_Y = 50;

function Capsule({ x, width, height, opacity }: { x: number; width: number; height: number; opacity: number }) {
  return <rect x={x} y={BASE_Y - height} width={width} height={height} rx={width / 2} fill={ACCENT} opacity={opacity} />;
}

// Arrangement carries the meaning, not color or expression: a clear gap
// reads as two independent people (ami), overlap reads as closeness
// (partenaire), mismatched scale reads as generations (famille).
export function PairGlyph({
  variant = "ami",
  size = 56,
  className,
  style,
}: {
  variant?: PairGlyphVariant;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className} style={style} aria-hidden="true">
      {variant === "ami" && (
        <>
          <Capsule x={14} width={18} height={36} opacity={1} />
          <Capsule x={36} width={18} height={36} opacity={0.45} />
        </>
      )}
      {variant === "partenaire" && (
        <>
          <Capsule x={16} width={18} height={38} opacity={0.45} />
          <Capsule x={28} width={18} height={36} opacity={1} />
        </>
      )}
      {variant === "famille" && (
        <>
          <Capsule x={14} width={22} height={40} opacity={1} />
          <Capsule x={36} width={14} height={24} opacity={0.45} />
        </>
      )}
    </svg>
  );
}
