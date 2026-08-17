// /app/api/user/delete/route.ts
// GDPR Article 17 (droit à l'effacement) — deletes the caller's own
// account. Requires a real Firebase ID token, never a client-supplied
// userId — this is irreversible, so trusting an unverified id isn't an
// option here even though several other routes in this app do.
//
// What gets deleted outright vs. what gets cancelled instead, and why:
//   - users/{uid} and the underlying Firebase Auth record: deleted
//     outright. It's entirely this person's data.
//   - pairs where this uid is the ONLY member (a pending invite nobody
//     accepted yet): deleted outright — nobody else has any stake in it.
//   - pairs with a second member (active, or a pending invite this uid
//     was invited into): NOT hard-deleted. Article 17 covers the
//     requester's own personal data — it doesn't give one person the
//     right to erase the other person's relationship history too.
//     Instead: status becomes "cancelled" (stops any future proposals),
//     and the uid stays in userIds as a bare, inert reference — once
//     users/{uid} is gone, that id has no name or email attached to it
//     anywhere, so it stops being personal data in any real sense.
//   - the weeks subcollection under an affected pair: left alone. It
//     holds venue/response data, not directly identifying information,
//     and the remaining person may reasonably want to keep it.
//   - the other person in any pair that gets cancelled is notified,
//     same as every other status change in this app already is.

import { NextResponse } from "next/server";
import { adminDb, adminAuth, verifyRequestUser } from "@/lib/firebaseAdmin";
import { notifyBothUsers } from "@/lib/notify";
import type { Pair } from "@/lib/types";

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pairsSnap = await adminDb.collection("pairs").where("userIds", "array-contains", uid).get();

  const cancelledPairs: Pair[] = [];
  const batch = adminDb.batch();

  for (const doc of pairsSnap.docs) {
    const pair = { id: doc.id, ...doc.data() } as Pair;
    const soleMember = pair.userIds.length === 1;
    if (soleMember) {
      batch.delete(doc.ref);
    } else {
      batch.update(doc.ref, { status: "cancelled" });
      cancelledPairs.push(pair);
    }
  }

  batch.delete(adminDb.collection("users").doc(uid));
  await batch.commit();

  try {
    await adminAuth.deleteUser(uid);
  } catch {
    // Firestore data is already gone either way — don't fail the whole
    // request over the Auth record specifically (e.g. already removed).
  }

  for (const pair of cancelledPairs) {
    try {
      await notifyBothUsers(pair, "Le rituel Ittsui avec cette personne a été annulé.");
    } catch {
      // Best-effort notice, not load-bearing for the deletion itself.
    }
  }

  return NextResponse.json({ status: "deleted" });
}
