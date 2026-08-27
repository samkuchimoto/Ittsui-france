// /app/api/gestures/[gestureId]/route.ts
// GET: public read for the recipient-facing /geste/[gestureId] page —
// same bearer-link trust model as every other shared link in this app
// (an unguessable Firestore doc ID IS the authorization, no login).
// Only public-safe fields are returned: never recipientEmail/
// recipientPhone/senderEmail/pickupAddress/pickupPhone, which were
// given in confidence, not for display back to whoever opens the link.
//
// PATCH: the recipient's own reply on how to actually receive a physical
// gesture ("own"/"curated"/"suggested" modes only — "message"/"painting"
// have nothing to deliver). Relayed back to the sender by email when
// they left one, so the loop actually closes instead of the sender
// wondering whether the link even got opened.
//
// For "own" mode specifically, supplying an address here is also the
// trigger for a REAL Stuart courier dispatch (lib/stuartCourier.ts) —
// this is the first point Ittsui has both the sender's pickup address
// (collected at creation) and the recipient's own dropoff address.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, escapeHtml } from "@/lib/emailTemplates";
import { dispatchStuartCourier } from "@/lib/stuartCourier";

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
    courierStatus: data.courierStatus ?? null,
    courierTrackingUrl: data.courierTrackingUrl ?? null,
  });
}

const patchSchema = z
  .object({
    choice: z.enum(["address", "in_person"]),
    address: z.string().trim().min(1).max(300).optional(),
    // Recipient's own contact number — only actually needed for a real
    // Stuart dispatch ("own" mode); optional here so the address/
    // in-person reply still works even when courier dispatch isn't
    // possible (no pickupAddress on file, or Stuart not configured).
    phone: z
      .string()
      .trim()
      .min(6)
      .max(30)
      .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
      .optional(),
  })
  .refine((data) => data.choice !== "address" || !!data.address, { message: "adresse requise" });

// Stuart's contact object wants firstname/lastname separately; this app
// only ever stores one free-text name field. A plain word-split is an
// honest reformat of data already given, not an invention of data that
// isn't there — "lastname" ends up empty for a one-word name, which
// Stuart's own docs allow.
function splitName(fullName: string): { firstname: string; lastname: string } {
  const [firstname, ...rest] = fullName.trim().split(/\s+/);
  return { firstname: firstname || fullName, lastname: rest.join(" ") };
}

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
  const { choice, address, phone } = parsed.data;

  let courierJobId: string | undefined;
  let courierTrackingUrl: string | undefined;
  let courierStatus: "dispatched" | "failed" | undefined;

  if (choice === "address" && data.mode === "own" && data.pickupAddress && data.pickupPhone && address && phone) {
    const result = await dispatchStuartCourier({
      clientReference: params.gestureId,
      packageDescription: data.itemDescription ?? "Geste Ittsui",
      pickupAddress: data.pickupAddress,
      pickupContact: { ...splitName(data.senderName), phone: data.pickupPhone },
      dropoffAddress: address,
      dropoffContact: { ...splitName(data.recipientName), phone },
    });
    if (result.status !== "not_configured") {
      courierStatus = result.status;
      if (result.status === "dispatched") {
        courierJobId = result.jobId;
        courierTrackingUrl = result.trackingUrl;
      }
    }
  }

  await ref.update({
    recipientChoice: choice,
    ...(address ? { recipientAddress: address } : {}),
    ...(phone ? { recipientContactPhone: phone } : {}),
    ...(courierJobId ? { courierJobId } : {}),
    ...(courierTrackingUrl ? { courierTrackingUrl } : {}),
    ...(courierStatus ? { courierStatus } : {}),
    recipientRespondedAt: new Date().toISOString(),
  });

  if (data.senderEmail) {
    const choiceLine =
      choice === "address"
        ? `${escapeHtml(data.recipientName)} a laissé une adresse : ${escapeHtml(address ?? "")}`
        : `${escapeHtml(data.recipientName)} préfère recevoir ça en main propre, la prochaine fois que vous vous voyez.`;
    const courierLine =
      courierStatus === "dispatched"
        ? `<p style="font-size:13px;color:#1E7A4C;text-align:center;font-weight:600;">Un livreur Stuart a été programmé pour récupérer l'objet chez vous.${courierTrackingUrl ? ` <a href="${courierTrackingUrl}">Suivre la course</a>` : ""}</p>`
        : "";
    await sendEmail({
      to: data.senderEmail,
      subject: `${data.recipientName} a répondu`,
      text: choiceLine.replace(/<[^>]+>/g, "") + (courierStatus === "dispatched" ? " Un livreur Stuart a été programmé." : ""),
      html: emailShell({
        mascotName: "mochi",
        title: `${escapeHtml(data.recipientName)} a répondu`,
        bodyHtml: `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;">${choiceLine}</p>${courierLine}`,
      }),
    });
  }

  return NextResponse.json({ status: "ok", ...(courierStatus ? { courierStatus, courierTrackingUrl: courierTrackingUrl ?? null } : {}) });
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
