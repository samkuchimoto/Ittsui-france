# Android build & release signing

## Current config (verified, not assumed)

- `applicationId`: `fr.ittsui.app`
- `minSdkVersion` / `compileSdk` / `targetSdk`: 24 / 36 / 36 (`android/variables.gradle`)
- `versionCode` / `versionName`: `1` / `"1.0"` (`android/app/build.gradle`) — bump both for every
  Play Store upload; `versionCode` must strictly increase, `versionName` is the human-facing string.
- `google-services.json` is now wired through CI the same way as the signing keystore: add a
  `GOOGLE_SERVICES_JSON` GitHub secret (the file's contents, base64-encoded — same
  `[Convert]::ToBase64String(...)` / `base64 -i` commands as the keystore, see below) and
  `android.yml` decodes it to `android/app/google-services.json` before the build steps. The
  `com.google.gms:google-services` Gradle plugin classpath is already present
  (`android/build.gradle:11`) and `app/build.gradle`'s existing try/catch applies it automatically
  once the file exists — no other Gradle change needed. Unlike the signing keystore, this file
  isn't irreplaceable — it can be re-downloaded from the Firebase console any time (Project
  settings → your Android app → `google-services.json`) — but it's still kept out of the repo for
  consistency with how this project handles all Firebase/signing config (`android/.gitignore`; it
  was previously listed there but commented out — fixed in an earlier pass).

## Release signing

`android/app/build.gradle` reads signing credentials from two possible sources, checked in this
order, neither ever committed:

1. **`android/keystore.properties`** (gitignored) — for a developer building a signed release
   locally. Copy `android/keystore.properties.example` to `android/keystore.properties` and fill
   in the real values.
2. **Environment variables** `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` — what `.github/workflows/android.yml` uses. The
   workflow decodes the `ANDROID_KEYSTORE_BASE64` GitHub secret to a runner-local temp file for
   the duration of the `bundleRelease` step, then deletes it.

If neither source is present, `buildTypes.release` has no `signingConfig` and `bundleRelease`
still produces an AAB — just unsigned. That's enough to verify the release build itself compiles
even before a signing identity exists; it's not enough to upload to Play Console, which requires
a signed bundle.

### The release keystore

Generated 2026-08-21 with `keytool -genkeypair`, alias `ittsui`, RSA 2048, valid 30 years
(2026-08-21 → 2056-08-20 — past Google's minimum-validity requirement for new Play Store apps).
Password rotated 2026-08-22 (`keytool -storepasswd`, same key material, same SHA-256 fingerprint
below — verified unchanged after the rotation) because the original password contained `% ^ & = +`,
characters that are genuinely risky to carry through a terminal or shell on Windows (`%` triggers
variable expansion, `^` is cmd.exe's escape character) — the actual, confirmed cause of two
consecutive `Build release AAB` CI failures ("keystore password was incorrect"), not a guess. The
current password is alphanumeric only.
**This keystore is the only thing that can ever sign an update to `fr.ittsui.app` on Google Play.**
If it's lost, there is no recovery path — the app would have to be republished under a new
applicationId, losing all existing installs, reviews, and ratings.

The file and its credentials were generated locally (never transmitted to any third-party
service) and handed to the project owner directly — they are not, and must never be, committed to
this repository. Store both the `.jks` file and its password in a password manager or equivalent
durable, backed-up, access-controlled storage. A local machine's temp folder is not that.

### Configuring GitHub Actions to build signed releases

In the repo's GitHub Settings → Secrets and variables → Actions, add:

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The keystore file, base64-encoded (see below) |
| `ANDROID_KEYSTORE_PASSWORD` | The store password |
| `ANDROID_KEY_ALIAS` | `ittsui` |
| `ANDROID_KEY_PASSWORD` | Same as the store password (PKCS12 keystores use one password for both) |

To base64-encode the keystore for the `ANDROID_KEYSTORE_BASE64` value:

- Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\ittsui-release.jks")) | Set-Clipboard`
- macOS/Linux: `base64 -i ittsui-release.jks | pbcopy` (or redirect to a file instead of `pbcopy`)

Once all four secrets exist, every push to `main` will produce a **signed** release AAB
(`ittsui-release-aab-signed` artifact). Until then, the workflow still runs and uploads an
**unsigned** AAB (`ittsui-release-aab-UNSIGNED`) so the release build itself stays verified
independent of whether signing is configured yet.

## Verified vs. not yet verified

- **VERIFIED**: `android.yml` already builds a debug APK successfully on every push to `main`
  (existing workflow, unchanged by this pass).
- **IMPLEMENTED BUT NOT VERIFIED**: the `bundleRelease` step and signing wiring added in this
  pass — this machine has no working local Gradle/JDK combination (Gradle 8.14.3 can't run on the
  only JDK present, a bundled JDK 25), so this was configured but not run locally. It needs an
  actual CI run (push to `main` or a manual `workflow_dispatch`) to move from "implemented" to
  "verified."
- **BLOCKED / REQUIRES HUMAN ACTION**: adding the four secrets above to GitHub — this repository
  doesn't have `gh` CLI authenticated in the environment this was built in, and setting
  production signing secrets is something the repo owner should do directly rather than have
  automated, regardless.

## App Links — IMPLEMENTED, PARTIALLY VERIFIABLE

- `public/.well-known/assetlinks.json` lists this keystore's SHA-256 fingerprint
  (`68:FB:1A:7C:10:DF:A8:ED:69:15:65:D9:E2:D4:6F:28:71:E5:46:B2:C6:BB:CE:FD:F5:D7:C8:8F:CA:43:91:5A`).
  `android/app/src/main/AndroidManifest.xml` has an `autoVerify` intent-filter for both `ittsui.fr`
  and `www.ittsui.fr` (no canonical redirect between the two was found in this repo — worth
  settling which is authoritative and dropping the other host).
- **Not sufficient on its own for Play-Store-installed copies**: once this app is first uploaded
  to Play Console, Google's Play App Signing re-signs it with a *different* certificate for
  distribution. That certificate's fingerprint (Play Console → Setup → App signing, only exists
  after first upload) must be added as a second entry in `assetlinks.json`'s
  `sha256_cert_fingerprints` array, or App Links verification will fail for anyone who installed
  via Play Store rather than the direct APK.
- Verifiable today at `https://www.ittsui.fr/.well-known/assetlinks.json` once deployed — confirm
  it actually serves with `Content-Type: application/json` before relying on it; Vercel generally
  serves `public/` dotfiles correctly but this hasn't been checked against a live deployment.

## Release APK + GitHub Release publishing — IMPLEMENTED, NOT YET VERIFIED

`android.yml` now also runs `assembleRelease` (a real installable APK, unlike the AAB which needs
bundletool) and, only when signing secrets are present, publishes both the AAB and APK to a
rolling `android-latest` GitHub Release via `softprops/action-gh-release` — a well-established,
widely-used action, using the default `GITHUB_TOKEN` (no new secret). This is what
`lib/config/store.ts`'s `ANDROID_APK_DIRECT_URL` points at, since GitHub Actions *artifacts*
(unlike Releases) require a GitHub login even on a public repo and expire after 90 days. Not yet
confirmed against a real run with real signing secrets — needs one to move from "implemented" to
"verified."

## Not yet implemented

- Play Store listing, screenshots, content rating, Data Safety form — all Play Console UI work,
  not code. Draft copy: `docs/play-console-assets/`.
- The 12-tester / 14-day closed testing track (only relevant for *Production* access, not
  Internal testing — see `docs/play-console-assets/internal-testing.md`) — verify the current
  requirement in Play Console at submission time rather than trusting this document, Google's
  policy for this has changed more than once.
