// /app/api/invite-partner/route.ts
// Called from setup when the inviter submits partner name + email.
// Creates a "pending" pair (not yet active), emails an invite to the
// partner and a confirmation to the inviter. The pair activates later,
// in /api/activate-pending-pair, once the partner logs in with Google.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const PENDING_EXPIRY_DAYS = 14;

// ittsui.fr verified in Resend as of 2026-08-10 (confirmed via a real
// call to Resend's /domains API before removing the old TODO here, not
// assumed) — real invites do deliver to real partners.
const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

// notifyDaysBefore/postalCode stay optional and postalCode stays
// loosely-typed here — the existing regex check right before use below
// silently drops an invalid postal code rather than rejecting the whole
// request, and that lenient behavior is intentional, not something this
// validation pass should change.
const bodySchema = z.object({
  inviterUid: z.string().min(1),
  inviterName: z.string().trim().min(1).max(200),
  partnerName: z.string().trim().min(1).max(200),
  partnerEmail: z.string().trim().email().max(320),
  agreedDay: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  agreedWindowStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  agreedWindowEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  // Capped at 6: isDueToday() in weekly-propose/route.ts resolves this via
  // (meetingIndex - leadDays + 7) % 7, which silently produces a negative
  // array index — and therefore permanently breaks that pair's weekly
  // proposal forever, with no error anywhere — once leadDays reaches 14
  // (verified directly, not assumed). The UI only ever offers 0 or 1, but
  // this is the actual trust boundary, and semantically nothing past "a
  // week ahead of a weekly event" makes sense anyway.
  notifyDaysBefore: z.number().int().min(0).max(6).optional(),
  postalCode: z.string().optional(),
  preferences: z.object({
    venueTypes: z.array(z.enum(["cafe", "restaurant", "home", "park", "museum"])),
    dietaryFilters: z.array(z.string()), // open list — user can add custom tags, see lib/types.ts
  }),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }
  const {
    inviterUid,
    inviterName,
    partnerName,
    agreedDay,
    agreedWindowStart,
    agreedWindowEnd,
    notifyDaysBefore,
    postalCode,
    preferences,
  } = parsed.data;

  const cleanEmail = parsed.data.partnerEmail.trim().toLowerCase();

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