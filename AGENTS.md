# AGENTS.md — Ittsui France

Read this before touching the repo. It's written for both human
contributors and coding agents.

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

| Token | Value | Use |
|---|---|---|
| Background | `#FBF9F5` (warm cream) | page background |
| Accent | `#A84B38` (terracotta) | primary actions, active states, checkmarks |
| Ink | `#1C1917` (charcoal) | body text |
| Muted | `#78716C` | secondary text, helper copy |
| Border | `#E8E2D9` | card borders, dividers |

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

## Firestore rules

`firestore.rules` restricts `pairs/{pairId}` reads/writes to the two
linked `userIds`, and makes `pairs/{pairId}/weeks/{weekId}` writes
server-only (`allow write: if false` — the Admin SDK bypasses rules, so
all week-doc writes must go through an `app/api/**` route, never a direct
client `setDoc`). Keep it that way; a client-writable `weeks` collection
would let a user fabricate their own confirmed proposal.

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
  the inline comment there before "optimizing" it).

## Repo hygiene

Several full-resolution PNG/JPG duplicates of the images now used from
`/public` and `/images` are checked into the repo root
(`couple-living-room.png`, `hero-father-son-vineyard.jpg.png`, etc. —
~15MB of duplicates). Worth a cleanup pass, not done here since it's
unrelated to this task and touching it risked breaking an image path
referenced somewhere not covered by this audit.
