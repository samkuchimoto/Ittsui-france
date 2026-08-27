// /app/api/venue-partners/[id]/route.ts
// Public, unauthenticated preview of one active partner venue and its
// open slots — for the booking page. No token required (unlike
// availability/route.ts, which is the owner's own view/edit surface):
// this is meant to be shared and browsed by anyone, same reasoning
// meeting-requests/[requestId]'s own public preview route documents.
// Never exposes contactEmail/contactPhone/manageToken.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import type { VenuePartnerSlot } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const snap = await adminDb.collection("venuePartnerApplications").doc(params.id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "lieu introuvable" }, { status: 404 });
  }
  const data = snap.data()!;
  if (data.status !== "active") {
    return NextResponse.json({ error: "ce lieu n'accepte pas encore de réservations" }, { status: 404 });
  }

  const openSlots = ((data.slots ?? []) as VenuePartnerSlot[])
    .filter((s) => !s.booked)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return NextResponse.json({
    venueName: data.venueName,
    category: data.category,
    address: data.address,
    slots: openSlots.map((s) => ({ id: s.id, date: s.date, time: s.time })),
  });
}
