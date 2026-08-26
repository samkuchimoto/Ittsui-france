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
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { googleCalendarLink } from "@/lib/googleCalendarLink";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

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
    if (data.senderEmail) {
      const sent = await sendEmail({
        to: data.senderEmail,
        subject: "Votre demande de rendez-vous a été déclinée",
        text: `${data.recipientName ?? "La personne invitée"} a décliné votre demande pour ${data.venueName}, le ${data.date} à ${data.time}.`,
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

  // Both parties notified by email, as required — the sender gets
  // confirmation, and the recipient gets a copy back as their own record
  // of what they just confirmed. Both also get the Google Calendar link
  // now that it's an actual confirmed commitment, not just a proposal.
  const calendarUrl = googleCalendarLink({
    title: `${data.venueName} — Ittsui`,
    details: `Rendez-vous confirmé via Ittsui.`,
    venueAddress: data.venueAddress,
    date: data.date,
    time: data.time,
  });
  const confirmationText =
    `Rendez-vous confirmé : ${data.venueName} (${data.venueAddress}), le ${data.date} à ${data.time}.\n` +
    `Ajouter à Google Agenda : ${calendarUrl}`;
  const confirmationHtml =
    `<p><strong>Rendez-vous confirmé :</strong> ${escapeHtml(data.venueName)} (${escapeHtml(data.venueAddress)}), le ${escapeHtml(data.date)} à ${escapeHtml(data.time)}.</p>` +
    `<p><a href="${calendarUrl}">Ajouter à Google Agenda</a></p>`;
  const [senderSent, recipientSent] = await Promise.all([
    data.senderEmail
      ? sendEmail({
          to: data.senderEmail,
          subject: "Votre demande de rendez-vous a été acceptée",
          text: `${data.recipientName} a accepté. ${confirmationText}`,
          html: `<p>${escapeHtml(data.recipientName ?? "")} a accepté.</p>${confirmationHtml}`,
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
          subject: "Rendez-vous confirmé sur Ittsui",
          text: confirmationText,
          html: confirmationHtml,
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
