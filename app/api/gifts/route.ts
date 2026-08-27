// /app/api/gifts/route.ts
// Records a real "envoyer un geste" event and, when there's an email on
// file, notifies the recipient — same phone-first shape as
// meeting-requests/create (real people overwhelmingly know a friend's
// phone number, not their email), and the same honesty boundary as
// lib/giftLinks.ts: this never claims the gift was purchased or
// delivered, only that the sender was pointed at a real external
// service to finish it themselves.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, escapeHtml } from "@/lib/emailTemplates";
import { GIFT_CATEGORY_LABEL } from "@/lib/giftLinks";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

const bodySchema = z
  .object({
    senderName: z.string().trim().min(1).max(200),
    recipientName: z.string().trim().min(1).max(200),
    recipientEmail: z.string().trim().toLowerCase().email().max(320).optional(),
    recipientPhone: z
      .string()
      .trim()
      .min(6)
      .max(30)
      .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
      .optional(),
    category: z.enum(["repas", "objet", "fleurs", "autre"]),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.recipientEmail || data.recipientPhone, { message: "e-mail ou téléphone requis" });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const { senderName, recipientName, recipientEmail, recipientPhone, category, notes } = parsed.data;

  const ref = adminDb.collection("giftGestures").doc();
  await ref.set({
    senderName,
    recipientName,
    ...(recipientEmail ? { recipientEmail } : {}),
    ...(recipientPhone ? { recipientPhone } : {}),
    category,
    ...(notes ? { note: notes } : {}),
    status: "sent",
    createdAt: new Date().toISOString(),
  });

  const giftUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/g/${ref.id}`;

  const recipientEmailSent = recipientEmail
    ? await sendEmail({
        to: recipientEmail,
        subject: `${senderName} a pensé à vous`,
        text: `${senderName} vous envoie : ${GIFT_CATEGORY_LABEL[category]}.${notes ? ` "${notes}"` : ""}\n\n${giftUrl}`,
        html: emailShell({
          mascotName: "mochi",
          title: `${escapeHtml(senderName)} a pensé à vous`,
          bodyHtml: `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;">${escapeHtml(GIFT_CATEGORY_LABEL[category])}${notes ? `<br><em>"${escapeHtml(notes)}"</em>` : ""}</p>`,
        }),
      })
    : undefined;

  // No SMS provider exists in this app (same reasoning meeting-requests/
  // create already documents) — a phone-only gesture hands the sender
  // the link back so they can share it themselves via WhatsApp/SMS.
  return NextResponse.json({ status: "sent", id: ref.id, giftUrl, recipientEmailSent: recipientEmailSent ?? null });
}

async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error(`gifts: sendEmail failed (${res.status}) to ${to}`);
    return false;
  }
  return true;
}
