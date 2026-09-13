// /app/api/gestures/[gestureId]/route.ts
// GET: public read for the recipient-facing /geste/[gestureId] page —
// same bearer-link trust model as every other shared link in this app
// (an unguessable Firestore doc ID IS the authorization, no login).
// Only public-safe fields are returned: never recipientEmail/
// recipientPhone/senderEmail, which were given in confidence, not for
// display back to whoever opens the link.
//
// PATCH: the recipient's own reply on how to actually receive a physical
// gesture ("own"/"curated"/"suggested" modes only — "message"/"painting"
// have nothing to deliver). Relayed back to the sender by email when
// they left one, so the loop actually closes instead of the sender
// wondering whether the link even got opened.
//
// This used to also dispatch a real Stuart bike courier across Paris.
// That is gone (2026-09-13, deliberate scope deletion): a two-person
// software team cannot also be an on-demand logistics operator, and the
// unanswerable questions were operational, not technical — who pays the
// 8-18 EUR per ride, who is liable for a lost or broken parcel, who
// handles a sender who isn't home. What remains does the same job with
// zero operations: the recipient says where to send it, or that they'd
// rather have it in person, and the sender is told. The sender posts it
// themselves, exactly as they would have anyway.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, escapeHtml } from "@/lib/emailTemplates";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

export async function GET(_request: Request, { params }: { params: { gestureId: string } }) {
  const snap = await adminDb.collection("gestures").doc(params.gestureId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const data = snap.data()!;
  return NextResponse.json({
    senderName: data.senderName,
    recipientName: data.recipientName,
    mode: data.mode,
    itemDescription: data.itemDescription ?? null,
    item: data.item ?? null,
    customItem: data.customItem ?? null,
    note: data.note ?? null,
    gifUrl: data.gifUrl ?? null,
    createdAt: data.createdAt,
    recipientChoice: data.recipientChoice ?? null,
    paintingImageUrl: data.paintingImageUrl ?? null,
    paintingStatus: data.paintingStatus ?? null,
  });
}

const patchSchema = z
  .object({
    choice: z.enum(["address", "in_person"]),
    address: z.string().trim().min(1).max(300).optional(),
    // No phone field any more. It existed only so a courier could ring
    // the recipient on arrival; with no courier there is nobody to ring,
    // and asking someone for their number to accomplish nothing is
    // exactly the kind of field this flow is being stripped of. Any
    // phone still sent by an older client is simply ignored rather than
    // rejected — zod strips unknown keys by default.
  })
  .refine((data) => data.choice !== "address" || !!data.address, { message: "adresse requise" });

export async function PATCH(request: Request, { params }: { params: { gestureId: string } }) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const ref = adminDb.collection("gestures").doc(params.gestureId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const data = snap.data()!;
  const { choice, address } = parsed.data;

  await ref.update({
    recipientChoice: choice,
    ...(address ? { recipientAddress: address } : {}),
    recipientRespondedAt: new Date().toISOString(),
  });

  if (data.senderEmail) {
    const choiceLine =
      choice === "address"
        ? `${escapeHtml(data.recipientName)} a laissé une adresse : ${escapeHtml(address ?? "")}`
        : `${escapeHtml(data.recipientName)} préfère recevoir ça en main propre, la prochaine fois que vous vous voyez.`;
    await sendEmail({
      to: data.senderEmail,
      subject: `${data.recipientName} a répondu`,
      text: choiceLine.replace(/<[^>]+>/g, ""),
      html: emailShell({
        mascotName: "mochi",
        title: `${escapeHtml(data.recipientName)} a répondu`,
        bodyHtml: `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;">${choiceLine}</p>`,
      }),
    });
  }

  return NextResponse.json({ status: "ok" });
}

async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error(`gestures/[gestureId] PATCH: sendEmail failed (${res.status}) to ${to}`);
    return false;
  }
  return true;
}
