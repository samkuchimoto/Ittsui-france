// /app/api/register-push-token/route.ts
// Saves the device push token Capacitor hands back after native
// registration (see lib/nativePush.ts) onto users/{uid}.pushToken — the
// field lib/notify.ts already reads from, unchanged. This route is the
// missing other half: pushToken existed in the schema and was read on
// send, but nothing ever wrote it before native registration existed.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  const { userId, pushToken } = await request.json();

  if (!userId || typeof pushToken !== "string" || !pushToken) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await adminDb.collection("users").doc(userId).set({ pushToken }, { merge: true });

  return NextResponse.json({ status: "ok" });
}
