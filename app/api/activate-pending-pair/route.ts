// /app/api/activate-pending-pair/route.ts
// Called from the /invite/{pairId} page right after the partner logs in
// with Google (accept), or immediately on page load if they clicked the
// decline link. Verifies the logged-in email matches the invited email
// before doing anything, the pairId alone isn't authorization.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// TODO: switch to a verified domain address once ittsui.fr (or whichever
// domain you buy) is added and verified in Resend. Keep this in sync with
// the FROM_ADDRESS constant in app/api/invite-partner/route.ts, they are
// not shared, both need updating together.
const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

export async function POST(request: Request) {
  const { pairId, userId, userEmail, decline } = await request.json();

  // Decline only needs the pairId, it's a bearer-style link mailed to one
  // address, and requiring login just to opt out would be exactly the kind
  // of friction a consent withdrawal shouldn't cost someone.
  if (!pairId || (!decline && (!userId || !userEmail))) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }

  const pairRef = adminDb.collection("pairs").doc(pairId);
  const pairSnap = await pairRef.get();

  if (!pairSnap.exists) {
    return NextResponse.json({ error: "invitation introuvable" }, { status: 404 });
  }

  const pair = pairSnap.data()!;

  // A pair already active for this same user isn't an error case — reopening
  // the invite link (refresh, back button, an old email clicked again)
  // should land them back on the dashboard, not throw "invitation déjà
  // traitée". Only the accept path is idempotent this way; a decline attempt
  // still falls through to the generic rejection below.
  if (pair.status === "active" && !decline && userId && pair.userIds?.includes(userId)) {
    return NextResponse.json({ status: "active", pairId });
  }

  if (pair.status !== "pending") {
    return NextResponse.json({ error: "invitation déjà traitée" }, { status: 409 });
  }

  if (new Date(pair.expiresAt) < new Date()) {
    await pairRef.update({ status: "expired" });
    return NextResponse.json({ error: "invitation expirée" }, { status: 410 });
  }

  const inviterUid = pair.userIds[0];

  if (decline) {
    await pairRef.update({ status: "declined" });
    const sent = await notifyInviter(inviterUid, `${pair.partnerName ?? "La personne invitée"} a décliné l'invitation.`);
    if (!sent) console.warn(`activate-pending-pair: decline notification failed for inviter ${inviterUid}`);
    return NextResponse.json({ status: "declined" });
  }

  if (pair.invitedEmail !== String(userEmail).trim().toLowerCase()) {
    return NextResponse.json({ error: "cette invitation ne correspond pas à votre compte" }, { status: 403 });
  }

  await pairRef.update({
    userIds: [inviterUid, userId],
    status: "active",
  });

  const sent = await notifyInviter(inviterUid, `${pair.partnerName ?? "Votre invité(e)"} a rejoint Ittsui. Le lien est actif.`);
  if (!sent) console.warn(`activate-pending-pair: activation notification failed for inviter ${inviterUid}`);

  return NextResponse.json({ status: "active", pairId });
}

async function notifyInviter(inviterUid: string, text: string): Promise<boolean> {
  const inviterSnap = await adminDb.collection("users").doc(inviterUid).get();
  const email = inviterSnap.data()?.email;
  if (!email) {
    console.warn(`activate-pending-pair: no email on file for inviter ${inviterUid}, skipped notification`);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: email, subject: "Mise à jour de votre invitation", text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`notifyInviter failed (${res.status}) to ${email}: ${body}`);
    return false;
  }

  return true;
}