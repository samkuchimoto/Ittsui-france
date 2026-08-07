// /app/api/activate-pending-pair/route.ts
// Called from the /invite/{pairId} page right after the partner logs in
// with Google (accept), or immediately on page load if they clicked the
// decline link. Verifies the logged-in email matches the invited email
// before doing anything — the pairId alone isn't authorization.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  const { pairId, userId, userEmail, decline } = await request.json();

  // Decline only needs the pairId — it's a bearer-style link mailed to one
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
    await notifyInviter(inviterUid, `${pair.partnerName ?? "La personne invitée"} a décliné l'invitation.`);
    return NextResponse.json({ status: "declined" });
  }

  if (pair.invitedEmail !== String(userEmail).trim().toLowerCase()) {
    return NextResponse.json({ error: "cette invitation ne correspond pas à votre compte" }, { status: 403 });
  }

  await pairRef.update({
    userIds: [inviterUid, userId],
    status: "active",
  });

  await notifyInviter(inviterUid, `${pair.partnerName ?? "Votre invité(e)"} a rejoint Ittsui. Le lien est actif.`);

  return NextResponse.json({ status: "active", pairId });
}

async function notifyInviter(inviterUid: string, text: string) {
  const inviterSnap = await adminDb.collection("users").doc(inviterUid).get();
  const email = inviterSnap.data()?.email;
  if (!email) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: "Ittsui <hello@ittsui.fr>", to: email, subject: "Mise à jour de votre invitation", text }),
  });
}
