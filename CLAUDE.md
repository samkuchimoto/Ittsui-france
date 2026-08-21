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

| Token | Value | Contrast (verified, real relative-luminance calc) |
|---|---|---|
| `CREAM` | `#FFFDF9` | — |
| `INK` | `#1C1917` | 17.21:1 vs. CREAM — comfortably exceeds AAA |
| `MUTED` | `#565049` | 7.83:1 vs. CREAM — AAA |
| `ACCENT` (official terracotta) | `#B84E2A` | 5.05:1, white text on the fill — AA, real margin |

`ACCENT` history, for context: `#A84B38` (5.63:1) → `#C85A32` (an explicit
directive that regressed white-on-fill to 4.23:1, below AA's own 4.5:1
floor) → `#B84E2A` (current, 5.05:1, fixes the regression). If this value
changes again, verify the new number with the real relative-luminance
formula before writing a contrast claim anywhere — don't estimate by eye,
and don't trust a "WCAG AA/AAA" label in a request until you've checked it
yourself.

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
- **Autonomous tooling privilege:** `npm install` for well-established,
  widely-used telemetry/security/utility packages (Zod, Sentry, and
  similar) without stopping to ask first. Scoped to that category
  specifically, not a blanket "any package" — a new UI framework, a
  gesture/animation library (see `AGENTS.md`'s stack constraints), or
  anything that changes the app's actual behavior/dependencies in a more
  fundamental way is still worth raising explicitly.
- **Zero-trust validation:** every `app/api/**` route should validate its
  request payload with Zod rather than ad-hoc `if (!field)` checks. Not
  retrofitted across every existing route in one pass as of this writing
  — `app/api/mark-invite-opened/route.ts` and `app/api/ai-venue-mood/route.ts`
  use it as the reference pattern; the rest still use the older manual
  style and are fair game to convert opportunistically when touching them
  for another reason, not necessarily as a dedicated sweep.
