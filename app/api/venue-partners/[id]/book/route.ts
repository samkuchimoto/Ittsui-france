// /app/api/venue-partners/[id]/book/route.ts
// A real, immediate booking against one of a partner venue's own posted
// slots — no external calendar/POS integration, this app is the sole
// source of truth for its own directly-onboarded partners' availability
// (see lib/types.ts's VenuePartnerSlot comment for why that's the
// honest, correct scope). A Firestore transaction guards the actual
// double-booking race (two people tapping the same slot within
// milliseconds of each other) — the slot-list PUT in availability/
// route.ts isn't safe against that on its own, this route is the one
// real write path for turning a slot from open to booked.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { emailShell, emailButton, escapeHtml } from "@/lib/emailTemplates";
import type { VenuePartnerSlot } from "@/lib/types";

const FROM_ADDRESS = "Ittsui <hello@ittsui.fr>";

const bodySchema = z
  .object({
    slotId: z.string().min(1),
    requesterName: z.string().trim().min(1).max(200),
    requesterEmail: z.string().trim().toLowerCase().email().max(320).optional(),
    requesterPhone: z
      .string()
      .trim()
      .min(6)
      .max(30)
      .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
      .optional(),
  })
  .refine((data) => data.requesterEmail || data.requesterPhone, { message: "e-mail ou téléphone requis" });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const { slotId, requesterName, requesterEmail, requesterPhone } = parsed.data;

  const venueRef = adminDb.collection("venuePartnerApplications").doc(params.id);
  const bookingRef = adminDb.collection("venueBookings").doc();

  let venueName = "";
  let venueAddress = "";
  let bookedDate = "";
  let bookedTime = "";
  let contactEmail: string | undefined;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(venueRef);
      if (!snap.exists) throw new Error("lieu introuvable");
      const data = snap.data()!;
      if (data.status !== "active") throw new Error("ce lieu n'accepte pas encore de réservations");

      const slots = (data.slots ?? []) as VenuePartnerSlot[];
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) throw new Error("créneau introuvable");
      if (slot.booked) throw new Error("ce créneau vient d'être réservé par quelqu'un d'autre");

      const nextSlots = slots.map((s) => (s.id === slotId ? { ...s, booked: true } : s));
      tx.update(venueRef, { slots: nextSlots });
      tx.set(bookingRef, {
        venuePartnerId: params.id,
        venueName: data.venueName,
        venueAddress: data.address,
        slotId,
        date: slot.date,
        time: slot.time,
        requesterName,
        ...(requesterEmail ? { requesterEmail } : {}),
        ...(requesterPhone ? { requesterPhone } : {}),
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });

      venueName = data.venueName;
      venueAddress = data.address;
      bookedDate = slot.date;
      bookedTime = slot.time;
      contactEmail = data.contactEmail;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "réservation impossible";
    const status = message.includes("introuvable") ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }

  // Both sides notified — the venue needs to actually know someone's
  // coming, the requester gets their own confirmation record. Neither
  // failing to send undoes the booking itself; it's already committed.
  await Promise.all([
    contactEmail
      ? sendEmail({
          to: contactEmail,
          subject: `Nouvelle réservation Ittsui — ${bookedDate} à ${bookedTime}`,
          text: `${requesterName} a réservé le créneau du ${bookedDate} à ${bookedTime} via Ittsui.`,
          html: emailShell({
            mascotName: "bao",
            title: "Nouvelle réservation",
            bodyHtml: `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;">${escapeHtml(requesterName)} a réservé le créneau du <strong style="color:#1C1917;">${escapeHtml(bookedDate)} à ${escapeHtml(bookedTime)}</strong> via Ittsui.</p>`,
          }),
        })
      : Promise.resolve(false),
    requesterEmail
      ? sendEmail({
          to: requesterEmail,
          subject: `Réservation confirmée — ${venueName}`,
          text: `Votre réservation chez ${venueName} (${venueAddress}) est confirmée pour le ${bookedDate} à ${bookedTime}.`,
          html: emailShell({
            mascotName: "yuki",
            title: "Réservation confirmée",
            bodyHtml: `<p style="font-size:15px;line-height:1.5;color:#565049;text-align:center;"><strong style="color:#1C1917;">${escapeHtml(venueName)}</strong> (${escapeHtml(venueAddress)})<br>${escapeHtml(bookedDate)} à ${escapeHtml(bookedTime)}</p>`,
          }),
        })
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ status: "confirmed", venueName, venueAddress, date: bookedDate, time: bookedTime });
}

async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error(`venue-partners/book: sendEmail failed (${res.status}) to ${to}`);
    return false;
  }
  return true;
}
