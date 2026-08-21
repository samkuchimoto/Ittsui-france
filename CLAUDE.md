# CLAUDE.md — Ittsui France

Read `AGENTS.md` first — it has the full project vision, data model,
Firestore rules, the venue-recommendation pipeline, and "what not to touch
without a good reason." This file is a shorter, operational companion:
what to know before making a change, not the full context.

## Stack

Next.js 14 (App Router), Tailwind CSS, Firebase (client SDK for
auth/Firestore reads, `firebase-admin` server-only inside `app/api/**`).
See `AGENTS.md`'s "Stack & version constraints" for the version floor and
what NOT to introduce (React 19-only APIs, external gesture/animation
libraries).

## Design tokens (`lib/theme.ts`)

Single source of truth — import `INK`/`MUTED`/`ACCENT`/`BORDER`/`CREAM`
from there rather than redefining locally (every page used to do this
separately; changing a value meant editing ~10 files by hand until this
existed).

| Token | Value | Contrast vs. CREAM (verified, real relative-luminance calc) |
|---|---|---|
| `CREAM` | `#FFFDF9` | — |
| `INK` | `#1C1917` | 17.21:1 — comfortably exceeds AAA |
| `MUTED` | `#565049` | 7.83:1 — AAA |
| `ACCENT` | `#C85A32` | terracotta — used as a fill, not text-on-cream |

**Known, unresolved issue:** white text on `ACCENT` (the primary-button
fill) measures **4.23:1** — below AA's 4.5:1 floor for normal-weight
text, not just short of AAA. This is worse than the previous accent
(`#A84B38`, 5.63:1). `#C85A32` was given as an explicit, specific
directive, so it wasn't silently changed to fix this — real options if
this is worth resolving: darken the accent slightly, make button labels
genuinely large/bold text (WCAG's large-text threshold only needs 3:1),
or use dark text on the accent fill instead of white. Don't claim AAA (or
even AA) for this specific pairing until one of those actually happens —
verify with the real formula, not by eye, if the value changes again.

24h French time notation (`15h` / `15:00`, never `3 PM`) is enforced via a
controlled `<select>` pair in `SetupClient.tsx` (`TimeSelect`) — native
`<input type="time">` renders in whatever format the OS/browser locale
dictates, which HTML/CSS can't override, so this isn't a CSS setting to
toggle, it's why that component exists at all.

## Rules

- **Never claim a bug is fixed without a passing build or a real,
  verified check.** "I found the code path and it looks right" is a
  hypothesis, not a fix — run `npx tsc --noEmit` and `npm run build` (or
  an actual reproduction) before saying something is resolved. This
  applies doubly to anything about loading/hang states: a screenshot of
  `FriendlyLoading`'s rotating text alone can't prove something hung
  forever vs. loaded normally a second later — get a real timing signal
  before diagnosing one.
- **Every AI-generated image keeps its disclosure badge, without
  exception:** "Illustration générée par IA — Ambiance indicative",
  high-contrast, overlaid on the image itself, not a footnote. This is
  what makes `app/api/ai-venue-mood/route.ts` honest rather than a
  fabricated photo claiming to depict something real — see that file's
  own comments for why it only ever generates category mood illustrations
  (café/park/restaurant/museum ambiance), never an image implying it
  depicts one specific named real venue.
