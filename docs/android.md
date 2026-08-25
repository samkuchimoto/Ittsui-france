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

## App Links — IMPLEMENTED, MOSTLY VERIFIED

- `public/.well-known/assetlinks.json` lists this keystore's SHA-256 fingerprint
  (`68:FB:1A:7C:10:DF:A8:ED:69:15:65:D9:E2:D4:6F:28:71:E5:46:B2:C6:BB:CE:FD:F5:D7:C8:8F:CA:43:91:5A`).
  `android/app/src/main/AndroidManifest.xml` has an `autoVerify` intent-filter for both `ittsui.fr`
  and `www.ittsui.fr`. The "no canonical redirect found in this repo" note that used to be here was
  about the *app's own code* — there genuinely isn't one in `next.config.js`. There IS one at the
  Vercel platform/domain level, outside the repo: confirmed via a real `curl` trace that
  `https://ittsui.fr/<any path>` 308-redirects to `https://www.ittsui.fr/<same path>` uniformly, so
  `www.ittsui.fr` is the actual canonical/terminal host in production today. Both hosts staying in
  the intent-filter is still fine (a raw `ittsui.fr` link — an old email, a bookmark — should still
  open the app rather than bounce through a browser redirect first), just noting this answers the
  "which is authoritative" question this file used to leave open.
- **Not sufficient on its own for Play-Store-installed copies**: once this app is first uploaded
  to Play Console, Google's Play App Signing re-signs it with a *different* certificate for
  distribution. That certificate's fingerprint (Play Console → Setup → App signing, only exists
  after first upload) must be added as a second entry in `assetlinks.json`'s
  `sha256_cert_fingerprints` array, or App Links verification will fail for anyone who installed
  via Play Store rather than the direct APK.
- Verified for real against the live deployment (not just assumed): `curl -I
  https://www.ittsui.fr/.well-known/assetlinks.json` returns `Content-Type: application/json;
  charset=utf-8` and the expected JSON body — Vercel does serve this `public/` dotfile correctly.

## Release APK + GitHub Release publishing — IMPLEMENTED, NOT YET VERIFIED

`android.yml` now also runs `assembleRelease` (a real installable APK, unlike the AAB which needs
bundletool) and, only when signing secrets are present, publishes both the AAB and APK to a
rolling `android-latest` GitHub Release via `softprops/action-gh-release` — a well-established,
widely-used action, using the default `GITHUB_TOKEN` (no new secret). This is what
`lib/config/store.ts`'s `ANDROID_APK_DIRECT_URL` points at, since GitHub Actions *artifacts*
(unlike Releases) require a GitHub login even on a public repo and expire after 90 days. Not yet
confirmed against a real run with real signing secrets — needs one to move from "implemented" to
"verified."

## GPS location detection almost certainly doesn't work inside the native app — UNVERIFIED, NEEDS A REAL DEVICE

Found 2026-08-24 while auditing for the Play launch, via static analysis only — no physical
Android device or emulator was available to actually confirm this, so treat it as a strong,
reasoned hypothesis to test before/during closed testing, not a fixed bug.

`app/hooks/useUserLocation.ts` (the "Utiliser ma position actuelle" button on `/setup`, and the
postal-code auto-fill on `/request/new`) calls the plain browser `navigator.geolocation` Web API.
That works fine in a real mobile/desktop browser, which handles its own OS-level permission
prompt independent of any app. Inside this app's native Android shell, though:

- `capacitor.config.ts` wraps a plain remote WebView (`server.url: "https://ittsui.fr"`) — no
  `@capacitor/geolocation` plugin is installed (`package.json` only has `@capacitor/haptics` and
  `@capacitor/push-notifications` as native plugins beyond core/android/ios).
- `AndroidManifest.xml` declares only `android.permission.INTERNET` — no
  `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` at all.
- Android's system WebView needs both that manifest permission AND an explicit
  `WebChromeClient.onGeolocationPermissionsShowPrompt()` override to ever grant a page's
  `navigator.geolocation` call anything — Capacitor's default remote-URL WebView setup does not
  wire this up on its own. Without it, `getCurrentPosition()` most likely just errors out
  immediately inside the native app specifically.

If true, this fails gracefully rather than crashing — `useUserLocation.ts`'s error handling
(fixed 2026-08-23 to actually show a message and allow retry, see AGENTS.md) would show "Impossible
de déterminer votre position" and the manual postal-code input still works — so this is a degraded
feature, not a broken app. Still worth fixing properly before real users hit it, given it's one of
the app's actual value propositions ("lieux près de chez vous").

**Real fix, not attempted here** (needs a device to verify, which is why this wasn't just done):
add the `@capacitor/geolocation` plugin, add `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` to
`AndroidManifest.xml`, and branch `useUserLocation.ts` to call the Capacitor plugin when
`Capacitor.isNativePlatform()` is true (same pattern `lib/nativePush.ts` already uses for push
tokens) instead of the raw Web API. Test on a real device or emulator before trusting it —
this exact class of "looks right in the diff, unverified on a real device" mistake is precisely
what this project's own rules warn against.

## Native contact picker — IMPLEMENTED, NOT VERIFIED ON A REAL DEVICE

Added 2026-08-25 (`@capacitor-community/contacts` v8.0.0) so someone can pick a recipient from
their phone's real address book instead of typing a name and email — the concrete gap identified
while working through a "70-year-old picking up her grandson at the airport" scenario, where
typing anything at all was the friction point. `lib/nativeContacts.ts` wraps it (same
`Capacitor.isNativePlatform()`-guarded, dynamic-`import()` pattern as `lib/nativePush.ts`), wired
into an "Importer depuis mes contacts" button on `/contacts` (`ContactsClient.tsx`) and `/request/new`
(`RequestFormClient.tsx`, both its normal and "Mode simple" flows).

Deliberately uses the plugin's `pickContact()` — opens the OS's own single-contact picker UI —
not `getContacts()`, which returns the whole address book and would need a custom in-app list plus
a broader permission grant for something someone only ever does once. This is also the real reason
a native plugin is needed here at all rather than the browser Contact Picker API: that Web API was
checked this session and does not work reliably inside a bare Capacitor remote-URL WebView on
either platform.

What was actually verified, without a device:
- The plugin's real API and Android permission behavior, by reading its TypeScript definitions and
  Java/Swift source directly (not assumed from its docs) — confirmed `pickContact()` is the right
  method, and that Android's `ContactsPlugin.java` groups `READ_CONTACTS`/`WRITE_CONTACTS` under
  one Capacitor permission alias (`"contacts"`) that gets checked as a whole, which is why both are
  declared in `AndroidManifest.xml` even though Ittsui never writes to a device's address book.
- `NSContactsUsageDescription` added to `ios/App/App/Info.plist` (iOS has no separate read-only
  permission for its Contacts framework).
- `npx tsc --noEmit` and `npm run build` both pass; the production server (`npm run start`) serves
  `/contacts` and `/request/new` without a server-side crash.

What was NOT verified, because no physical Android/iOS device or emulator was available: whether
the permission prompt actually appears, whether the native picker UI actually opens, and whether a
picked contact's data actually flows back correctly. Same status this file already uses for the
GPS gap above — treat this as "should work," not "confirmed working," until tested on a real
device before/during closed testing.

## Voice name search — IMPLEMENTED, NOT VERIFIED ON A REAL DEVICE

Added 2026-08-25 (`@capacitor-community/speech-recognition` v7.0.1), for the "hands busy at the
airport" scenario the contact picker above was also built for: say a contact's name instead of
tapping through a chip list. `lib/nativeSpeech.ts` wraps it (same
`Capacitor.isNativePlatform()`-guarded, dynamic-`import()` pattern as `lib/nativePush.ts` and
`lib/nativeContacts.ts`), wired into a "🎤 Dire un nom" button on `/request/new`
(`RequestFormClient.tsx`).

Deliberately narrow in scope: voice only replaces the recipient-search step. Venue category, date,
and time all stay tap-only — those are exactly the fields most likely to get misheard, and this
project already had to harden `lib/parseMeetingRequest.ts` once against unreliable date handling by
moving date *computation* out of the model entirely. The name a person says is matched, via plain
string filtering (`extractNameFromVoiceTranscript` in `RequestFormClient.tsx`, not an LLM call),
only against that signed-in user's own already-saved contacts — it never creates a new contact from
voice, and a match is never applied silently: it always surfaces as a "Tad Martin ?" / Oui / Non
confirmation first, since a misheard name landing on the wrong recipient is worse here than
anywhere else in the app.

What was actually verified, without a device:
- The plugin's real resolve behavior, by reading its Android (Java) and iOS (Swift) source
  directly: with `partialResults: false`, both platforms resolve `start()` exactly once, with the
  final transcript — Android only calls back on ASR's `onResults`, and iOS sets
  `shouldReportPartialResults = false` on the recognition request itself.
- Android needs `RECORD_AUDIO` (declared in `AndroidManifest.xml`, and the plugin's own manifest
  already carries it too); iOS needs both `NSSpeechRecognitionUsageDescription` (its
  `SFSpeechRecognizer`) and `NSMicrophoneUsageDescription` (the underlying `AVAudioEngine` capture)
  in `Info.plist` — added.
- `npx tsc --noEmit` and `npm run build` both pass; the production server serves `/request/new`
  without a server-side crash.

What was NOT verified, because no physical Android/iOS device or emulator was available: whether
the mic permission prompt actually appears, whether French (`fr-FR`) recognition is actually
accurate enough for real names in real noisy conditions (an airport, notably), and whether a
result actually flows back and matches correctly end to end. Same status as the contact picker and
the GPS gap above — "should work," not "confirmed working," until tested on a real device.

## Not yet implemented

- Play Store listing, screenshots, content rating, Data Safety form — all Play Console UI work,
  not code. Draft copy: `docs/play-console-assets/`.
- The 12-tester / 14-day closed testing track (only relevant for *Production* access, not
  Internal testing — see `docs/play-console-assets/internal-testing.md` and
  `docs/google-play-launch.md`, the latter verified directly against Google's current support
  page on 2026-08-24, including a review-period nuance the original launch-date plan missed).
