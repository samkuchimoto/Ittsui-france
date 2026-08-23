// /app/api/meeting-requests/create/route.ts
// Sends a one-off meeting request (venue, address, date, time) to a
// contact by email — the ad-hoc counterpart to /api/invite-partner's
// permanent weekly Pair bond. The recipient doesn't need an Ittsui account
// yet: they get an email, log in, and accept/decline from
// /request/{requestId}, mirroring /invite/{pairId}'s exact pattern.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";

const REQUEST_EXPIRY_DAYS = 14; // same window as a Pair invite

// ittsui.fr verified in Resend as of 2026-08-10 — keep in sync with the
// same constant in invite-partner/route.ts and activate-pending-pair/route.ts;
// not shared on purpose, each route owns its own copy.
const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

const createSchema = z.object({
  recipientName: z.string().trim().min(1).max(200),
  recipientEmail: z.string().trim().email().max(320),
  venueName: z.string().trim().min(1).max(200),
  venueAddress: z.string().trim().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date invalide"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "heure invalide"),
});

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }

  const { recipientName, venueName, venueAddress, date, time } = parsed.data;
  const recipientEmail = parsed.data.recipientEmail.toLowerCase();

  const senderSnap = await adminDb.collection("users").doc(uid).get();
  const senderName: string = senderSnap.data()?.displayName ?? "Quelqu'un sur Ittsui";
  const senderEmail: string | null = senderSnap.data()?.email ?? null;

  if (senderEmail && senderEmail.toLowerCase() === recipientEmail) {
    return NextResponse.json({ error: "vous ne pouvez pas vous envoyer une demande à vous-même" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REQUEST_EXPIRY_DAYS);

  const ref = adminDb.collection("meetingRequests").doc();
  await ref.set({
    senderId: uid,
    senderName,
    senderEmail,
    recipientName,
    recipientEmail,
    venueName,
    venueAddress,
    date,
    time,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/request/${ref.id}`;
  const recipientEmailSent = await sendEmail({
    to: recipientEmail,
    subject: `${senderName} vous propose un rendez-vous sur Ittsui`,
    text:
      `${senderName} vous propose de vous retrouver :\n\n` +
      `Lieu : ${venueName} (${venueAddress})\n` +
      `Date : ${date} à ${time}\n\n` +
      `Pour accepter ou décliner, connectez-vous ici : ${requestUrl}\n` +
      `Cette demande expire dans ${REQUEST_EXPIRY_DAYS} jours.`,
  });

  // Persisted, not just returned in this one response — same reasoning as
  // invite-partner/route.ts's partnerEmailSent: the sender needs to be able
  // to see real delivery status later, not just at send time.
  await ref.update({ recipientEmailSent });

  return NextResponse.json({ id: ref.id, status: "pending", recipientEmailSent });
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
