// /app/api/meeting-requests/create/route.ts
// Sends a one-off meeting request (venue, address, date, time) to a
// contact by email — the ad-hoc counterpart to /api/invite-partner's
// permanent weekly Pair bond. The recipient doesn't need an Ittsui account
// yet: they get an email, log in, and accept/decline from
// /request/{requestId}, mirroring /invite/{pairId}'s exact pattern.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { emailShell, emailButton, escapeHtml } from "@/lib/emailTemplates";

const REQUEST_EXPIRY_DAYS = 14; // same window as a Pair invite

// ittsui.fr verified in Resend as of 2026-08-10 — keep in sync with the
// same constant in invite-partner/route.ts and activate-pending-pair/route.ts;
// not shared on purpose, each route owns its own copy.
const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

const VENUE_TYPES = ["cafe", "restaurant", "home", "park", "museum"] as const;

// Real people overwhelmingly know a friend's phone number, not their
// email (2026-08-25 real-user test: an email-only recipient field caused
// an under-10-second abandonment) — email is optional now, but at least
// one of email/phone is still required by the refine below. Phone format
// is deliberately loose: French numbers get written many ways (+33 6 12
// 34 56 78, 06 12 34 56 78, with dots/spaces/dashes), and this number is
// never parsed or dialed by this app, only displayed back and handed to
// the sender's own share sheet — a strict E.164 check would reject real
// numbers for no actual benefit.
const createSchema = z
  .object({
    recipientName: z.string().trim().min(1).max(200),
    recipientEmail: z.string().trim().email().max(320).optional(),
    recipientPhone: z
      .string()
      .trim()
      .min(6)
      .max(30)
      .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
      .optional(),
    venueName: z.string().trim().min(1).max(200),
    venueAddress: z.string().trim().min(1).max(300),
    venueType: z.enum(VENUE_TYPES).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date invalide"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "heure invalide"),
  })
  .refine((data) => data.recipientEmail || data.recipientPhone, {
    message: "indiquez un e-mail ou un numéro de téléphone",
  });

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }

  const { recipientName, venueName, venueAddress, venueType, date, time } = parsed.data;
  const recipientEmail = parsed.data.recipientEmail?.toLowerCase();
  const recipientPhone = parsed.data.recipientPhone;

  const senderSnap = await adminDb.collection("users").doc(uid).get();
  const senderName: string = senderSnap.data()?.displayName ?? "Quelqu'un sur Ittsui";
  const senderEmail: string | null = senderSnap.data()?.email ?? null;

  if (recipientEmail && senderEmail && senderEmail.toLowerCase() === recipientEmail) {
    return NextResponse.json({ error: "vous ne pouvez pas vous envoyer une demande à vous-même" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REQUEST_EXPIRY_DAYS);

  const ref = adminDb.collection("meetingRequests").doc();
  await ref.set({
    senderId: uid,
    senderName,
    senderEmail,
    recipientName,
    ...(recipientEmail ? { recipientEmail } : {}),
    ...(recipientPhone ? { recipientPhone } : {}),
    venueName,
    venueAddress,
    ...(venueType ? { venueType } : {}),
    date,
    time,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  // Short form (/m/r/... redirects to /request/... — see next.config.js)
  // for a cleaner WhatsApp/SMS/email preview.
  const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/r/${ref.id}`;

  // No email on file at all (phone-only) — there's nothing to send server-
  // side (no SMS provider exists in this app). The client shows a
  // share-this-link-yourself flow instead (lib/shareLink.ts) using
  // requestUrl below, so this isn't a dead end, just a different delivery
  // path than email.
  let recipientEmailSent: boolean | undefined;
  if (recipientEmail) {
    const calendarUrl = googleCalendarLink({
      title: `${venueName} avec ${senderName} — Ittsui`,
      details: `Proposition de rendez-vous via Ittsui. Répondre ici : ${requestUrl}`,
      venueAddress,
      date,
      time,
    });
    recipientEmailSent = await sendEmail({
      to: recipientEmail,
      subject: `${senderName} vous propose un rendez-vous sur Ittsui`,
      text:
        `${senderName} vous propose de vous retrouver :\n\n` +
        `Lieu : ${venueName} (${venueAddress})\n` +
        `Date : ${date} à ${time}\n\n` +
        `Pour accepter ou décliner, connectez-vous ici : ${requestUrl}\n` +
        `Ajouter à Google Agenda (dès maintenant, avant même de répondre) : ${calendarUrl}\n\n` +
        `Cette demande expire dans ${REQUEST_EXPIRY_DAYS} jours.`,
      html: emailShell({
        mascotName: "pika",
        title: `${escapeHtml(senderName)} vous propose un rendez-vous`,
        bodyHtml: `
          <p style="font-size: 15px; line-height: 1.5; color: #565049; text-align: center;">
            <strong style="color: #1C1917;">${escapeHtml(venueName)}</strong> (${escapeHtml(venueAddress)})<br>
            ${escapeHtml(date)} à ${escapeHtml(time)}
          </p>
          ${emailButton(requestUrl, "Accepter ou décliner")}
          <p style="text-align: center; font-size: 13px;">
            <a href="${calendarUrl}" style="color: #565049;">Ajouter à Google Agenda</a> (dès maintenant, avant même de répondre)
          </p>
          <p style="font-size: 12px; color: #8A8378; text-align: center;">
            Cette demande expire dans ${REQUEST_EXPIRY_DAYS} jours.
          </p>
        `,
      }),
    });

    // Persisted, not just returned in this one response — same reasoning as
    // invite-partner/route.ts's partnerEmailSent: the sender needs to be able
    // to see real delivery status later, not just at send time.
    await ref.update({ recipientEmailSent });
  }

  return NextResponse.json({ id: ref.id, status: "pending", recipientEmailSent: recipientEmailSent ?? null, requestUrl });
}

// Only ever interpolates this app's own data (names, addresses, ittsui.fr
// URLs) into hand-built HTML strings above — not user-supplied markup
// rendered as-is, but the values themselves ARE user-supplied text (a
// venue name, a contact's name), so this is the actual XSS boundary, not
// a formality — escapeHtml now lives in lib/emailTemplates.ts, shared
// with invite-partner's own HTML email.

async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, ...(html ? { html } : {}) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`sendEmail failed (${res.status}) to ${to}: ${body}`);
    return false;
  }

  return true;
}
