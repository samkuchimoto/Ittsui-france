// Client-side Firebase init — used in browser (setup flow, dashboard, RSVP taps)
// Env vars come from Vercel project settings (NEXT_PUBLIC_ prefix = exposed to browser)

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { registerNativePush } from "@/lib/nativePush";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initializing on hot reload / multiple imports
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Explicit local persistence — already the SDK default in a normal browser
// tab, but the one place that default isn't guaranteed is the Capacitor
// Android WebView (see the redirect-sign-in comment below), so this is
// made explicit rather than assumed.
//
// Fire-and-forget, NOT awaited by watchAuthState(): an earlier version
// gated onAuthStateChanged's attachment on this promise resolving first,
// which caused every page (invite, dashboard, setup/pending) to hang on
// its loading spinner forever whenever setPersistence() itself hung —
// which it reliably does with multiple tabs of the same origin open at
// once (an IndexedDB-locking issue across tabs, not something .catch()
// protects against — that only handles rejection, not a promise that
// never settles). onAuthStateChanged already reflects the current
// persisted session correctly regardless of whether this has finished —
// it only affects persistence of *future* sign-ins — so there was never a
// real reason to block on it.
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// --- Auth helpers ---

const googleProvider = new GoogleAuthProvider();

// Completes sign-in for BOTH paths below: writes the users/{uid} doc
// (email, displayName) that /api/invite-partner and friends depend on, and
// registers native push. notificationPrefs only on first creation, never
// on a repeat sign-in — this is the one place a real fix belongs (see
// lib/notify.ts's defensive default for the read side, which covers every
// account that already existed before this write did). Once a real
// settings screen exists to let someone turn a channel off, overwriting
// this on every login would silently fight it.
async function finishSignIn(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  await setDoc(
    userRef,
    {
      email: user.email?.toLowerCase() ?? null,
      displayName: user.displayName ?? null,
      updatedAt: new Date().toISOString(),
      ...(existing.exists() ? {} : { notificationPrefs: { pushEnabled: true, emailEnabled: true } }),
    },
    { merge: true }
  );
  await registerNativePush(user);
}

// account-exists-with-different-credential is a real, actionable case
// (same email, different sign-in provider already on file) — worth a
// distinct message rather than the generic fallback, for either sign-in
// path below.
function authFailureMessage(err: unknown): string {
  const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : null;
  return code === "auth/account-exists-with-different-credential"
    ? "Un compte existe déjà avec cette adresse e-mail via une autre méthode de connexion."
    : "La connexion a échoué. Réessayez.";
}

// Mobile *browsers* (not the Capacitor-wrapped native app, checked
// separately) are where signInWithPopup demonstrably fails: the popup gets
// silently blocked, or loses its connection back to the opener when the OS
// backgrounds the tab during the Google auth screen — the real, observed
// "stuck on chargement, keeps asking me to reconnect" report. Redirect
// doesn't have that failure mode, so it stays the mobile-web path.
function isMobileWebBrowser(): boolean {
  if (typeof navigator === "undefined" || Capacitor.isNativePlatform()) return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Desktop uses signInWithPopup: the whole exchange happens inside the
// popup and resolves this promise directly, with no getRedirectResult()
// round-trip afterward. That round-trip is exactly what broke sign-in
// twice in production on desktop Chrome — once via storage partitioning
// under the firebaseapp.com authDomain, and again after moving authDomain
// to this app's own domain (ittsui.fr) specifically to fix that: the
// custom-domain rewrite in next.config.js fixed the redirect_uri Google
// receives, but getRedirectResult() back on this page still failed to pick
// up the completed sign-in. Popup sidesteps the whole class of bug by
// never relying on cross-request storage read-back — mobile web is
// unaffected by any of this since it keeps using redirect below.
//
// Note: this still isn't a fix for the Capacitor-wrapped native app
// specifically — Google's OAuth policy blocks sign-in inside embedded
// WebViews entirely regardless of popup vs. redirect, so the native app
// needs its own native Google Sign-In SDK integration (a real follow-up,
// not attempted here).
export async function signInWithGoogle(): Promise<void> {
  if (isMobileWebBrowser()) {
    await signInWithRedirect(auth, googleProvider);
    return;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    await finishSignIn(result.user);
  } catch (err) {
    const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : null;
    // User closed the popup or double-clicked the button — not a real
    // error, nothing to surface.
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    if (code === "auth/popup-blocked") {
      throw new Error("Le navigateur a bloqué la fenêtre de connexion. Autorisez les popups pour ittsui.fr et réessayez.");
    }
    throw new Error(authFailureMessage(err));
  }
}

// The mobile-web redirect path returns to this same page on a fresh load,
// so there's no function call left to resolve — the result has to be
// picked up here instead, once, whenever auth state is first watched.
// onAuthStateChanged fires with the new user regardless, but this is what
// actually runs finishSignIn for that path (the popup path above already
// ran it inline, before this ever gets a chance to fire for it).
let redirectResultHandled = false;
let onRedirectError: ((message: string) => void) | null = null;

function consumeRedirectResultOnce() {
  if (redirectResultHandled) return;
  redirectResultHandled = true;
  getRedirectResult(auth)
    .then(async (result) => {
      if (!result) return;
      await finishSignIn(result.user);
    })
    .catch((err) => {
      onRedirectError?.(authFailureMessage(err));
    });
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function watchAuthState(callback: (user: User | null) => void, onError?: (message: string) => void) {
  if (onError) onRedirectError = onError;
  consumeRedirectResultOnce();
  return onAuthStateChanged(auth, callback);
}

// Messaging (push) only works in the browser and only if the browser supports it
// (Safari on iOS needs 16.4+ and the PWA added to home screen)
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
}