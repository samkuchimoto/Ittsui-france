// /app/api/admin/venue-partners/[id]/approve/route.ts
// Turns a reviewed application into a real, live partner: generates the
// bearer secret for that venue's own "manage my availability" link (the
// only credential a venue owner ever needs — no separate login system,
// same trust model as every other bearer link in this app) and emails
// it to them. Admin-only, same CRON_SECRET pattern as the rest of
// /api/admin/**.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, emailButton } from "@/lib/emailTemplates";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ref = adminDb.collection("venuePartnerApplications").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "candidature introuvable" }, { status: 404 });
  }

  const data = snap.data()!;
  if (data.status === "active" && data.manageToken) {
    // Idempotent re-approve: re-sends the same existing link rather than
    // generating a second, orphaned one — approving twice by accident
    // shouldn't invalidate the link already handed to the venue.
    return NextResponse.json({ status: "already_active", manageUrl: manageUrl(params.id, data.manageToken) });
  }

  const manageToken = crypto.randomUUID();
  await ref.update({ status: "active", manageToken, slots: [] });

  const url = manageUrl(params.id, manageToken);
  const sent = await sendEmail({
    to: data.contactEmail,
    subject: "Votre lieu est en ligne sur Ittsui",
    text: `${data.venueName} est maintenant un lieu partenaire Ittsui. Gérez vos créneaux disponibles ici : ${url}`,
    html: emailShell({
      mascotName: "bao",
      title: `${data.venueName} est en ligne sur Ittsui`,
      bodyHtml: `
        <p style="font-size: 15px; line-height: 1.5; color: #565049; text-align: center;">
          Ajoutez les créneaux où vous pouvez accueillir une rencontre Ittsui — c'est la seule
          chose à faire pour commencer à recevoir des réservations.
        </p>
        ${emailButton(url, "Gérer mes créneaux")}
        <p style="font-size: 12px; color: #8A8378; text-align: center;">
          Gardez ce lien — c'est votre seul accès, sans mot de passe.
        </p>
      `,
    }),
  });

  return NextResponse.json({ status: "activated", manageUrl: url, emailSent: sent });
}

function manageUrl(id: string, token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/partenaires/${id}/gerer?token=${token}`;
}

async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error(`venue-partners/approve: sendEmail failed (${res.status}) to ${to}`);
    return false;
  }
  return true;
}
