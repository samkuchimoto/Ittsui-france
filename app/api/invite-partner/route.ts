// /app/api/invite-partner/route.ts
// Called from setup when the inviter submits partner name + email.
// Creates a "pending" pair (not yet active), emails an invite to the
// partner and a confirmation to the inviter. The pair activates later,
// in /api/activate-pending-pair, once the partner logs in with Google.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const PENDING_EXPIRY_DAYS = 14;

// TODO: switch to a verified domain address once ittsui.fr (or whichever
// domain you buy) is added and verified in Resend. Until then this only
// delivers to the email address on your own Resend account, not to real
// partners, so real invites will not arrive.
const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

export async function POST(request: Request) {
  const {
    inviterUid,
    inviterName,
    partnerName,
    partnerEmail,
    agreedDay,
    agreedWindowStart,
    agreedWindowEnd,
    notifyDaysBefore,
    preferences,
  } = await request.json();

  if (!inviterUid || !partnerName || !partnerEmail) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }

  const cleanEmail = String(partnerEmail).trim().toLowerCase();

  const inviterSnap = await adminDb.collection("users").doc(inviterUid).get();
  const inviterEmail = inviterSnap.data()?.email;

  if (inviterEmail === cleanEmail) {
    return NextResponse.json({ error: "vous ne pouvez pas vous inviter vous-même" }, { status: 400 });
  }

  // Fetch all prior pairs between this inviter and this email, then filter
  // in code for a "live" one (pending or active). Declined/expired/cancelled
  // pairs no longer block a fresh invite. Deliberately no .where("status", ...)
  // clause here — adding one would require a new Firestore composite index.
  const existingSnap = await adminDb
    .collection("pairs")
    .where("invitedEmail", "==", cleanEmail)
    .where("userIds", "array-contains", inviterUid)
    .get();
  const liveMatch = existingSnap.docs.find((doc) => {
    const status = doc.data().status;
    return status === "pending" || status === "active";
  });
  if (liveMatch) {
    // Not a dead end: give the frontend enough to point the user at the
    // existing invite (cancel it, or just wait) instead of only a red
    // error string with no way forward.
    return NextResponse.json(
      {
        error: "invitation déjà envoyée à cette personne",
        code: "DUPLICATE_INVITE",
        pairId: liveMatch.id,
        status: liveMatch.data().status,
      },
      { status: 409 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PENDING_EXPIRY_DAYS);

  const pairRef = adminDb.collection("pairs").doc();
  await pairRef.set({
    userIds: [inviterUid],
    invitedEmail: cleanEmail,
    partnerName,
    agreedDay,
    agreedWindowStart,
    agreedWindowEnd,
    notifyDaysBefore: typeof notifyDaysBefore === "number" ? notifyDaysBefore : 0,
    preferences,
    status: "pending",
    subscriptionStatus: "trialing",
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${pairRef.id}`;

  const partnerEmailSent = await sendEmail({
    to: cleanEmail,
    subject: `${inviterName} vous invite sur Ittsui`,
    text:
      `${inviterName} a proposé de protéger un rendez-vous hebdomadaire avec vous sur Ittsui.\n\n` +
      `Pour l'activer, connectez-vous ici : ${inviteUrl}\n\n` +
      `Si vous ne souhaitez pas être lié, ignorez ce message ou déclinez ici : ${inviteUrl}?decline=1\n` +
      `Cette invitation expire dans ${PENDING_EXPIRY_DAYS} jours.`,
  });

  // Only attempt the confirmation email if we actually have an address for
  // the inviter. Sending with no "to" is what caused the earlier 422s.
  let confirmationSent = false;
  if (inviterEmail) {
    confirmationSent = await sendEmail({
      to: inviterEmail,
      subject: `Invitation envoyée à ${partnerName}`,
      text: `Votre invitation à ${partnerName} (${cleanEmail}) a été envoyée. Vous serez notifié(e) dès que la connexion est active.`,
    });
  } else {
    console.warn(`invite-partner: no email on file for inviter ${inviterUid}, skipped confirmation`);
  }

  return NextResponse.json({
    pairId: pairRef.id,
    status: "pending",
    partnerEmailSent,
    confirmationSent,
  });
}

async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!to) {
    console.warn("sendEmail: skipped, no recipient");
    return false;
  }

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