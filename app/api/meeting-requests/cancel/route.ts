// /app/api/meeting-requests/cancel/route.ts
// Lets the sender withdraw their own pending request — a real gap found
// live: with no cancel path, an accumulating list of stale "en attente"
// proposals to the same person was the only possible state, directly
// contradicting the product's own "une seule proposition, une seule
// décision, puis le silence" promise. Sender-only: verifies the
// requesting uid matches senderId before cancelling, mirroring
// /api/cancel-invite's identical reasoning for Pair invites.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  requestId: z.string().min(1),
});

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "identifiant manquant" }, { status: 400 });
  }

  const ref = adminDb.collection("meetingRequests").doc(parsed.data.requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "demande introuvable" }, { status: 404 });
  }

  const data = snap.data()!;
  if (data.senderId !== uid) {
    return NextResponse.json({ error: "non autorisé" }, { status: 403 });
  }
  if (data.status !== "pending") {
    return NextResponse.json({ error: "cette demande a déjà été traitée" }, { status: 409 });
  }

  await ref.update({ status: "cancelled", respondedAt: new Date().toISOString() });

  return NextResponse.json({ status: "cancelled" });
}
