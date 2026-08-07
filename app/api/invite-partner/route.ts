// /app/api/invite-partner/route.ts
// Called from setup when the inviter submits partner name + email.
// Creates a "pending" pair (not yet active), emails an invite to the
// partner and a confirmation to the inviter. The pair activates later,
// in /api/activate-pending-pair, once the partner logs in with Google.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const PENDING_EXPIRY_DAYS = 14;

export async function POST(request: Request) {
  const { inviterUid, inviterName, partnerName, partnerEmail, agreedDay, agreedWindowStart, agreedWindowEnd, preferences } =
    await request.json();

  if (!inviterUid || !partnerName || !partnerEmail) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }

  const cleanEmail = String(partnerEmail).trim().toLowerCase();

  // Don't allow inviting yourself
  const inviterSnap = await adminDb.collection("users").doc(inviterUid).get();
  const inviterEmail = inviterSnap.data()?.email;
  if (inviterEmail === cleanEmail) {
    return NextResponse.json({ error: "vous ne pouvez pas vous inviter vous-même" }, { status: 400 });
  }

  // If a pending or active pair already targets this email, don't duplicate
  const existing = await adminDb
    .collection("pairs")
    .where("invitedEmail", "==", cleanEmail)
    .where("userIds", "array-contains", inviterUid)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json({ error: "invitation déjà envoyée à cette personne" }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PENDING_EXPIRY_DAYS);

  const pairRef = adminDb.collection("pairs").doc();
  await pairRef.set({
    userIds: [inviterUid], // partner's uid added on activation
    invitedEmail: cleanEmail,
    partnerName,
    agreedDay,
    agreedWindowStart,
    agreedWindowEnd,
    preferences,
    status: "pending",
    subscriptionStatus: "trialing",
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${pairRef.id}`;

  await sendEmail({
    to: cleanEmail,
    subject: `${inviterName} vous invite sur Ittsui`,
    text:
      `${inviterName} a proposé de protéger un rendez-vous hebdomadaire avec vous sur Ittsui.\n\n` +
      `Pour l'activer, connectez-vous ici : ${inviteUrl}\n\n` +
      `Si vous ne souhaitez pas être lié, ignorez ce message ou déclinez ici : ${inviteUrl}?decline=1\n` +
      `Cette invitation expire dans ${PENDING_EXPIRY_DAYS} jours.`,
  });

  await sendEmail({
    to: inviterEmail,
    subject: `Invitation envoyée à ${partnerName}`,
    text: `Votre invitation à ${partnerName} (${cleanEmail}) a été envoyée. Vous serez notifié(e) dès que la connexion est active.`,
  });

  return NextResponse.json({ pairId: pairRef.id, status: "pending" });
}

async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: "Ittsui <hello@ittsui.fr>", to, subject, text }),
  });
}
