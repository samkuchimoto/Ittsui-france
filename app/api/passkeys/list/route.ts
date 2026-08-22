// /app/api/passkeys/list/route.ts
// Lets a signed-in user see their own registered passkeys — the "lost
// device" UX depends on being able to see what's registered before
// deciding what to remove. Never exposes the public key or raw credential
// internals, only what a person needs to recognize which device is which.

import { NextResponse } from "next/server";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import type { StoredPasskeyCredential } from "@/lib/passkeys";

export async function GET(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("passkeyCredentials").where("userId", "==", uid).get();
  const passkeys = snap.docs.map((doc) => {
    const data = doc.data() as StoredPasskeyCredential;
    return {
      id: doc.id,
      label: data.label,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt,
      deviceType: data.deviceType,
    };
  });

  return NextResponse.json({ passkeys });
}
