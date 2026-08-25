// Native speech-to-text — only does anything inside the Capacitor shell,
// same Capacitor.isNativePlatform() guard as lib/nativeContacts.ts and
// lib/nativePush.ts. Built for one specific step: saying a contact's name
// instead of tapping through a chip list, for the "hands are busy, phone's
// in a pocket" scenario (airport pickup, groceries) that motivated this
// feature in the first place — not a general dictation box. Everything
// downstream of the name (venue category, date, time) stays taps, on
// purpose: those are exactly the fields most likely to get misheard
// ("après-demain" vs "après-demain" homophones, a mistyped digit), and
// taps carry zero recognition risk, unlike the free-text/LLM date-parsing
// path this app already had to harden once (see lib/parseMeetingRequest.ts).
//
// IMPLEMENTED BUT NOT VERIFIED ON A REAL DEVICE — same status as
// lib/nativeContacts.ts and docs/android.md's GPS section. No physical
// device or emulator was available to confirm the mic permission prompt,
// the actual recognition, or French-language accuracy; the plugin's own
// source (Java/Swift) was read directly to confirm exactly when its
// start() call resolves and with what shape, so the code below is
// verified against real plugin behavior, not assumed from its docs — but
// the native path itself still needs a real device before this moves from
// "implemented" to "verified".

import { Capacitor } from "@capacitor/core";

// null covers every non-happy path identically (web platform, feature
// unavailable, permission denied, nothing understood, or the person just
// didn't say anything) — the caller's fallback is always the same either
// way: fall back to the existing tap-based contact chips.
export async function listenOnce(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");

    const { available } = await SpeechRecognition.available();
    if (!available) return null;

    const permission = await SpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== "granted") {
      const requested = await SpeechRecognition.requestPermissions();
      if (requested.speechRecognition !== "granted") return null;
    }

    // partialResults: false makes start() resolve exactly once, with the
    // final transcript — confirmed by reading both native implementations
    // directly (Android only resolves on ASR's onResults callback;
    // iOS sets shouldReportPartialResults = false on the recognition
    // request itself, so the OS only calls back once). No custom popup on
    // either platform — the calling button owns its own "listening..."
    // state instead, so the two platforms look the same to the person
    // using it rather than Android showing a system dialog iOS has no
    // equivalent for.
    const { matches } = await SpeechRecognition.start({
      language: "fr-FR",
      maxResults: 1,
      partialResults: false,
      popup: false,
    });

    return matches?.[0]?.trim() || null;
  } catch {
    return null;
  }
}
