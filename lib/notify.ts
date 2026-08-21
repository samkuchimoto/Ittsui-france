// Shared notification helper: FCM push, falling back to Resend email.
// Extracted from weekly-propose/route.ts so rsvp/route.ts (confirmation
// notifications) can reuse the exact same delivery logic instead of a
// second copy that would drift from it.

import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import type { Pair, User } from "@/lib/types";

// No signup path in this repo has ever written notificationPrefs onto a
// user's Firestore doc — lib/firebase.ts's post-sign-in write only sets
// email/displayName. Reading user.notificationPrefs.pushEnabled directly
// therefore threw (Cannot read properties of undefined) for every real
// user, outside any try/catch, which silently killed the ENTIRE
// notification for both people — the weekly proposal alert and the
// "Rendez-vous verrouillé" confirmation never went out. Defaulting to
// enabled here fixes every account immediately, new and already-existing,
// without needing a Firestore backfill migration.
const DEFAULT_NOTIFICATION_PREFS = { pushEnabled: true, emailEnabled: true };

export type DeliveryStatus = "push" | "email" | "failed" | "no-recipient";

export interface NotifyResult {
  userId: string;
  status: DeliveryStatus;
}

// Returns what actually happened per recipient, instead of firing blind —
// callers persist this onto the pair/week doc so "was this actually
// delivered" is a real, visible fact afterward, not something only this
// one request ever knew for the few seconds it ran.
export async function notifyBothUsers(pair: Pair, text: string): Promise<NotifyResult[]> {
  const results: NotifyResult[] = [];

  for (const userId of pair.userIds) {
    const userSnap = await adminDb.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      results.push({ userId, status: "no-recipient" });
      continue;
    }
    const user = userSnap.data() as User;
    const prefs = user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;

    if (prefs.pushEnabled && user.pushToken) {
      try {
        await adminMessaging.send({
          token: user.pushToken,
          notification: { title: "Ittsui", body: text },
        });
        results.push({ userId, status: "push" });
        continue;
      } catch {
        // fall through to email
      }
    }

    if (prefs.emailEnabled && user.email) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Ittsui <hello@ittsui.fr>",
            to: user.email,
            subject: "Votre rendez-vous de la semaine",
            text,
          }),
        });
        results.push({ userId, status: res.ok ? "email" : "failed" });
      } catch {
        results.push({ userId, status: "failed" });
      }
    } else {
      results.push({ userId, status: "failed" });
    }
  }

  return results;
}

export function dayLabel(day: Pair["agreedDay"]): string {
  const labels: Record<Pair["agreedDay"], string> = {
    mon: "lundi",
    tue: "mardi",
    wed: "mercredi",
    thu: "jeudi",
    fri: "vendredi",
    sat: "samedi",
    sun: "dimanche",
  };
  return labels[day];
}
