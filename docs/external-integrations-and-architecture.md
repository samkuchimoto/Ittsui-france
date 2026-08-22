# External integrations & architecture changes — exact requirements

Everything named in the two strategy PDFs, sorted by what's actually blocking it: an account/credential
only you can obtain, or pure engineering time with no external dependency. Every fact below was verified
against the provider's live documentation on 2026-08-22 (not written from memory) — sources linked
throughout.

## Self-serve today — get these yourself in minutes, no approval needed

### OpenAgenda (cultural events, exhibitions, festivals)
- **Where**: create an account, then get your **public key** (read-only, self-serve, no approval) from
  your account's API settings page. [developers.openagenda.com/authentification](https://developers.openagenda.com/authentification/)
- **What to give me**: the public key, plus the **UID of an agenda** (a calendar) you own or follow —
  OpenAgenda's events endpoint is scoped to a specific agenda, not a global cross-platform search, so you
  need at least one agenda to query. Creating one is part of the same account setup.
- **Env var**: `OPENAGENDA_API_KEY`
- **Code status**: `lib/providers/openAgenda.ts` — written and typechecked against their real, verified API
  shape (`GET /v2/agendas/{uid}/events`, `key` header auth, `timings[gte]`/`timings[lte]` date filters).
  **Implemented, not verified** — there's no real key to test it against yet. Not wired into the live
  `weekly-propose` pipeline (see that file's comment for the one-line change to activate it once you have
  a key — I didn't plug untested code ahead of the already-working, already-tested fallback chain).

### DATAtourisme (points of interest, parks, heritage sites — French government open data)
- **Where**: [datatourisme.fr/utiliser-les-donnees](https://www.datatourisme.fr/utiliser-les-donnees) —
  self-serve key request.
- **Auth**: `X-API-Key` header.
- **Env var suggestion**: `DATATOURISME_API_KEY`
- **Code status**: not written yet — lower priority than OpenAgenda since the existing static catalog
  already covers parks/heritage sites in 5 major metros. Tell me when you have a key and I'll write the
  client against their real docs the same way.

### Google Places / Routes / Calendar APIs
- **Where**: [console.cloud.google.com](https://console.cloud.google.com/) — needs a Google Cloud project
  with **billing enabled** (a credit card on file; Google's free tier covers substantial usage before any
  charge, but the card is required to activate it).
- **Steps**: create/select a project → APIs & Services → Library → enable "Places API (New)", "Routes
  API", and "Google Calendar API" individually → Credentials → Create API Key → restrict the key to just
  those APIs and to your domain/server IP.
- **Docs**: [Places](https://developers.google.com/maps/documentation/places/web-service/overview),
  [Routes](https://developers.google.com/maps/documentation/routes/overview),
  [Calendar FreeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)
- **Env var suggestion**: `GOOGLE_MAPS_API_KEY` (Places/Routes can share one key; Calendar needs OAuth
  consent per-user if reading a real user's calendar, which is a separate, bigger flow than a server key —
  flag if you actually want per-user calendar read access, that's a distinct scope of work from Places/Routes).

## Partner-gated — real business relationships, not instant signups

### Zenchef (dining reservations) + Joy/Privateaser (large group bookings — same company)
- **Reality, verified against their own help center**: this is **not** a self-serve developer signup.
  Either a specific restaurant needs an active Zenchef "Grow" subscription and requests API access on your
  behalf, or you email **help@zenchef.com** directly to request API documentation and a sandbox/demo
  restaurant. [help.zenchef.com — Zenchef API](https://help.zenchef.com/hc/en-gb/articles/27690768125597-Zenchef-API)
- **What this means for Ittsui**: there's no key to "get" without first having a real restaurant partner
  or a direct conversation with Zenchef's team. This is a business-development task, not a technical
  blocker I can hand you a link for and be done.

### TheFork B2B API
- **Reality, verified against their docs' own framing**: the introduction page explicitly calls itself
  "your entry gate to make the most of **our partnership**" and targets "established partners" — same
  situation as Zenchef, not a self-serve API key. [docs.thefork.io/B2B-API/introduction](https://docs.thefork.io/B2B-API/introduction)
- **What this means**: contact TheFork's partnerships team directly; there's no signup form to link you to.

## Infrastructure — only relevant if you actually want the Postgres/Redis architecture

I'm not doing this migration unprompted given the live-production risk (real user accounts and
relationship data currently in Firestore) — but here's exactly what's needed the moment you decide to:

- **Postgres + PostGIS**: [Supabase](https://supabase.com) (Postgres + PostGIS out of the box, free tier,
  signup takes ~2 minutes) or [Neon](https://neon.tech) via Vercel's own Storage tab (since you're already
  on Vercel — Vercel → your project → Storage → Create Database → Postgres). Either works; Vercel's own
  integration is the path of least friction since it wires the connection string into your environment
  variables automatically.
- **Redis**: [Upstash](https://upstash.com) — serverless Redis, also available directly from Vercel's
  Storage tab, same one-click env-var wiring.
- **Once either exists**: give me the connection string (as a Vercel env var, not pasted in chat) and I'll
  write the schema and a real migration plan — staged, with a rollback path, run against a copy of the
  data first. A live cutover of the only datastore behind real user logins doesn't get a single unattended
  pass regardless of who's asking; that's not a judgment call, it's just how you don't lose someone's
  account.

## Authentication — Passkeys/WebAuthn: real technical blocker, not a missing credential

Verified current status (2026-08-22): **Firebase Auth does not support passkey sign-in in production.**
Their Auth emulator gained mock passkey support in mid-2026, but nothing ships in the real product. The
one extension that bridged this is being **shut down March 31, 2027**, so it's not a viable path anyway.

This isn't blocked by a missing account — it's blocked by the vendor not having shipped the feature. Real
options, both requiring actual implementation work, not a signup:
1. **[SimpleWebAuthn](https://simplewebauthn.dev/)** (real, maintained, open-source library) handles the
   actual passkey ceremony client-side, then mints a Firebase custom token server-side to bridge into the
   existing Firebase Auth session — keeps Firestore rules and everything else built on `request.auth.uid`
   unchanged. This is buildable now, no waiting on Google.
2. Migrate off Firebase Auth entirely to a provider with native passkey support (e.g., Supabase Auth, which
   [has an open passkey RFC](https://github.com/orgs/supabase/discussions/8677) — check its current status
   before committing, it wasn't shipped as of this verification either) — bigger scope, only worth it if
   also moving the database per the section above.

Either path needs a decision from you (option 1 is buildable today without touching your database; option
2 only makes sense bundled with the Postgres migration) — tell me which and I'll start.

## React Native / Expo migration

No external account blocks this one — it's pure engineering scope. Realistic picture: every screen
currently rendered by the Capacitor WebView (i.e., the entire app) would be rebuilt as native React Native
components; none of the existing JSX/Tailwind reuses directly. The Android signing, App Links, and push
notification wiring from this session would need to be redone in the RN/Expo equivalents (Expo has its own
credential and EAS Build system, separate from the raw Gradle/`keytool` setup already in place). Tell me
to start and I will — flagging honestly that "start" here means weeks of rebuild, not a same-session change,
so I'd sequence it as its own tracked effort rather than mixed into other work.
