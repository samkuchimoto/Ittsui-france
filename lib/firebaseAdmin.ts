// Server-side Firebase Admin init — used only inside /app/api routes
// (weekly-propose cron, rsvp handler). Never imported into client code.
// Needs a service account key set as env vars in Vercel (not the public config).

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

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
