// /app/api/passkeys/remove/route.ts
// Removes one of the caller's own passkeys — "lost device" handling.
// Ownership is checked server-side against the verified uid, never trusted
// from the request body, so one account can't remove another's credential
// by guessing a credential id.

import { NextResponse } from "next/server";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import type { StoredPasskeyCredential } from "@/lib/passkeys";

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.credentialId) {
    return NextResponse.json({ error: "identifiant manquant" }, { status: 400 });
  }

  const ref = adminDb.collection("passkeyCredentials").doc(body.credentialId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ status: "ok" }); // already gone — not an error
  }
  const stored = snap.data() as StoredPasskeyCredential;
  if (stored.userId !== uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ status: "ok" });
}
