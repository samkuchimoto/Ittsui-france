// /app/api/gestures/route.ts
// Records a real "envoyer un geste" event and, when there's an email on
// file, notifies the recipient — same phone-first shape as
// meeting-requests/create (real people overwhelmingly know a friend's
// phone number, not their email), and the same honesty boundary as
// lib/gestureLinks.ts: this never claims the gesture was purchased or
// delivered, only that the sender was pointed at a real external
// service (or, for "own" mode, at nothing — that's on them) to finish
// it themselves.
//
// "painting" mode is the one exception to "no real backend action" —
// it calls the same Fal.ai image-generation infrastructure already
// wired for app/api/ai-venue-mood/route.ts, synchronously (no queue:
// at this scale, one more `await` inside a single request is simpler
// and more honest than a job system with nothing yet to justify it).
// Same honest-501 posture as that route when FAL_API_KEY isn't
// configured — generation failing never blocks the gesture itself from
// being recorded and the recipient notified; `paintingStatus` just
// reads "failed" instead of "ready", never a fabricated image URL.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, escapeHtml } from "@/lib/emailTemplates";
import { CURATED_ITEM_LABEL } from "@/lib/gestureLinks";
import type { CuratedGestureItem, PaintingStatus } from "@/lib/types";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";
const CURATED_ITEM_VALUES = ["fleurs", "livre", "chocolat", "plante", "bougie", "papeterie", "repas", "autre"] as const;
const PAINTING_GENERATION_TIMEOUT_MS = 20000;

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
    mode: z.enum(["own", "curated", "suggested", "message", "painting"]),
    itemDescription: z.string().trim().min(1).max(200).optional(),
    item: z.enum(CURATED_ITEM_VALUES).optional(),
    customItem: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.recipientEmail || data.recipientPhone, { message: "e-mail ou téléphone requis" })
  .refine((data) => data.mode !== "own" || !!data.itemDescription, { message: "description de l'objet requise" })
  .refine((data) => data.mode !== "message" || !!data.notes, { message: "un mot est requis pour ce type de geste" })
  .refine((data) => !["curated", "suggested"].includes(data.mode) || !!data.item, { message: "type de geste requis" })
  .refine((data) => data.item !== "autre" || !!data.customItem, { message: "précisez de quoi il s'agit" });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const { senderName, senderEmail, recipientName, recipientEmail, recipientPhone, mode, itemDescription, item, customItem, notes } =
    parsed.data;

  let paintingImageUrl: string | undefined;
  let paintingStatus: PaintingStatus | undefined;
  if (mode === "painting") {
    paintingImageUrl = await generatePainting(notes);
    paintingStatus = paintingImageUrl ? "ready" : "failed";
  }

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
    ...(customItem ? { customItem } : {}),
    ...(notes ? { note: notes } : {}),
    ...(paintingImageUrl ? { paintingImageUrl } : {}),
    ...(paintingStatus ? { paintingStatus } : {}),
    status: "sent",
    createdAt: new Date().toISOString(),
  });

  const gestureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/g/${ref.id}`;
  const whatLine =
    mode === "own"
      ? itemDescription!
      : mode === "message"
        ? "un petit mot"
        : mode === "painting"
          ? "une peinture générée par IA, rien que pour vous deux"
          : item === "autre"
            ? customItem!
            : CURATED_ITEM_LABEL[item as CuratedGestureItem];

  const recipientEmailSent = recipientEmail
    ? await sendEmail({
        to: recipientEmail,
        subject: `${senderName} a pensé à vous`,
        text: `${senderName} vous envoie : ${whatLine}.${notes && mode !== "painting" ? ` "${notes}"` : ""}\n\n${gestureUrl}`,
        html: emailShell({
          mascotName: "mochi",
          title: `${escapeHtml(senderName)} a pensé à vous`,
          bodyHtml:
            mode === "painting" && paintingImageUrl
              ? `<p style="font-size:11px;font-weight:600;text-align:center;color:#565049;text-transform:uppercase;letter-spacing:0.04em;">Illustration générée par IA</p>
                 <img src="${paintingImageUrl}" alt="Peinture générée par IA" width="480" style="display:block;width:100%;height:auto;border-radius:12px;margin:8px 0;" />`
              : `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;">${escapeHtml(whatLine)}${notes && mode !== "painting" ? `<br><em>"${escapeHtml(notes)}"</em>` : ""}</p>`,
        }),
      })
    : undefined;

  // No SMS provider exists in this app (same reasoning meeting-requests/
  // create already documents) — a phone-only gesture hands the sender
  // the link back so they can share it themselves via WhatsApp/SMS.
  return NextResponse.json({
    status: "sent",
    id: ref.id,
    gestureUrl,
    recipientEmailSent: recipientEmailSent ?? null,
    ...(mode === "painting" ? { paintingImageUrl: paintingImageUrl ?? null, paintingStatus } : {}),
  });
}

// Real generation, not a mockup — the exact same fal-ai/fast-sdxl call
// already proven in app/api/ai-venue-mood/route.ts, with the sender's own
// note as the creative brief instead of a fixed category prompt. A style
// suffix keeps output looking like a considered illustration regardless
// of how little (or how much) the sender wrote, without ever inventing
// content about the recipient the sender didn't actually provide.
async function generatePainting(inspiration: string | undefined): Promise<string | undefined> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return undefined;

  const brief = inspiration?.trim() || "a warm, thoughtful moment between two people who care about each other";
  const prompt = `A warm, painterly illustration inspired by: "${brief}". Soft brushstrokes, gentle color palette, intimate and heartfelt mood, no text, no logos, no watermarks.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAINTING_GENERATION_TIMEOUT_MS);
  try {
    const res = await fetch("https://fal.run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: "square_hd", num_images: 1 }),
      signal: controller.signal,
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const imageUrl: unknown = data?.images?.[0]?.url;
    return typeof imageUrl === "string" ? imageUrl : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
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
