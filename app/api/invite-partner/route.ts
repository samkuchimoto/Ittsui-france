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
    postalCode,
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

  // No more blocking on a duplicate: an inviter can send a new invite
  // whenever they want, and it silently obsoletes whichever pending
  // invite they already had (to this email or any other) — "newest wins"
  // instead of a dead-end "invitation déjà envoyée" error with no way
  // forward. Scoped to "pending" only: an already-active pair means a
  // real relationship exists, which sending a new invite shouldn't be
  // able to quietly disrupt (setup already routes an inviter with an
  // active pair to /dashboard before they can reach this form at all).
  const existingSnap = await adminDb.collection("pairs").where("userIds", "array-contains", inviterUid).get();
  const obsoletePairs = existingSnap.docs.filter((doc) => doc.data().status === "pending");
  await Promise.all(obsoletePairs.map((doc) => doc.ref.update({ status: "cancelled" })));

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
    ...(typeof postalCode === "string" && /^\d{5}$/.test(postalCode) ? { postalCode } : {}),
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

  // Persisted, not just returned in this one response — /setup/pending
  // needs to be able to show "was this actually delivered" on every later
  // visit to that screen, not only in the few seconds right after sending.
  await pairRef.update({ partnerEmailSent, inviteSentAt: new Date().toISOString() });

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