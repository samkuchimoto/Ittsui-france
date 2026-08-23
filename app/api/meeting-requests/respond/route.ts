// /app/api/meeting-requests/respond/route.ts
// Called from /request/{requestId} once the recipient decides. Mirrors
// activate-pending-pair/route.ts's exact reasoning: accept requires being
// signed in with the exact invited email (the requestId alone isn't
// authorization), decline doesn't (an opt-out shouldn't cost someone an
// account). On accept, both parties get an email — the one explicit
// requirement for this flow.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { googleCalendarLink } from "@/lib/googleCalendarLink";

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
    return NextResponse.json({
      status: "accepted",
      requestId,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      venueType: data.venueType ?? null,
      date: data.date,
      time: data.time,
    });
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
  // of what they just confirmed. Both also get the Google Calendar link
  // now that it's an actual confirmed commitment, not just a proposal.
  const calendarUrl = googleCalendarLink({
    title: `${data.venueName} — Ittsui`,
    details: `Rendez-vous confirmé via Ittsui.`,
    venueAddress: data.venueAddress,
    date: data.date,
    time: data.time,
  });
  const confirmationText =
    `Rendez-vous confirmé : ${data.venueName} (${data.venueAddress}), le ${data.date} à ${data.time}.\n` +
    `Ajouter à Google Agenda : ${calendarUrl}`;
  const confirmationHtml =
    `<p><strong>Rendez-vous confirmé :</strong> ${escapeHtml(data.venueName)} (${escapeHtml(data.venueAddress)}), le ${escapeHtml(data.date)} à ${escapeHtml(data.time)}.</p>` +
    `<p><a href="${calendarUrl}">Ajouter à Google Agenda</a></p>`;
  const [senderSent, recipientSent] = await Promise.all([
    data.senderEmail
      ? sendEmail({
          to: data.senderEmail,
          subject: "Votre demande de rendez-vous a été acceptée",
          text: `${data.recipientName} a accepté. ${confirmationText}`,
          html: `<p>${escapeHtml(data.recipientName ?? "")} a accepté.</p>${confirmationHtml}`,
        })
      : Promise.resolve(false),
    sendEmail({
      to: data.recipientEmail,
      subject: "Rendez-vous confirmé sur Ittsui",
      text: confirmationText,
      html: confirmationHtml,
    }),
  ]);
  if (!senderSent || !recipientSent) {
    console.warn(`meeting-requests/respond: accept notification incomplete for request ${requestId}`);
  }

  // Returned so the confirmation screen can show the venue and build its
  // own "add to calendar" link without a separate, unauthenticated GET
  // endpoint for request details that doesn't otherwise need to exist.
  return NextResponse.json({
    status: "accepted",
    requestId,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    venueType: data.venueType ?? null,
    date: data.date,
    time: data.time,
  });
}

// Only ever interpolates this app's own data (names, addresses) into
// hand-built HTML strings above — the values themselves are user-supplied
// text (a venue name, a contact's name), so this is the real XSS boundary.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, ...(html ? { html } : {}) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`sendEmail failed (${res.status}) to ${to}: ${body}`);
    return false;
  }

  return true;
}
