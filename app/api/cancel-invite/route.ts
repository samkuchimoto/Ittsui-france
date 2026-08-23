// /app/api/cancel-invite/route.ts
// Called from /setup/pending when the inviter cancels a pending invite.
// Inviter-only: verifies the requesting uid is userIds[0] (the inviter)
// before cancelling, so a partner or stranger can't cancel someone else's
// pair via a guessed pairId. Only pending pairs can be cancelled.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  pairId: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }
  const { pairId, userId } = parsed.data;

  const pairRef = adminDb.collection("pairs").doc(pairId);
  const pairSnap = await pairRef.get();

  if (!pairSnap.exists) {
    return NextResponse.json({ error: "invitation introuvable" }, { status: 404 });
  }

  const pair = pairSnap.data()!;

  if (pair.userIds?.[0] !== userId) {
    return NextResponse.json({ error: "non autorisé" }, { status: 403 });
  }

  if (pair.status !== "pending") {
    return NextResponse.json({ error: "invitation déjà traitée" }, { status: 409 });
  }

  await pairRef.update({ status: "cancelled" });

  return NextResponse.json({ status: "cancelled" });
}