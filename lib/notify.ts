// Shared notification helper: FCM push, falling back to Resend email.
// Extracted from weekly-propose/route.ts so rsvp/route.ts (confirmation
// notifications) can reuse the exact same delivery logic instead of a
// second copy that would drift from it.

import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import type { Pair, User } from "@/lib/types";

export async function notifyBothUsers(pair: Pair, text: string) {
  for (const userId of pair.userIds) {
    const userSnap = await adminDb.collection("users").doc(userId).get();
    if (!userSnap.exists) continue;
    const user = userSnap.data() as User;

    if (user.notificationPrefs.pushEnabled && user.pushToken) {
      try {
        await adminMessaging.send({
          token: user.pushToken,
          notification: { title: "Ittsui", body: text },
        });
        continue;
      } catch {
        // fall through to email
      }
    }

    if (user.notificationPrefs.emailEnabled) {
      await fetch("https://api.resend.com/emails", {
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
    }
  }
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
