// /app/api/passkeys/register-verify/route.ts
// Step 2: verifies the browser's registration response against the
// challenge stored in step 1, then stores the new credential. Server-only
// write path for passkeyCredentials — see firestore.rules.

import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { RP_ID, EXPECTED_ORIGINS, consumeChallenge } from "@/lib/passkeys";
import type { StoredPasskeyCredential } from "@/lib/passkeys";

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.response) {
    return NextResponse.json({ error: "réponse manquante" }, { status: 400 });
  }

  const expectedChallenge = await consumeChallenge(uid);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "session expirée, réessayez" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "vérification échouée" },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "vérification échouée" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const record: StoredPasskeyCredential = {
    userId: uid,
    publicKey: Buffer.from(credential.publicKey).toString("base64"),
    counter: credential.counter,
    transports: credential.transports ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    label: body.label || "Clé d'accès",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  await adminDb.collection("passkeyCredentials").doc(credential.id).set(record);

  return NextResponse.json({ status: "ok", credentialId: credential.id });
}
