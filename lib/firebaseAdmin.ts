// Server-side Firebase Admin init — used only inside /app/api routes
// (weekly-propose cron, rsvp handler, etc). Never imported into client code.
// Needs a service account key set as env vars in Vercel (not the public config).
//
// adminDb/adminMessaging/adminAuth are lazy on purpose: cert() throws
// synchronously if the FIREBASE_ADMIN_* env vars aren't set, and Next.js's
// build step imports every API route module to inspect it (to collect
// route metadata) without ever calling the handlers themselves. Eager
// initialization here used to make `next build` itself require real
// Firebase Admin credentials just to *import* this file — harmless on
// Vercel (the real secrets are always present there) but it broke in a
// clean CI environment with no secrets configured, since import alone
// was enough to crash the build before a single route ever ran. The
// Proxy defers construction (and cert()'s validation) until a property
// is actually accessed at request time — every existing call site
// (adminDb.collection(...), adminAuth.verifyIdToken(...), etc.) keeps
// working unchanged.

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel env vars store newlines as literal \n — swap them back
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance as object, prop, receiver);
    },
  });
}

export const adminDb: Firestore = lazy(() => getFirestore(getAdminApp()));
export const adminMessaging: Messaging = lazy(() => getMessaging(getAdminApp()));
export const adminAuth: Auth = lazy(() => getAuth(getAdminApp()));

// Verifies the caller's Firebase ID token and returns their real uid —
// used by routes where trusting a client-supplied userId isn't safe
// enough (account deletion, writing a push token). Most routes in this
// app still trust a plain userId in the body; that's an existing,
// broader pattern this doesn't attempt to fix everywhere, only where the
// action is destructive or writes a credential-like value.
export async function verifyRequestUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice("Bearer ".length));
    return decoded.uid;
  } catch {
    return null;
  }
}
