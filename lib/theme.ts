// /lib/theme.ts
// Shared design tokens, single source of truth. Previously redefined
// locally as `const ACCENT = "..."` etc. in ~10 separate page/component
// files — fine when the values never changed, but updating them (as here,
// terracotta and cream both shifting) meant either editing every file by
// hand or risking exactly the "silent partial migration" AGENTS.md's
// design-system section already warned against. Import from here instead
// of redefining locally.
//
// Franco-Japanese direction: French warmth (terracotta, cream) meeting
// Japanese Ma (negative space) — the latter is a layout/spacing
// discipline the existing pages already practice (generous padding, one
// idea per screen), not something a color token file can enforce on its
// own.

export const INK = "#1C1917";
export const MUTED = "#78716C";
export const ACCENT = "#C85A32";
export const BORDER = "#E8E2D9";
export const CREAM = "#FFFDF9";
