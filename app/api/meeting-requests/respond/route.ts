// /app/api/meeting-requests/respond/route.ts
// Called from /request/{requestId} once the recipient decides. Mirrors
// activate-pending-pair/route.ts's exact reasoning: accept requires being
// signed in with the exact invited email (the requestId alone isn't
// authorization), decline doesn't (an opt-out shouldn't cost someone an
// account). On accept, both parties get an email — the one explicit
// requirement for this flow.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

export async function POST(request: Request) {
  const { requestId, userId, userEmail, decline } = await request.json();

  if (!requestId || (!decline && (!userId || !userEmail))) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }

  const ref = adminDb.collection("meetingRequests").doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "demande introuvable" }, { status: 404 });
  }

  const data = snap.data()!;

  // Reopening the link (refresh, back button) after already accepting
  // should land back on the dashboard, not throw "déjà traitée" — same
  // idempotency activate-pending-pair applies to its own accept path.
  if (data.status === "accepted" && !decline && userId && data.recipientId === userId) {
    return NextResponse.json({ status: "accepted", requestId });
  }

  if (data.status !== "pending") {
    return NextResponse.json({ error: "cette demande a déjà été traitée" }, { status: 409 });
  }

  if (new Date(data.expiresAt) < new Date()) {
    await ref.update({ status: "expired" });
    return NextResponse.json({ error: "cette demande a expiré" }, { status: 410 });
  }

  if (decline) {
    await ref.update({ status: "declined", respondedAt: new Date().toISOString() });
    if (data.senderEmail) {
      const sent = await sendEmail({
        to: data.senderEmail,
        subject: "Votre demande de rendez-vous a été déclinée",
        text: `${data.recipientName ?? "La personne invitée"} a décliné votre demande pour ${data.venueName}, le ${data.date} à ${data.time}.`,
      });
      if (!sent) console.warn(`meeting-requests/respond: decline notification failed for request ${requestId}`);
    }
    return NextResponse.json({ status: "declined" });
  }

  if (data.recipientEmail !== String(userEmail).trim().toLowerCase()) {
    return NextResponse.json({ error: "cette demande ne correspond pas à votre compte" }, { status: 403 });
  }

  await ref.update({
    status: "accepted",
    recipientId: userId,
    respondedAt: new Date().toISOString(),
  });

  // Both parties notified by email, as required — the sender gets
  // confirmation, and the recipient gets a copy back as their own record
  // of what they just confirmed.
  const confirmationText = `Rendez-vous confirmé : ${data.venueName} (${data.venueAddress}), le ${data.date} à ${data.time}.`;
  const [senderSent, recipientSent] = await Promise.all([
    data.senderEmail
      ? sendEmail({
          to: data.senderEmail,
          subject: "Votre demande de rendez-vous a été acceptée",
          text: `${data.recipientName} a accepté. ${confirmationText}`,
        })
      : Promise.resolve(false),
    sendEmail({ to: data.recipientEmail, subject: "Rendez-vous confirmé sur Ittsui", text: confirmationText }),
  ]);
  if (!senderSent || !recipientSent) {
    console.warn(`meeting-requests/respond: accept notification incomplete for request ${requestId}`);
  }

  return NextResponse.json({ status: "accepted", requestId });
}

async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`sendEmail failed (${res.status}) to ${to}: ${body}`);
    return false;
  }

  return true;
}
