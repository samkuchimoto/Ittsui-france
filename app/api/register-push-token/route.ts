// /app/api/register-push-token/route.ts
// Saves the device push token Capacitor hands back after native
// registration (see lib/nativePush.ts) onto users/{uid}.pushToken — the
// field lib/notify.ts already reads from, unchanged. This route is the
// missing other half: pushToken existed in the schema and was read on
// send, but nothing ever wrote it before native registration existed.
//
// A push token is enough to send someone a notification, so unlike most
// routes in this app this one doesn't trust a client-supplied userId —
// it requires a real Firebase ID token and writes to that verified uid
// only. Consent itself is gated earlier and separately: nativePush.ts
// only ever calls this after the OS-level permission prompt
// (PushNotifications.requestPermissions()) is actually granted — a token
// can't exist here without that having happened first.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  pushToken: z.string().min(1),
});

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { pushToken } = parsed.data;

  await adminDb.collection("users").doc(uid).set({ pushToken }, { merge: true });

  return NextResponse.json({ status: "ok" });
}
