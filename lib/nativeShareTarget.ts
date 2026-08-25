// Lets someone reach Ittsui from wherever they already are — TikTok,
// Instagram, a group chat, anywhere with a native "Share" button — by
// registering Ittsui as a destination in the phone's own share sheet,
// instead of requiring them to open the app first. Android + installed
// app only: Android's is a plain manifest intent-filter (safe to wire up
// here); iOS needs an actual Xcode Share Extension target (a new target,
// an App Group, a separate ShareViewController.swift) that has to be
// created in Xcode itself, not something safely hand-edited from text
// files alone — that stays an explicit, real gap, not something faked.
//
// IMPLEMENTED BUT NOT VERIFIED ON A REAL DEVICE — same status as
// lib/nativeContacts.ts and lib/nativeSpeech.ts. No device was available
// to confirm Ittsui actually appears in Android's share sheet and that a
// shared link/text actually arrives here correctly.

import { Capacitor } from "@capacitor/core";

// null on web or if the plugin genuinely isn't there (e.g. an older
// installed build before this existed) — callers already only call this
// after their own isNativePlatform() check elsewhere in this app's
// pattern, but this guards it again directly since a dynamic import
// failure here shouldn't crash whatever page happens to mount first.
export async function onShareReceived(callback: (text: string) => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    const { CapacitorShareTarget } = await import("@capgo/capacitor-share-target");
    const handle = await CapacitorShareTarget.addListener("shareReceived", (event) => {
      // texts[0] is normally the shared URL/caption together (Android
      // bundles a shared link and any caption into one SEND intent extra
      // rather than separate fields) — joining the rest covers apps that
      // do send more than one text extra, without assuming which shape a
      // given app uses.
      const text = event.texts?.join(" ").trim();
      if (text) callback(text);
    });
    return () => {
      handle.remove();
    };
  } catch {
    return () => {};
  }
}
