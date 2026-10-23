// /app/api/meeting-requests/respond/route.ts
// Called from /request/{requestId} once the recipient decides.
//
// Accept has TWO distinct trust paths, not one, matching whether an email
// was ever on file to check against:
//   - Email-addressed request: sign-in with the exact invited email is
//     required, same as activate-pending-pair/route.ts — the requestId
//     alone isn't authorization here, because email is interceptable/
//     forwardable and the whole point of the check is confirming it's
//     really that person, not just possession of the link.
//   - Phone-only request: no recipientEmail ever existed to check against,
//     so requiring a Google sign-in here was pure friction with ZERO
//     added security — any signed-in account could already accept it
//     regardless, since there was never an identity to verify. Real gap
//     found 2026-08-26: the unguessable link is already the sole
//     authorization for this case (same trust boundary decline already
//     uses below), so accept can be genuinely one-tap, no login, for
//     exactly this case and no other.
// Decline never requires login either way — an opt-out shouldn't cost
// someone an account.

import { NextResponse } from "next/server";
import { emailDirection } from "@/lib/emailTemplates";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { logEvent } from "@/lib/analytics";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { frenchDateLabel } from "@/lib/proposalMessage";
import { langOf } from "@/lib/i18n";
import { makeT } from "@/lib/translate";
import { EMAILS } from "@/lib/emails.i18n";
import { recordVisit } from "@/lib/partnerPilot";
import { cityOf } from "@/lib/cities";

const FROM_ADDRESS = "Ittsui <contact@kuchimoto.com>";

// userId/userEmail are now optional even for accept — the handler below
// decides whether they're actually required, once it knows if this
// specific request has an email on file to check against. A schema-level
// .refine() can't make that call, since it doesn't have the Firestore doc
// yet at validation time.
const bodySchema = z.object({
  requestId: z.string().min(1),
  userId: z.string().min(1).optional(),
  userEmail: z.string().min(1).optional(),
  decline: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "champs manquants" }, { status: 400 });
  }
  const { requestId, decline, userId, userEmail } = parsed.data;

  const ref = adminDb.collection("meetingRequests").doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "demande introuvable" }, { status: 404 });
  }

  const data = snap.data()!;
  // The sender's language (MeetingRequest.lang): both emails below use it.
  const lang = langOf(data.lang);
  const t = makeT(lang, EMAILS);
  const dateLabel = lang === "fr" ? data.date : frenchDateLabel(data.date, lang);
  // The time is the meeting city's own; outside Paris it says which city.
  const city = cityOf(data.cityId);
  const timeLabel = city.id === "paris" ? data.time : `${data.time} (${city.name[lang]})`;

  // Only an email-addressed request actually needs a signed-in identity
  // to accept — see the file header. A phone-only request accepted with
  // no userId at all is the new, genuine one-tap path; if a userId WAS
  // provided anyway (someone signed in even though they didn't have to),
  // it's still recorded below exactly as before.
  if (!decline && data.recipientEmail && !(userId && userEmail)) {
    return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  }

  // Reopening the link (refresh, back button) after already accepting
  // should land back on the dashboard, not throw "déjà traitée" — same
  // idempotency activate-pending-pair applies to its own accept path.
  // Two ways this counts as "the same person re-visiting": a logged-in
  // match on recipientId (unchanged), or — new — no login at all on a
  // request that was itself accepted without one, since there's no
  // identity to compare against in that path either way.
  const isIdempotentRevisit =
    data.status === "accepted" &&
    !decline &&
    ((userId && data.recipientId === userId) || (!userId && !data.recipientId));
  if (isIdempotentRevisit) {
    return NextResponse.json({
      status: "accepted",
      requestId,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      venueType: data.venueType ?? null,
      date: data.date,
      time: data.time,
    });
  }

  if (data.status !== "pending") {
    return NextResponse.json({ error: "cette demande a déjà été traitée" }, { status: 409 });
  }

  if (new Date(data.expiresAt) < new Date()) {
    await ref.update({ status: "expired" });
    return NextResponse.json({ error: "cette demande a expiré" }, { status: 410 });
  }

  if (decline) {
    await ref.update({ status: "declined", respondedAt: new Date().toISOString() });
    logEvent("custom_rendezvous_responded", { requestId, response: "declined", cityId: cityOf(data.cityId).id, lang: langOf(data.lang) });
    if (data.senderEmail) {
      const sent = await sendEmail({
        to: data.senderEmail,
        subject: t("Votre demande de rendez-vous a été déclinée"),
        text: data.recipientName
          ? t("{name} a décliné votre demande pour {venue}, le {date} à {time}.", {
              name: data.recipientName,
              venue: data.venueName,
              date: dateLabel,
              time: data.time,
            })
          : t("La personne invitée a décliné votre demande pour {venue}, le {date} à {time}.", {
              venue: data.venueName,
              date: dateLabel,
              time: data.time,
            }),
      });
      if (!sent) console.warn(`meeting-requests/respond: decline notification failed for request ${requestId}`);
    }
    return NextResponse.json({ status: "declined" });
  }

  // No email on file at all means this was a phone-only request — the
  // sender shared the link themselves (see meeting-requests/create's
  // requestUrl), so the unguessable bearer link is the authorization here,
  // same trust boundary the decline path above already accepts. Only
  // enforce the match when an email actually exists to check against.
  if (data.recipientEmail && data.recipientEmail !== String(userEmail).trim().toLowerCase()) {
    return NextResponse.json({ error: "cette demande ne correspond pas à votre compte" }, { status: 403 });
  }

  await ref.update({
    status: "accepted",
    // Conditionally included, never written as `undefined` — the Admin
    // SDK throws on that rather than omitting the field the way a plain
    // object spread would. Genuinely absent for the new no-login,
    // phone-only accept path, which has no identity to record.
    ...(userId ? { recipientId: userId } : {}),
    respondedAt: new Date().toISOString(),
  });
  logEvent("custom_rendezvous_responded", { requestId, response: "accepted", cityId: city.id, lang });

  // Both parties notified by email, as required — the sender gets
  // confirmation, and the recipient gets a copy back as their own record
  // of what they just confirmed. Both also get the Google Calendar link
  // now that it's an actual confirmed commitment, not just a proposal.
  const calendarUrl = googleCalendarLink({
    title: `${data.venueName} — Ittsui`,
    details: t("Rendez-vous confirmé via Ittsui."),
    venueAddress: data.venueAddress,
    date: data.date,
    time: data.time,
    timezone: city.timezone,
  });
  // The partner pilot (lib/partnerPilot.ts): accepted at a partner venue,
  // the rendez-vous gets the code both people show at the counter.
  const visitCode = data.partnerId
    ? await recordVisit(data.partnerId, `request_${requestId}`, {
        source: "request",
        date: data.date,
        time: data.time,
        perk: data.partnerPerk ?? "",
      }).catch((err) => {
        console.error(`meeting-requests/respond: partner visit not recorded for ${requestId}`, err);
        return null;
      })
    : null;
  if (visitCode) await ref.update({ visitCode });
  const visitLine = visitCode
    ? [data.partnerPerk ? t("Partenaire Ittsui : {perk}, pour vous deux.", { perk: data.partnerPerk }) : "", t("Code à montrer au comptoir : {code}", { code: visitCode })]
        .filter(Boolean)
        .join(" ")
    : "";

  const sp = lang === "ja" ? "" : " ";
  const confirmationText =
    `${t("Rendez-vous confirmé :")}${sp}` +
    t("{venue} ({address}), le {date} à {time}.", { venue: data.venueName, address: data.venueAddress, date: dateLabel, time: timeLabel }) +
    "\n" +
    t("Ajouter à Google Agenda : {url}", { url: calendarUrl }) +
    (visitLine ? `\n${visitLine}` : "");
  const confirmationHtml =
    `<p><strong>${t("Rendez-vous confirmé :")}</strong>${sp}` +
    t("{venue} ({address}), le {date} à {time}.", {
      venue: escapeHtml(data.venueName),
      address: escapeHtml(data.venueAddress),
      date: escapeHtml(dateLabel),
      time: escapeHtml(timeLabel),
    }) +
    `</p>` +
    `<p><a href="${calendarUrl}">${t("Ajouter à Google Agenda")}</a></p>` +
    (visitLine ? `<p><strong>${escapeHtml(visitLine)}</strong></p>` : "");
  const [senderSent, recipientSent] = await Promise.all([
    data.senderEmail
      ? sendEmail({
          to: data.senderEmail,
          subject: t("Votre demande de rendez-vous a été acceptée"),
          text: `${t("{name} a accepté.", { name: data.recipientName })}${sp}${confirmationText}`,
          html: `<div${emailDirection(lang)}><p>${t("{name} a accepté.", { name: escapeHtml(data.recipientName ?? "") })}</p>${confirmationHtml}</div>`,
        })
      : Promise.resolve(false),
    // A phone-only request has no recipientEmail on file. If the person
    // accepted after signing in anyway, send the confirmation to that
    // address instead of skipping it entirely; if they used the new
    // no-login path, there's genuinely no address to send to — skip
    // silently rather than fail. The sender's own copy above always goes
    // out regardless, so the acceptance itself is never unreported.
    (data.recipientEmail ?? userEmail)
      ? sendEmail({
          to: (data.recipientEmail ?? userEmail)!,
          subject: t("Rendez-vous confirmé sur Ittsui"),
          text: confirmationText,
          html: `<div${emailDirection(lang)}>${confirmationHtml}</div>`,
        })
      : Promise.resolve(false),
  ]);
  if (!senderSent || !recipientSent) {
    console.warn(`meeting-requests/respond: accept notification incomplete for request ${requestId}`);
  }

  // Returned so the confirmation screen can show the venue and build its
  // own "add to calendar" link immediately, without a second round-trip
  // to GET /api/meeting-requests/[requestId] right after this call.
  return NextResponse.json({
    status: "accepted",
    requestId,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    venueType: data.venueType ?? null,
    date: data.date,
    time: data.time,
    visit: visitCode ? { code: visitCode, perk: data.partnerPerk ?? "" } : null,
    cityId: city.id,
  });
}

// Only ever interpolates this app's own data (names, addresses) into
// hand-built HTML strings above — the values themselves are user-supplied
// text (a venue name, a contact's name), so this is the real XSS boundary.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

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
