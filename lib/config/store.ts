// /lib/config/store.ts
// Single source of truth for store links and package identity — the
// /download page, App Links docs, and anywhere else that needs "is Android
// on Play yet" all read from here instead of duplicating the same
// conditional. ANDROID_STORE_URL / IOS_STORE_URL are unset until the app is
// actually live on each store; nothing here is a placeholder/fake URL.

export const ANDROID_PACKAGE_NAME = "fr.ittsui.app";

export const ANDROID_STORE_URL = process.env.NEXT_PUBLIC_ANDROID_STORE_URL || null;
export const IOS_STORE_URL = process.env.NEXT_PUBLIC_IOS_STORE_URL || null;

// A stable, public, unauthenticated download link for early testers before
// the app is on Play — GitHub Actions *artifacts* require a GitHub login
// even on a public repo and expire after 90 days, so this points at a
// GitHub *Release* asset instead (android.yml publishes/updates the
// "android-latest" release on every signed build). Only meaningful once
// signing secrets are configured — see docs/android.md.
export const ANDROID_APK_DIRECT_URL =
  "https://github.com/samkuchimoto/Ittsui-france/releases/download/android-latest/app-release.apk";
