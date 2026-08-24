# Google Play launch — closed testing → Production, verified requirements

This file was referenced by `docs/play-console-assets/internal-testing.md` but never actually
written — created 2026-08-24 to close that gap, and to verify the actual current requirement
directly against Google's own page rather than trust the "verify this at setup time" caveat that
doc already carried (Google has changed this policy more than once).

## The real, current requirement (verified 2026-08-24 against Google's own support page)

Source: [Play Console Help — App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

- **A minimum of 12 testers, opted in continuously for at least 14 days**, is required before a
  new personal developer account can apply for Production (public) access.
- "Continuously" is load-bearing: if a tester opts out and back in, the 14-day count resets for
  that tester — the days must be consecutive.
- The production-access application itself asks the developer to answer real engagement
  questions: *whether testers used all available app features*, and *whether tester usage matched
  expected production user behavior* — this is not a passive "12 people installed it and did
  nothing" checkbox. Recruit testers who will actually open the app repeatedly during the 14 days,
  not just accept the install.
- **After the 14 days end, there is a separate application + review step** — "review usually
  takes seven days or less, but can occasionally take longer." This is the part easy to miss when
  planning backward from a launch date: the 14-day count and the review period are sequential, not
  overlapping.

## What this means for the 2026-09-05–10 plan (see [[android-play-store-launch-date]] memory)

Testing 14 consecutive days from a 2026-09-05–10 start ends 2026-09-19–24. **Production access
is not automatic at that point** — the application still needs to be submitted and reviewed
(up to ~7 more days per Google's own wording). Realistic clearance window is closer to
**2026-09-26–10-01** in the median case, not 2026-09-19–24. If 2026-09-20/24 is a hard external
deadline (not just this doc's earlier estimate), starting closed testing a few days earlier than
2026-09-05 is the lever that actually protects the deadline — the 14-day requirement itself
cannot be shortened.

## Checklist, in dependency order

1. **Play Console developer account** exists and identity verification is complete (human action,
   one-time $25 fee — confirm this is already done before assuming any later step is reachable).
2. **Store listing minimums** filled in (app name, short description, icon, ≥1 screenshot, privacy
   policy URL, content rating questionnaire) — required before *any* release track, including
   testing. Draft copy: `docs/play-console-assets/listing.md`. Privacy policy:
   `https://www.ittsui.fr/confidentialite` (live, real, updated 2026-08-24 to cover the
   contacts/meeting-request feature and the geo-suggestion third-party data flow — see that file's
   own history before assuming it's still current).
3. **Legal entity fields on `mentions-legales`** (`[À COMPLÉTER]` markers — publisher name/status,
   SIRET if applicable, address, publication director) — Play Console's own developer registration
   asks for similar legal identity info, so resolve both together rather than treating them as
   separate tasks. Only the real account owner can fill these in; nothing here fabricates them.
4. **First app upload to Play Console** — generates the Play App Signing certificate.
   `public/.well-known/assetlinks.json` needs that certificate's SHA-256 fingerprint added
   alongside the existing upload-key fingerprint (see `docs/android.md`'s App Links section) or
   App Links verification silently fails for anyone who installs via Play Store specifically.
5. **Open the Closed testing track**, add ≥12 real testers by their exact Google account emails,
   send them the opt-in link, and confirm they actually install and open the app — not just accept
   the invite.
6. **Hold 14 consecutive days**, watching for any tester opting out and back in (resets their
   count).
7. **Submit the Production-access application** answering the real engagement questions honestly —
   fabricated answers here risk a worse outcome (account-level enforcement) than a slower, honest
   timeline.
8. **Wait for review** (~7 days typical, per Google's own wording — treat as a range, not a fixed
   number).

## What NOT to do to compress this timeline

Buying testers, using bot accounts, or having the same person's account cycle through
install/uninstall to fake reaching 12 do not satisfy this requirement honestly and risk Google
Play Developer Program Policy enforcement against the account — a suspended developer account is
a far worse outcome for a 2026-09-20 target than an honest few extra days.
