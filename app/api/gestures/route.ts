// /app/api/gestures/route.ts
// Records a real "envoyer un geste" event and, when there's an email on
// file, notifies the recipient — same phone-first shape as
// meeting-requests/create (real people overwhelmingly know a friend's
// phone number, not their email), and the same honesty boundary as
// lib/gestureLinks.ts: this never claims the gesture was purchased or
// delivered, only that the sender was pointed at a real external
// service (or, for "own" mode, at nothing — that's on them) to finish
// it themselves.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, escapeHtml } from "@/lib/emailTemplates";
import { CURATED_ITEM_LABEL } from "@/lib/gestureLinks";
import type { CuratedGestureItem } from "@/lib/types";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";
const CURATED_ITEM_VALUES = ["fleurs", "livre", "chocolat", "plante", "bougie", "papeterie", "repas"] as const;

const bodySchema = z
  .object({
    senderName: z.string().trim().min(1).max(200),
    senderEmail: z.string().trim().toLowerCase().email().max(320).optional(),
    recipientName: z.string().trim().min(1).max(200),
    recipientEmail: z.string().trim().toLowerCase().email().max(320).optional(),
    recipientPhone: z
      .string()
      .trim()
      .min(6)
      .max(30)
      .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
      .optional(),
    mode: z.enum(["own", "curated", "suggested", "message"]),
    itemDescription: z.string().trim().min(1).max(200).optional(),
    item: z.enum(CURATED_ITEM_VALUES).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.recipientEmail || data.recipientPhone, { message: "e-mail ou téléphone requis" })
  .refine((data) => data.mode !== "own" || !!data.itemDescription, { message: "description de l'objet requise" })
  .refine((data) => data.mode !== "message" || !!data.notes, { message: "un mot est requis pour ce type de geste" })
  .refine((data) => !["curated", "suggested"].includes(data.mode) || !!data.item, { message: "type de geste requis" });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const { senderName, senderEmail, recipientName, recipientEmail, recipientPhone, mode, itemDescription, item, notes } = parsed.data;

  const ref = adminDb.collection("gestures").doc();
  await ref.set({
    senderName,
    ...(senderEmail ? { senderEmail } : {}),
    recipientName,
    ...(recipientEmail ? { recipientEmail } : {}),
    ...(recipientPhone ? { recipientPhone } : {}),
    mode,
    ...(itemDescription ? { itemDescription } : {}),
    ...(item ? { item } : {}),
    ...(notes ? { note: notes } : {}),
    status: "sent",
    createdAt: new Date().toISOString(),
  });

  const gestureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/g/${ref.id}`;
  const whatLine = mode === "own" ? itemDescription! : mode === "message" ? "un petit mot" : CURATED_ITEM_LABEL[item as CuratedGestureItem];

  const recipientEmailSent = recipientEmail
    ? await sendEmail({
        to: recipientEmail,
        subject: `${senderName} a pensé à vous`,
        text: `${senderName} vous envoie : ${whatLine}.${notes ? ` "${notes}"` : ""}\n\n${gestureUrl}`,
        html: emailShell({
          mascotName: "mochi",
          title: `${escapeHtml(senderName)} a pensé à vous`,
          bodyHtml: `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;">${escapeHtml(whatLine)}${notes ? `<br><em>"${escapeHtml(notes)}"</em>` : ""}</p>`,
        }),
      })
    : undefined;

  // No SMS provider exists in this app (same reasoning meeting-requests/
  // create already documents) — a phone-only gesture hands the sender
  // the link back so they can share it themselves via WhatsApp/SMS.
  return NextResponse.json({ status: "sent", id: ref.id, gestureUrl, recipientEmailSent: recipientEmailSent ?? null });
}

async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error(`gestures: sendEmail failed (${res.status}) to ${to}`);
    return false;
  }
  return true;
}
