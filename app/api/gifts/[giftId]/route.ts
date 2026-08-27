// /app/api/gifts/[giftId]/route.ts
// Public read for the recipient-facing /cadeau/[giftId] page — same
// bearer-link trust model as every other shared link in this app (an
// unguessable Firestore doc ID IS the authorization, no login). Only
// public-safe fields are returned: never recipientEmail/recipientPhone,
// which the sender gave in confidence, not for display back to whoever
// opens the link.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(_request: Request, { params }: { params: { giftId: string } }) {
  const snap = await adminDb.collection("giftGestures").doc(params.giftId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const data = snap.data()!;
  return NextResponse.json({
    senderName: data.senderName,
    recipientName: data.recipientName,
    category: data.category,
    note: data.note ?? null,
    createdAt: data.createdAt,
  });
}
