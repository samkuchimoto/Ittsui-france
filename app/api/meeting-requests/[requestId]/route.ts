// /app/api/meeting-requests/[requestId]/route.ts
// Public, unauthenticated preview of a meeting request — genuinely
// missing until now. Without this, /request/[requestId] had no way to
// show what's actually being proposed (venue, date, time) before someone
// commits to signing in, and no way to know ahead of time whether THIS
// particular request even needs a sign-in to accept (see respond/route.ts:
// only email-addressed requests need identity verification; phone-only
// ones already treat the unguessable link itself as the authorization).
// Never returns recipientEmail/senderEmail — this is public and
// unauthenticated, so email addresses stay out of the response even
// though they exist on the underlying doc.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request: Request, { params }: { params: { requestId: string } }) {
  const { requestId } = params;
  if (!requestId) {
    return NextResponse.json({ error: "identifiant manquant" }, { status: 400 });
  }

  const snap = await adminDb.collection("meetingRequests").doc(requestId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "demande introuvable" }, { status: 404 });
  }

  const data = snap.data()!;

  if (data.status === "pending" && new Date(data.expiresAt) < new Date()) {
    return NextResponse.json({ error: "cette demande a expiré" }, { status: 410 });
  }

  return NextResponse.json({
    status: data.status,
    senderName: data.senderName,
    recipientName: data.recipientName,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    venueType: data.venueType ?? null,
    date: data.date,
    time: data.time,
    // The one field this preview exists to answer: does accepting THIS
    // request need a real signed-in identity check, or is the link alone
    // sufficient? Mirrors respond/route.ts's exact security boundary —
    // never duplicated as separate logic that could drift from it.
    requiresLogin: Boolean(data.recipientEmail),
  });
}
