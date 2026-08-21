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
// Darkened from #78716C -> #565049 (same warm brown-gray hue, just less
// light) to actually reach WCAG AAA against CREAM: the old value measured
// 4.72:1 (verified with the real relative-luminance formula, not
// estimated) -- meets AA, fails AAA's 7:1 floor for normal text. New value
// measures 7.83:1.
export const MUTED = "#565049";
// #C85A32 -> #B84E2A: the previous value put white button text at 4.23:1,
// below AA's own 4.5:1 floor (verified with the real relative-luminance
// formula, not estimated). This value measures 5.05:1 -- genuinely clears
// AA with real margin, not just barely.
export const ACCENT = "#B84E2A";
export const BORDER = "#E8E2D9";
export const CREAM = "#FFFDF9";
