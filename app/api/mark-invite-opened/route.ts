// /app/api/mark-invite-opened/route.ts
// Fired once from /invite/{pairId} on page load, before any decision is
// made — this is the only way "the invite was actually opened" (cockpit
// stage 2, distinct from stage 1 "sent" and whatever the eventual
// accept/decline outcome is) ever becomes a real, visible fact instead of
// an assumption. Deliberately no auth required: at this point the invitee
// hasn't signed in yet (that's the whole point of the public preview
// shell on that page), and "someone loaded this URL" is a low-stakes,
// non-destructive thing to record — same trust level as the page itself
// being publicly viewable.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  pairId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }
  const { pairId } = parsed.data;

  const pairRef = adminDb.collection("pairs").doc(pairId);
  const snap = await pairRef.get();
  if (!snap.exists) {
    // Not an error worth reporting to the client — this is a best-effort
    // ping, and a dead/mistyped link shouldn't surface a confusing failure
    // on top of whatever the page itself already shows for that case.
    return NextResponse.json({ status: "not_found" });
  }

  // Only set once — a refresh or the partner reopening the link later
  // shouldn't overwrite the true first-opened timestamp, and only makes
  // sense while the invite is still actually pending (an already-decided
  // pair doesn't need an "opened" fact recorded after the fact).
  const pair = snap.data()!;
  if (pair.status === "pending" && !pair.inviteOpenedAt) {
    await pairRef.update({ inviteOpenedAt: new Date().toISOString() });
  }

  return NextResponse.json({ status: "ok" });
}
