// Server-side Firebase Admin init — used only inside /app/api routes
// (weekly-propose cron, rsvp handler). Never imported into client code.
// Needs a service account key set as env vars in Vercel (not the public config).

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";

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

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);
export const adminAuth = getAuth(adminApp);

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
