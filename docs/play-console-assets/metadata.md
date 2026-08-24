# Play Console technical metadata (verified against the actual repo/keystore)

## Package identity

- **Package name**: `fr.ittsui.app` (`android/app/build.gradle`'s `applicationId` — this is
  permanent once first uploaded to Play Console; it can never change for this listing).
- **Version**: `versionCode 1`, `versionName "1.0"` (`android/app/build.gradle`) — bump both for
  every future upload; `versionCode` must strictly increase.

## Signing certificate

- **SHA-256**: `68:FB:1A:7C:10:DF:A8:ED:69:15:65:D9:E2:D4:6F:28:71:E5:46:B2:C6:BB:CE:FD:F5:D7:C8:8F:CA:43:91:5A`
- **SHA-1**: `45:0D:80:1D:63:C9:8C:95:18:99:F7:4B:73:7F:9F:AA:50:00:06:DE`
- Generated 2026-08-21, RSA 2048, valid until 2056-08-20. Full details and secret-handling
  process: `docs/android.md`.
- This is the **upload key** fingerprint. Once Play App Signing is enabled (Google's default for
  new apps — there is no way to opt out on first upload as of current Play Console policy, verify
  this hasn't changed at submission time), Google generates a *separate* app signing key and
  re-signs the app for distribution. That second certificate's fingerprint only exists after the
  first upload (Play Console → Setup → App signing) and must be added to
  `public/.well-known/assetlinks.json`'s `sha256_cert_fingerprints` array for App Links to verify
  on Play-Store-installed copies — the fingerprint above alone is not sufficient for that.

## Content rating

Not completed — Play Console's content rating questionnaire (IARC) is answered inside the
Console UI, not something to pre-fill here. Given this app has no violence/gambling/mature
content and is a relationship-scheduling tool, expect the lowest rating tiers across the board,
but the actual questionnaire answers are the real determination, not this document's guess.

## Target audience & Data Safety form

- **Target audience**: general audience, not directed at children — this app requires a Google
  sign-in and handles other real people's contact info (invitation flow, contacts list), which is
  not appropriate for Play's "designed for children" track.
- **Data Safety form** (Play Console → App content → Data safety) — what's actually collected,
  per `app/confidentialite/page.tsx` (the real, current privacy page, not a draft):
  - **Personal info**: email, name (via Google Sign-In); also another person's name + email when
    the user adds a contact or invites/proposes a meeting to them (`lib/types.ts`'s `Contact` and
    `MeetingRequest`, added 2026-08-23) — not a chat, just enough to send that one invitation.
  - **App activity**: relationship/invitation data, venue preferences, ad-hoc meeting-request
    status (pending/accepted/declined).
  - **Approximate location**: postal code only if the user opts in — precise GPS is never sent or
    stored (verify this claim still holds against `app/hooks/useUserLocation.ts` before
    submitting the form, since the form is a legal representation to Google, not just a
    convenience checklist).
  - **Third-party data sharing, both client-side only (never through Ittsui's own servers)**:
    a typed or detected postal code is sent to `api-adresse.data.gouv.fr` (French government,
    address/geocoding) for both reverse geocoding (GPS → postal code) and, since 2026-08-23,
    forward geocoding (postal code → coordinates) to power real venue suggestions on
    `/request/new`; those coordinates are then sent to `overpass-api.de` (OpenStreetMap) to find
    nearby venues. Neither the postal code nor the coordinates are sent to or stored by Ittsui
    itself in this flow — see `lib/geoVenueSuggestions.ts`.
  - Declared: no data sold, no third-party advertising trackers (per `confidentialite`'s own
    "ce qu'Ittsui ne fait pas" section).
  - Push token stored for notifications (`app/api/register-push-token/route.ts`).
  - **Security**: WebAuthn passkey public keys, if a user opts into passkey sign-in
    (`passkeyCredentials` collection) — not personally identifying on its own, but worth listing
    under Play's "security practices" data type for completeness.

Fill the actual form fields in Play Console directly from `app/confidentialite/page.tsx`'s current
content at submission time — it may have changed since this document was written; this file is
not the source of truth, that page is.
