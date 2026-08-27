// /app/api/venue-partners/[id]/availability/route.ts
// The venue owner's own view/edit of their bookable slots — token is the
// sole credential (see approve/route.ts's manageToken comment), checked
// on both GET and PUT so a guessed venue id alone can't read or change
// another venue's slots.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import type { VenuePartnerSlot } from "@/lib/types";

const slotSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  booked: z.boolean(),
});

async function verifyToken(id: string, token: string | null) {
  if (!token) return null;
  const ref = adminDb.collection("venuePartnerApplications").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.manageToken !== token) return null;
  return { ref, data };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const token = new URL(request.url).searchParams.get("token");
  const found = await verifyToken(params.id, token);
  if (!found) return NextResponse.json({ error: "non autorisé" }, { status: 401 });

  return NextResponse.json({
    venueName: found.data.venueName,
    slots: (found.data.slots ?? []) as VenuePartnerSlot[],
  });
}

const bodySchema = z.object({
  token: z.string().min(1),
  // The manage page always sends the full slot list back — simplest
  // correct model for a small, per-venue list; no partial-patch logic
  // needed. A venue owner can never flip `booked` back to false on a
  // slot someone already reserved (see below) — cancelling a real
  // booking is a distinct, deliberate action, not an incidental side
  // effect of editing the slot list.
  slots: z.array(slotSchema),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "créneaux invalides" }, { status: 400 });
  }
  const found = await verifyToken(params.id, parsed.data.token);
  if (!found) return NextResponse.json({ error: "non autorisé" }, { status: 401 });

  const existingSlots = (found.data.slots ?? []) as VenuePartnerSlot[];
  const bookedIds = new Set(existingSlots.filter((s) => s.booked).map((s) => s.id));

  // A slot already booked by a real requester can't be silently
  // un-booked (or deleted) by re-saving the list — that would discard a
  // real, already-confirmed booking with nobody notified. It can still
  // be edited going forward: this only protects the `booked` flag and
  // the slot's continued existence, not its date/time text.
  const nextSlots = parsed.data.slots.map((s) => (bookedIds.has(s.id) ? { ...s, booked: true } : s));
  for (const id of bookedIds) {
    if (!nextSlots.some((s) => s.id === id)) {
      const stillThere = existingSlots.find((s) => s.id === id)!;
      nextSlots.push(stillThere);
    }
  }

  await found.ref.update({ slots: nextSlots });
  return NextResponse.json({ slots: nextSlots });
}
