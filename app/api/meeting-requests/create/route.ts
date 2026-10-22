// /app/api/meeting-requests/create/route.ts
// Sends a one-off meeting request (venue, address, date, time) to a
// contact by email — the ad-hoc counterpart to /api/invite-partner's
// permanent weekly Pair bond. The recipient doesn't need an Ittsui account
// yet: they get an email, log in, and accept/decline from
// /request/{requestId}, mirroring /invite/{pairId}'s exact pattern.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { logEvent } from "@/lib/analytics";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { emailShell, emailButton, escapeHtml } from "@/lib/emailTemplates";
import { frenchDateLabel } from "@/lib/proposalMessage";
import { langOf } from "@/lib/i18n";
import { makeT } from "@/lib/translate";
import { EMAILS } from "@/lib/emails.i18n";
import { getPlan, recordRendezVous } from "@/lib/plan";
import { partnerNamed } from "@/lib/partnerPilot";
import { CITY_IDS, cityOf } from "@/lib/cities";

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
    // The sender's app language: the email below goes out in it, and
    // /request/{id} opens in it (see lib/types.ts MeetingRequest.lang).
    lang: z.enum(["fr", "en", "ja"]).optional(),
    // A partner venue picked in the form (lib/partnerPilot.ts); checked below.
    partnerId: z.string().max(64).optional(),
    // The meeting's city (lib/cities.ts); Paris when absent (older app builds).
    cityId: z.enum(CITY_IDS).optional(),
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
  const lang = langOf(parsed.data.lang);
  const t = makeT(lang, EMAILS);
  // French keeps the stored "2026-09-20"; English and Japanese get the day written out.
  const dateLabel = lang === "fr" ? date : frenchDateLabel(date, lang);
  // The time is the meeting city's own; outside Paris it says which city.
  const city = cityOf(parsed.data.cityId);
  const timeLabel = city.id === "paris" ? time : `${time} (${city.name[lang]})`;

  const senderSnap = await adminDb.collection("users").doc(uid).get();
  const senderName: string = senderSnap.data()?.displayName ?? t("Quelqu'un sur Ittsui");
  const senderEmail: string | null = senderSnap.data()?.email ?? null;

  if (recipientEmail && senderEmail && senderEmail.toLowerCase() === recipientEmail) {
    return NextResponse.json({ error: "vous ne pouvez pas vous envoyer une demande à vous-même" }, { status: 400 });
  }

  // The free plan's one rendez-vous a month (lib/plan.ts). The 402 carries
  // the plan, so the form can show the Plus offer instead of an error.
  const plan = await getPlan(uid);
  if (!plan.canCreate) return NextResponse.json({ error: "plan_limit", plan }, { status: 402 });

  // Only an active partner under the very name picked counts.
  const partner = parsed.data.partnerId ? await partnerNamed(parsed.data.partnerId, venueName).catch(() => null) : null;

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
    cityId: city.id,
    ...(partner ? { partnerId: partner.id, partnerPerk: partner.perk ?? "" } : {}),
    date,
    time,
    lang,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  await recordRendezVous(uid);

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
      title: t("{venue} avec {sender} — Ittsui", { venue: venueName, sender: senderName }),
      details: t("Proposition de rendez-vous via Ittsui. Répondre ici : {url}", { url: requestUrl }),
      venueAddress,
      date,
      time,
      timezone: city.timezone,
    });
    recipientEmailSent = await sendEmail({
      to: recipientEmail,
      subject: t("{sender} vous propose un rendez-vous sur Ittsui", { sender: senderName }),
      text:
        t("{sender} vous propose de vous retrouver :", { sender: senderName }) +
        "\n\n" +
        t("Lieu : {venue} ({address})", { venue: venueName, address: venueAddress }) +
        "\n" +
        (partner?.perk ? t("Partenaire Ittsui : {perk}, pour vous deux.", { perk: partner.perk }) + "\n" : "") +
        t("Date : {date} à {time}", { date: dateLabel, time: timeLabel }) +
        "\n\n" +
        t("Pour accepter ou décliner, connectez-vous ici : {url}", { url: requestUrl }) +
        "\n" +
        t("Ajouter à Google Agenda (dès maintenant, avant même de répondre) : {url}", { url: calendarUrl }) +
        "\n\n" +
        t("Cette demande expire dans {n} jours.", { n: REQUEST_EXPIRY_DAYS }),
      html: emailShell({
        lang,
        mascotName: "pika",
        title: t("{sender} vous propose un rendez-vous", { sender: escapeHtml(senderName) }),
        bodyHtml: `
          <p style="font-size: 15px; line-height: 1.5; color: #565049; text-align: center;">
            <strong style="color: #1C1917;">${escapeHtml(venueName)}</strong> (${escapeHtml(venueAddress)})<br>
            ${t("{date} à {time}", { date: escapeHtml(dateLabel), time: escapeHtml(timeLabel) })}
          </p>
          ${partner?.perk ? `<p style="font-size: 14px; font-weight: 600; color: #B84E2A; text-align: center;">${escapeHtml(t("Partenaire Ittsui : {perk}, pour vous deux.", { perk: partner.perk }))}</p>` : ""}
          ${emailButton(requestUrl, t("Accepter ou décliner"))}
          <p style="text-align: center; font-size: 13px;">
            <a href="${calendarUrl}" style="color: #565049;">${t("Ajouter à Google Agenda")}</a>${lang === "ja" ? "" : " "}${t("(dès maintenant, avant même de répondre)")}
          </p>
          <p style="font-size: 12px; color: #8A8378; text-align: center;">
            ${t("Cette demande expire dans {n} jours.", { n: REQUEST_EXPIRY_DAYS })}
          </p>
        `,
      }),
    });

    // Persisted, not just returned in this one response — same reasoning as
    // invite-partner/route.ts's partnerEmailSent: the sender needs to be able
    // to see real delivery status later, not just at send time.
    await ref.update({ recipientEmailSent });
  }

  logEvent("custom_rendezvous_created", { requestId: ref.id, hasEmail: Boolean(recipientEmail), hasPhone: Boolean(recipientPhone) });

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
