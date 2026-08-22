// /app/api/passkeys/auth-options/route.ts
// Step 1 of signing IN with a passkey — deliberately requires no prior
// auth (that's the whole point: this is how you get a session in the
// first place). Discoverable-credential flow: no allowCredentials list, so
// the browser/OS lets the user pick from any passkey registered for this
// site, and the credential ID it returns is how auth-verify figures out
// who's signing in — no email/username entry step.
//
// There's no known user yet, so the challenge can't be keyed by uid the
// way registration is — a random opaque id is generated here and returned
// alongside the WebAuthn options; the client echoes it back on
// auth-verify. It's an index for finding the right stored challenge, not
// itself a secret.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { RP_ID, storeChallenge } from "@/lib/passkeys";

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  });

  const challengeKey = randomUUID();
  await storeChallenge(challengeKey, options.challenge);

  return NextResponse.json({ options, challengeKey });
}
