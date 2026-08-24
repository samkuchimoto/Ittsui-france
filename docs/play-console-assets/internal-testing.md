# Internal Testing track — fastest path to an installable Play Store link

This is Play Console UI/account work, not code — nothing here can be automated from this repo.
Documented so the process is a checklist, not a research task, when you get to it.

## Why Internal Testing specifically

Play Console has four release tracks: Internal testing → Closed testing → Open testing →
Production. Internal testing is the only one that's near-instant (no review wait, typically
available within minutes) and doesn't require the closed-testing prerequisites. The "12 testers
for 14 consecutive days" rule is real and confirmed (verified 2026-08-24 directly against
[Play Console's own current page](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
— full detail in `docs/google-play-launch.md`, including a review-period nuance after the 14 days
that's easy to miss when planning a launch date backward) and applies to *Closed* testing as a
gate before *Production* access on new personal developer accounts. Internal testing supports up
to 100 testers and is the right track for "install it on my own phone / a few people's phones
right now" — which is what this task actually needs, not a public production release.

## Steps

1. **Play Console → your app → Testing → Internal testing → Create new release.**
2. Upload the signed AAB. Once GitHub secrets are configured (see `docs/android.md`), CI produces
   one automatically at the `android-latest` GitHub Release (`app-release.aab`) on every push to
   `main` — download it from there rather than building locally.
3. Fill in release notes (French — e.g. "Version de test interne").
4. **Testing → Internal testing → Testers tab** → create an email list (or link a Google Group)
   with the people who should get access. Testers must use the exact Google account email added
   here.
5. Save, and Play Console generates an **opt-in URL** (distinct from the public Play Store
   listing page — this is what makes it "immediate": testers open that URL, tap "Become a
   tester," and can then install via the normal Play Store app, no manual APK sideloading, no
   review wait).
6. Send that opt-in URL to your testers directly (email, message — it is not meant to be public,
   unlike the eventual production listing).

## What still blocks this

- A Play Console developer account must exist first (`docs/google-play-launch.md` — human action,
  Google identity verification + one-time fee).
- The app must be uploaded to Play Console at least once before any testing track can be
  configured — first upload is also what generates the Play App Signing certificate that
  `public/.well-known/assetlinks.json` needs a second entry for (see `docs/android.md`'s App
  Links section).
- Store listing minimums (app name, short description, icon, at least one screenshot, privacy
  policy URL, content rating questionnaire completed) are required by Play Console before *any*
  release — including internal testing — can be rolled out, even though internal testing itself
  isn't public. Draft copy: `docs/play-console-assets/listing.md`. Privacy policy URL:
  `https://www.ittsui.fr/confidentialite` (live, real content — verified in this repo, not a
  placeholder).
