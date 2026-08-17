// Client-side Firebase init — used in browser (setup flow, dashboard, RSVP taps)
// Env vars come from Vercel project settings (NEXT_PUBLIC_ prefix = exposed to browser)

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
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

// --- Auth helpers ---

const googleProvider = new GoogleAuthProvider();

// Signs the user in with Google, then writes/updates their users/{uid} doc
// with their email. This is what lets /api/invite-partner look up the
// inviter's own email (for the self-invite check and confirmation email),
// and what /api/find-user style lookups depend on generally. Without this
// write, inviterEmail comes back undefined everywhere downstream.
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
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

  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Messaging (push) only works in the browser and only if the browser supports it
// (Safari on iOS needs 16.4+ and the PWA added to home screen)
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
}