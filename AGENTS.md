# AGENTS.md — Ittsui France

Read this before touching the repo. It's written for both human
contributors and coding agents.

## Autonomous Agent Rules

1. **Fully autonomous mode.** Execute tasks, bug fixes, refactors, and
   feature requests end-to-end without pausing for mid-task confirmation,
   approvals, or "next step?" check-ins.
2. **Auto-resolve blockers.** Build errors, credential conflicts, missing
   dependencies, broken paths — diagnose and fix using project context and
   best practices rather than stopping to ask. Prefer the least destructive
   fix available (e.g. retarget a credential lookup over clearing the
   credential store). `--force` pushes, skipping git hooks, and discarding
   uncommitted work are not "blockers to auto-resolve" — those stay real
   stop-and-ask situations.
3. **Quality gate.** Always run `npx tsc --noEmit` and `npm run build`
   before considering a task done. Never leave a branch with broken
   TypeScript or a failing build.
4. **Auto-commit & push.** Commit verified changes with clear conventional
   commit messages (`feat: …`, `fix: …`) and push to the active branch.
5. **Unicorn standard.** Execute to Silicon Valley PLG, Israeli
   high-velocity engineering, and top-tier French consumer-UX polish
   standards. A better architectural or product idea beats the literal
   spec — execute it, and say what changed and why in the summary.
6. **Summary after, not before.** Report changes, diffs, and push status
   once the pipeline is built, tested, and pushed — not as running
   commentary beforehand.

**One standing exception, not covered by "auto-resolve":** a request that
turns out to reference files, routes, or data that don't exist in this
repo, or that would touch something listed under "What NOT to touch"
below, or that changes who can access another user's data (the auth/
security model) is a fact-finding problem, not a blocker — check it
against the actual repo state and say what's real before building on an
incorrect premise. Silently building the literal (wrong) spec, or silently
substituting something different without saying so, are both worse than a
two-line note in the final summary.

## Project vision & core thesis

> Systems were built to process the average. Ittsui was built to protect
> your people.

Ittsui (一対 — "a pair") is an anti-calendar ritual platform for 1-on-1
relationships (partner, close friend, family member — deliberately not
scoped to romance or dating). The product bet: most relationship-upkeep
tools fail because they ask people to manage more surface area (an app to
check, a calendar to sync, notifications to triage). Ittsui does the
opposite — one decision, once, at setup. After that: one proposal a week,
one action to take on it (confirm, swap the alternative, or skip), and
silence the rest of the time. The Friday card is the whole product; every
other screen exists to get someone to that card with the least possible
setup friction.

Design implication: every new feature should be evaluated against "does
this add a screen someone has to check?" If yes, it needs a very good
reason to exist.

## Design system

Single source of truth is `lib/theme.ts` (`INK`/`MUTED`/`ACCENT`/`BORDER`/
`CREAM`) — import from there, don't hardcode hex values here or in a
component. The table below is a reference, not the authority; if it ever
drifts from `lib/theme.ts`, the code file wins.

| Token | Value | Use |
|---|---|---|
| Background (`CREAM`) | `#FFFDF9` | page background |
| Accent (`ACCENT`) | `#B84E2A` (terracotta) | primary actions, active states, checkmarks |
| Ink (`INK`) | `#1C1917` (charcoal) | body text |
| Muted (`MUTED`) | `#565049` | secondary text, helper copy |
| Border (`BORDER`) | `#E8E2D9` | card borders, dividers |

`ACCENT` and `MUTED` both moved since this table was first written (see
`lib/theme.ts`'s own comments for the exact contrast-ratio math) —
verify against real relative-luminance numbers before changing either
again, don't estimate by eye.

Typography: **Fraunces** for headlines/display (serif, warm, editorial —
loaded per-page via `next/font/google` with weights 300/500/600, both
normal and italic styles, exposed as the `--font-display` CSS var), **Work
Sans** for body (weights 400/500/600, `--font-body`). Fonts are loaded
per-page, not globally in `layout.tsx` — follow that pattern if you add a
new top-level page (`app/page.tsx` and `app/setup/page.tsx` both do this;
copy their font block rather than centralizing it, unless you're
deliberately taking on that refactor).

Tailwind config is intentionally close to stock (`tailwind.config.js` has
no custom theme extension) — colors are applied via inline `style={{}}`
using the constants above (`INK`, `MUTED`, `ACCENT`, `BORDER`), not
Tailwind color utilities. Match that pattern rather than introducing
`tailwind.config.js` color tokens for one component; if the inline-style
approach starts feeling unwieldy across many files, that's worth a real
refactor discussion, not a silent partial migration.

Buttons: full pill radius (`rounded-full`), terracotta fill for primary
actions, white/outlined for secondary. Cards: `rounded-3xl` (large cards
like the Friday card) or `rounded-2xl` (grid cards), always with a
`1px` `BORDER`-colored border, never a shadow heavier than `shadow-sm`.

## Stack & version constraints

- Next.js **14.2.5**, App Router, React **18.3.1**. Do not introduce React
  19-only hooks (`use`, `useActionState`, `useFormStatus` in its React-19
  form) or Next 15-only APIs. This is a deliberate "safe stack" choice
  for the incubator demo timeline — upgrading is a separate decision, not
  something to do incidentally while shipping a feature.
- Client Firebase SDK (`firebase` ^10) for auth + Firestore reads from the
  browser; `firebase-admin` (^12) only inside `app/api/**/route.ts`
  handlers, via `lib/firebaseAdmin.ts`. Never import `firebase-admin` into
  a `"use client"` file — it will break the build (Node-only APIs).
- No external gesture/animation library. The Friday card's swipe
  interaction (`app/page.tsx`) is hand-rolled with `onTouchStart` /
  `onTouchMove` / `onTouchEnd` (+ Pointer Events for desktop) and CSS
  transforms. If a future interaction needs more than this, that's worth
  raising explicitly rather than quietly adding `framer-motion`.

## Data model (`lib/types.ts`)

`Pair`, `Week`, `User`, `VenueType`, `DietaryFilter`, `Preferences` are
the shared contract between the frontend and every API route. Changing
any of these is a breaking change across `app/setup/page.tsx`,
`app/setup/pending/page.tsx`, `app/dashboard/**`, and every route under
`app/api/**`. If a feature needs a new field, add it additively
(optional, with a sensible default read-side) rather than repurposing an
existing field's meaning.

`Pair.subscriptionStatus` mirrors Stripe's subscription status values
(`active` / `trialing` / `past_due` / `canceled`) but there is no Stripe
integration wired up yet in this repo — the field exists ahead of that
work. Don't assume billing is live.

**Product principle, not yet enforced by code:** the core weekly ritual
(one proposal, one action, silence otherwise) is intended to stay free.
When Stripe billing does get wired up, `subscriptionStatus` should gate
optional add-ons, not the base loop — every pair is created with
`subscriptionStatus: "trialing"` today (see `app/api/invite-partner/route.ts`),
which happens to keep everyone on the free path only because no billing
exists yet to move them off it. Don't treat that as accidental slack to
close without a deliberate pricing decision first.

**`Contact` and `MeetingRequest`** (added alongside the ad-hoc request
feature): a `Contact` is purely the owning user's own address-book entry
(`users/{uid}/contacts/{id}`, name + email) — no messaging, no shared
state with the other person. A `MeetingRequest` is the one-off
counterpart to `Pair`'s permanent weekly bond: a single proposed
venue/address/date/time sent by email to a contact, accepted or declined
the same way a `Pair` invite is (see `/api/meeting-requests/*`, which
deliberately mirror `/api/invite-partner` and
`/api/activate-pending-pair`'s exact accept/decline/email-verification
pattern rather than inventing a new one). Note: `firestore.rules` also
has a pre-existing `communities/{communityId}` block (N-member groups,
distinct from a 2-person `Pair`) with no corresponding type in this file
yet — that gap predates this section and wasn't introduced or resolved
here; don't assume a `Community` type exists in `lib/types.ts` just
because the Firestore rule does.

## Firestore rules

`firestore.rules` restricts `pairs/{pairId}` reads/writes to the two
linked `userIds`, and makes `pairs/{pairId}/weeks/{weekId}` writes
server-only (`allow write: if false` — the Admin SDK bypasses rules, so
all week-doc writes must go through an `app/api/**` route, never a direct
client `setDoc`). Keep it that way; a client-writable `weeks` collection
would let a user fabricate their own confirmed proposal. The same
server-only-write reasoning is why `meetingRequests/{requestId}` also has
`allow update, delete: if false` — accept/decline has to verify the
caller's email and send emails to both parties, which only a server
route can do.

## Auth: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` must stay Firebase's own domain

**Do not change this without reading this section fully and having a very
concrete reason.** It's currently `ittsui-france.firebaseapp.com` — the
Firebase-managed default, not a custom domain. This was tried the other
way (`ittsui.fr`, this app's own domain) and caused three separate
production sign-in outages before being reverted:

1. A rewrite proxying `/__/auth/*` to Firebase's real backend computed its
   destination from `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` itself — once that
   var became `ittsui.fr`, the rewrite became self-referential
   (`ERR_TOO_MANY_REDIRECTS` on every sign-in). Fixed by deriving the
   destination from `NEXT_PUBLIC_FIREBASE_PROJECT_ID` instead, but the
   underlying decision (custom domain) is what created the trap.
2. This app's own apex-to-www platform redirect changed the effective
   host mid-flow, so the `redirect_uri` Firebase's popup/redirect helper
   sent to Google didn't match what was authorized — `redirect_uri_mismatch`
   for every account, intermittently, depending on which host a given
   sign-in attempt happened to touch.
3. Once `authDomain` equals this app's own origin, Firebase's session
   helper iframe (`{authDomain}/__/auth/iframe`) becomes same-origin, and
   `signInWithPopup`'s gapi relay script needs `apis.google.com` in CSP —
   neither is needed at all when `authDomain` is Firebase's own domain,
   since the iframe and script both live in a completely separate
   browsing context the app's own CSP never governs.

The original reason for moving off the default domain — Chrome treating
`firebaseapp.com`'s storage as partitioned during `signInWithRedirect`'s
round-trip, so `getRedirectResult()` silently came back empty after a
real, completed sign-in — no longer applies, because `lib/firebase.ts`'s
`signInWithGoogle()` now uses `signInWithPopup` on desktop specifically
because it never calls `getRedirectResult()` at all. Redirect stays the
mobile-web path only (popups get killed by OS backgrounding there), and
is unaffected either way. If mobile-web sign-in ever needs the same fix
popup already gives desktop, treat that as its own decision — don't
reach for a custom `authDomain` again to solve it; that's the exact
change that cost three outages last time. Full account of each incident
is in `next.config.js`'s CSP comment and the git history around commits
`c6ddba4`, `7afa92e`, `21e6ecd`, `a475ee8`.

## The venue-recommendation pipeline

`app/api/weekly-propose/route.ts` runs on Vercel Cron (`vercel.json`,
currently `0 6 * * *` — 06:00 UTC daily) and proposes for every active
pair whose `agreedDay` is today. Venue selection follows a 3-tier
graceful-degradation chain (the "API Independence Pattern" — see the
audit note at the top of that file for the full reasoning):

1. **RAG service** (primary) — precomputed pick from the decoupled
   Python/FastAPI service in `/rag-service`, read from Redis/Postgres.
   Bounded to a 1.5s timeout.
2. **Firestore rule engine** (fallback) — the pre-existing `venues`
   collection shortlist, picked deterministically, no LLM call.
3. **Static rule engine** (last resort) — a tiny hardcoded catalog with
   zero external dependencies, so a proposal goes out even if both the
   RAG service and Firestore are down.

**Known gap, flagged rather than silently fixed:** the brief's framing
("precomputes Friday recommendations at 17:00 so Friday 18:00 reads are
fast") implies the precompute job runs ~1 hour ahead of each day's
proposal read. The current Vercel Cron schedule (`0 6 * * *`) doesn't
match that — it's a single daily run at 06:00 UTC regardless of which
day a given pair's ritual falls on. Wiring up the RAG service's own
scheduler (see `/rag-service/README.md`) to actually run an hour ahead of
whichever day it's precomputing for is real follow-up work, not done as
part of this pass — do not assume the timing described in product copy
is already true of the infrastructure.

**Venue coverage is honestly partial, not nationwide.** `Pair.postalCode`
(optional) routes tier 3's static catalog to real park/museum landmarks in
five metros (Paris, Marseille, Lyon, Lille, Bordeaux) and tier 2 soft-sorts
Firestore `venues` by city when one matches. Cafe/restaurant stayed
Paris-only on purpose — those are small businesses, and guessing at a
current address in a city nobody's verified is exactly the kind of thing
not to fabricate (same reasoning as not inventing venue photos: see the
dashboard's two-option card). Every other postal code, and every
cafe/restaurant preference outside Paris, falls back to "home" — always
real, everywhere, rather than a wrong Paris suggestion or a silent
failure. True nationwide coverage needs a live venues data source (Google
Places, data.gouv.fr, or similar) — this is a deliberate step toward that,
not a replacement for it.

## What NOT to touch without a good reason

- `app/setup/page.tsx`'s Firebase Auth watcher, the Firestore
  "does this uid already have a pair" query (note the `orderBy("createdAt",
  "desc")` — it's there on purpose, see the inline comment; removing it
  reintroduces a bug where a stale declined/expired pair can shadow a
  fresh one), and the exact JSON body shape posted to
  `/api/invite-partner`.
- `lib/types.ts` — see "Data model" above.
- `firestore.rules` — see "Firestore rules" above.
- The self-invite check and the "existing live pair" dedupe logic in
  `app/api/invite-partner/route.ts` (deliberately queries without a
  `status` filter to avoid needing a new Firestore composite index — see
  the inline comment there before "optimizing" it). The same
  no-`orderBy`-with-a-filter pattern is why `/api/meeting-requests/list`
  sorts in memory instead of in the query — see `lib/sort.ts`'s comment.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — see the dedicated section above.
  Not a "just try it" experiment; changing it away from Firebase's own
  domain has a specific, documented cost.
- `lib/firebase.ts`'s desktop-vs-mobile-web split in `signInWithGoogle()`
  (`isMobileWebBrowser()` picks `signInWithPopup` vs `signInWithRedirect`)
  and the CSP entries in `next.config.js` that popup sign-in depends on
  (`script-src`/`connect-src`/`frame-src` all needing `apis.google.com`).
  Removing either independently of the other reintroduces one of the
  outages described above.

## Repo hygiene

Root-level image duplicates (`couple-living-room.png`,
`hero-father-son-vineyard.jpg.png`, etc. — ~15MB) have been removed;
confirmed via `grep` across every `.ts`/`.tsx`/`.js`/`.json` file that
nothing referenced them (Next.js only ever serves from `/public`, never
the bare repo root), then a full `npm run build` after deleting them.

**Still open, deliberately not done autonomously:** `/public/*.jpg` (what
the live site actually serves, via `app/page.tsx`'s `<Image>` tags) are
2+MB originals, despite `/images/*` already holding what look like
properly-compressed versions of the exact same photos at ~250-290KB
each — except `/images/` isn't referenced anywhere in the code either,
so right now neither directory is "the optimized one in use." Swapping
`/public`'s files for `/images`'s would cut real page weight, but it
changes what a live marketing page visually renders, which deserves a
human actually looking at the result — not something to do blind.
