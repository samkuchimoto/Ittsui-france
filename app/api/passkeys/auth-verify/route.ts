// /app/api/passkeys/auth-verify/route.ts
// Step 2 of signing in with a passkey. Looks up which user owns the
// credential the authenticator returned (that's what makes this
// passwordless — no email/username step), verifies the assertion against
// the stored public key and counter, then bridges into a real Firebase
// session by minting a custom token — the client calls
// signInWithCustomToken() with it, same onAuthStateChanged/watchAuthState
// listeners as Google Sign-In pick it up unchanged from there.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { RP_ID, EXPECTED_ORIGINS, consumeChallenge } from "@/lib/passkeys";
import type { StoredPasskeyCredential } from "@/lib/passkeys";

// Shallow on purpose — see register-verify/route.ts's identical reasoning:
// verifyAuthenticationResponse below already does the real (structural +
// cryptographic) validation of the browser's WebAuthn response shape.
const bodySchema = z.object({
  response: z.object({ id: z.string(), rawId: z.string(), type: z.string() }).passthrough(),
  challengeKey: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  }
  const body = parsed.data;

  const expectedChallenge = await consumeChallenge(body.challengeKey);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "session expirée, réessayez" }, { status: 400 });
  }

  // The authenticator returns which credential it used — that's the only
  // way to know who's signing in, since this flow starts with no user
  // context at all (see auth-options/route.ts).
  const credentialId: string | undefined = body.response.id;
  if (!credentialId) {
    return NextResponse.json({ error: "identifiant de clé manquant" }, { status: 400 });
  }

  const credRef = adminDb.collection("passkeyCredentials").doc(credentialId);
  const credSnap = await credRef.get();
  if (!credSnap.exists) {
    return NextResponse.json({ error: "clé d'accès inconnue" }, { status: 400 });
  }
  const stored = credSnap.data() as StoredPasskeyCredential;

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      // Zod only checked the shallow shape (id/rawId/type) above — the
      // full WebAuthn AuthenticationResponseJSON type is asserted here
      // because verifyAuthenticationResponse itself is the real
      // structural and cryptographic validator; it throws below on
      // anything invalid.
      response: body.response as unknown as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
      credential: {
        id: credentialId,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64")),
        counter: stored.counter,
        transports: stored.transports as any,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "vérification échouée" },
      { status: 400 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "vérification échouée" }, { status: 400 });
  }

  // Cloning detection: the signature counter must strictly increase on
  // every real use. A counter that doesn't advance suggests the
  // credential's private key material was copied to a second device
  // outside the normal (legitimate) sync mechanisms — not proof of
  // attack on its own for multi-device passkeys, but worth recording
  // rather than silently ignoring.
  await credRef.update({
    counter: verification.authenticationInfo.newCounter,
    lastUsedAt: new Date().toISOString(),
  });

  const customToken = await adminAuth.createCustomToken(stored.userId);

  return NextResponse.json({ status: "ok", customToken });
}
