// Native push registration — only does anything inside the Capacitor
// shell (Capacitor.isNativePlatform() is false in the regular web/PWA
// build, so this is a no-op there, same code either way). Android's
// native push is FCM under the hood, so the token this produces is
// already what lib/notify.ts's adminMessaging.send() expects. iOS
// produces an APNs token instead — registering that against Firebase
// Cloud Messaging needs an APNs auth key uploaded in the Firebase
// console (a real Apple Developer account action, not something to fake
// here), so iOS push delivery isn't live until that's configured there.
//
// Web push (getMessagingIfSupported in lib/firebase.ts) is a separate,
// still-unfinished path — it needs a VAPID key and a service worker file
// that don't exist yet. Not addressed here; noted so it isn't mistaken
// for done.

import { Capacitor } from "@capacitor/core";

export async function registerNativePush(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    const requested = await PushNotifications.requestPermissions();
    if (requested.receive !== "granted") return;
  }

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    try {
      await fetch("/api/register-push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pushToken: token.value }),
      });
    } catch {
      // Best-effort — a failed save here just means push falls back to
      // email next time notifyBothUsers runs, same as any other push miss.
    }
  });
}
