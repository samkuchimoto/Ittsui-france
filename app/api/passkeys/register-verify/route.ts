// /app/api/passkeys/register-verify/route.ts
// Step 2: verifies the browser's registration response against the
// challenge stored in step 1, then stores the new credential. Server-only
// write path for passkeyCredentials — see firestore.rules.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { RP_ID, EXPECTED_ORIGINS, consumeChallenge } from "@/lib/passkeys";
import type { StoredPasskeyCredential } from "@/lib/passkeys";

// Shallow on purpose: the browser's WebAuthn RegistrationResponseJSON is a
// deeply nested, spec-defined shape that verifyRegistrationResponse below
// already validates thoroughly (structurally and cryptographically) —
// replicating that in Zod would be redundant and risks rejecting valid
// variations the library itself accepts. This just guards against a
// grossly malformed body before bothering to consume the one-time
// challenge for it.
const bodySchema = z.object({
  response: z.object({ id: z.string(), rawId: z.string(), type: z.string() }).passthrough(),
  label: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "réponse manquante" }, { status: 400 });
  }
  const body = parsed.data;

  const expectedChallenge = await consumeChallenge(uid);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "session expirée, réessayez" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      // Zod only checked the shallow shape (id/rawId/type) above — the
      // full WebAuthn RegistrationResponseJSON type is asserted here
      // because verifyRegistrationResponse itself is the real structural
      // and cryptographic validator; it throws below on anything invalid.
      response: body.response as unknown as Parameters<typeof verifyRegistrationResponse>[0]["response"],
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
