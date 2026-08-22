// /app/api/passkeys/register-options/route.ts
// Step 1 of adding a passkey to an ALREADY signed-in account (via Google —
// this never replaces that flow, it's an additional credential someone
// opts into from their own account settings). Requires a real Firebase ID
// token, same as app/api/user/delete/route.ts.

import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { RP_NAME, RP_ID, storeChallenge } from "@/lib/passkeys";

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Don't let someone register the same physical authenticator twice —
  // excludeCredentials tells the browser to refuse if the authenticator
  // that would be used already has a credential on this account.
  const existingSnap = await adminDb.collection("passkeyCredentials").where("userId", "==", uid).get();
  const excludeCredentials = existingSnap.docs.map((doc) => ({
    id: doc.id,
    transports: (doc.data().transports ?? []) as any,
  }));

  const userDoc = await adminDb.collection("users").doc(uid).get();
  const displayName = (userDoc.data()?.displayName as string | undefined) ?? "Utilisateur Ittsui";

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: displayName,
    userDisplayName: displayName,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await storeChallenge(uid, options.challenge);

  return NextResponse.json(options);
}
