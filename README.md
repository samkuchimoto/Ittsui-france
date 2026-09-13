# Ittsui 一対

An anti-calendar ritual platform for one-on-one relationships. Production at
**[ittsui.fr](https://www.ittsui.fr/)**.

> Systems were built to process the average. Ittsui was built to protect
> your people.

*Ittsui* (一対) means "a pair". The product is scoped to a single standing
bond — a partner, a close friend, a parent — deliberately not to romance or
dating.

## The thesis

Most relationship-upkeep tools fail because they ask you to manage more
surface area: another app to check, another calendar to sync, more
notifications to triage. Ittsui does the opposite. One decision, once, at
setup. After that: **one proposal a week, one action to take on it**
(confirm, swap the alternative, or skip), and silence the rest of the time.

The Friday card is the whole product. Every other screen exists to get
someone to that card with the least possible setup friction. New features get
measured against one question — *does this add a screen someone has to
check?*

The person receiving an invitation never creates an account and never
installs anything. They open a link, tap once, and the moment is booked.
That is also the distribution model.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 — a deliberate "safe stack" pin |
| Language | TypeScript, strict |
| Styling | Tailwind, close to stock; tokens in `lib/theme.ts` |
| Auth + data | Firebase Auth (`signInWithPopup`), Cloud Firestore |
| Native | Capacitor — the same codebase ships iOS and Android |
| Passwordless | Passkeys via `@simplewebauthn` |
| Payments | Stripe |
| Motion | `framer-motion`, confined to purposeful feedback |
| Recommendations | Python/FastAPI RAG service in `rag-service/` |
| Hosting | Vercel, with Vercel Cron for weekly proposals |

Typography is **Fraunces** for display and **Work Sans** for body, loaded
per-page rather than globally.

## Layout

```
app/
  api/            Route handlers (firebase-admin lives only here)
  components/     Client components, incl. the Friday card
  dashboard/      The weekly proposal surface
  setup/          Three-step pairing wizard
  invite/[pairId] Recipient flow — no account required
  request/        One-off rendez-vous, the ad-hoc counterpart to a pair
  geste/          "Envoyer une attention"
  partenaires/    Venue partner directory
lib/              Domain logic, framework-agnostic
rag-service/      Decoupled venue recommendation service
docs/             Architecture, integrations and Play Store launch notes
android/  ios/    Capacitor native shells
```

## Notable engineering

- **Three-tier venue fallback.** `app/api/weekly-propose/route.ts` runs on
  cron and degrades gracefully: RAG service (1.5s budget) → Firestore rule
  engine → a tiny static catalogue with zero external dependencies. A
  proposal goes out even if everything upstream is down.
- **Server-only week writes.** `firestore.rules` makes
  `pairs/{pairId}/weeks/{weekId}` unwritable by clients. A client-writable
  weeks collection would let anyone fabricate a confirmed proposal.
- **Honest venue coverage.** Real park and museum landmarks across five
  metros; cafés and restaurants stay Paris-only on purpose, because guessing
  a small business's current address in an unverified city is not something
  to fabricate. Everything else falls back to "home" — always real.
- **Geocoding that can't quietly lie.** `lib/geoVenueSuggestions.ts`
  resolves free-text area names against a required reference point and
  filters candidates by both distance and a contiguous name match. The
  measured evidence, and the two approaches that were tried and rejected,
  are in its doc comment.
- **Zero-account recipient flow.** For phone-addressed invitations the
  unguessable link *is* the authorization, so accepting is genuinely one tap.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # required before any commit
npm run build        # required before any commit
npx playwright test  # e2e
```

The e2e suite's auth-gated specs (`/setup`, `/dashboard`, `/invite/…`,
`/request/…`) need real Firebase credentials in `.env.local` to get past
their loading state; without them those four fail locally while the public
API spec still passes.

## Conventions

**`AGENTS.md` is binding** for both human contributors and coding agents.
It documents the design system, the data-model contract, the Firestore rules
and — importantly — a "What NOT to touch" section covering decisions that
already cost production outages. In particular,
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` must stay on Firebase's own domain; the
three separate sign-in outages caused by changing it are written up there.

---

© Kuchimoto Studio. Built and maintained by
[Samuel Louissaint](https://github.com/samkuchimoto).
