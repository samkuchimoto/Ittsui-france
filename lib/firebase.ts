// Client-side Firebase init — used in browser (setup flow, dashboard, RSVP taps)
// Env vars come from Vercel project settings (NEXT_PUBLIC_ prefix = exposed to browser)

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { registerNativePush } from "@/lib/nativePush";

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
// made explicit rather than assumed. watchAuthState() waits on this before
// attaching its listener so a cold start can't race an unresolved
// persistence setting.
const persistenceReady: Promise<void> =
  typeof window !== "undefined"
    ? setPersistence(auth, browserLocalPersistence).catch(() => {})
    : Promise.resolve();

// --- Auth helpers ---

const googleProvider = new GoogleAuthProvider();

// signInWithPopup used to be here, but popups are unreliable on mobile
// browsers specifically — they get silently blocked, or lose their
// connection back to the opener when the OS backgrounds the tab during
// the Google auth screen, which is exactly the "stuck on chargement,
// keeps asking me to reconnect" pattern this app was hitting. A full-page
// redirect doesn't have that failure mode. Note: this still isn't a full
// fix for the Capacitor-wrapped native app specifically — Google's OAuth
// policy blocks sign-in inside embedded WebViews entirely regardless of
// popup vs. redirect, so the native app needs its own native Google
// Sign-In SDK integration (a real follow-up, not attempted here).
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

// A redirect sign-in returns to this same page on a fresh load, so there's
// no function call left to resolve — the result has to be picked up here
// instead, once, whenever auth state is first watched. onAuthStateChanged
// fires with the new user regardless, but this is what actually performs
// the users/{uid} write (email, displayName) that /api/invite-partner and
// friends depend on, and what registers native push — both used to happen
// inline in signInWithGoogle, back when it could still see the result.
let redirectResultHandled = false;

function consumeRedirectResultOnce() {
  if (redirectResultHandled) return;
  redirectResultHandled = true;
  getRedirectResult(auth)
    .then(async (result) => {
      if (!result) return;
      const user = result.user;
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email?.toLowerCase() ?? null,
          displayName: user.displayName ?? null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await registerNativePush(user);
    })
    .catch(() => {
      // Redirect-specific errors (e.g. account-exists-with-different-
      // credential) are rare enough here not to special-case — the
      // caller's existing "not signed in" state already covers it, since
      // onAuthStateChanged simply won't report a new user in that case.
    });
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function watchAuthState(callback: (user: User | null) => void) {
  consumeRedirectResultOnce();
  let unsub: (() => void) | null = null;
  let cancelled = false;
  persistenceReady.then(() => {
    if (cancelled) return;
    unsub = onAuthStateChanged(auth, callback);
  });
  return () => {
    cancelled = true;
    unsub?.();
  };
}

// Messaging (push) only works in the browser and only if the browser supports it
// (Safari on iOS needs 16.4+ and the PWA added to home screen)
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
}