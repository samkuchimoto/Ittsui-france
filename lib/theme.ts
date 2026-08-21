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
export const ACCENT = "#C85A32";
export const BORDER = "#E8E2D9";
export const CREAM = "#FFFDF9";

// Known, unresolved: white text on ACCENT measures 4.23:1 -- below AA's
// 4.5:1 floor for normal-weight text, not just short of AAA. This is
// worse than the previous accent (#A84B38, which measured 5.63:1). Not
// silently changed here since #C85A32 was an explicit, specific directive
// -- see CLAUDE.md's contrast note for the real numbers and the options.
