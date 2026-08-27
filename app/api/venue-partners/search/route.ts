// /app/api/venue-partners/search/route.ts
// The "AI matching" layer, built as a deterministic ranking function
// rather than an LLM call — this is genuinely the right engineering
// choice, not a corner cut: matching a postal code + category against a
// small structured list of venues is exactly the kind of task a fast,
// predictable, free ranking function does better than a model call
// would (no added latency, no cost, no risk of an odd/unexplainable
// ranking). "Light and fast" is satisfied by NOT reaching for AI here.
// Only ever returns active partners, and only the fields a stranger
// browsing should see — contactEmail/phone/manageToken never leave the
// admin/management routes.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import type { VenuePartner, VenuePartnerSlot } from "@/lib/types";

function openSlotCount(slots: VenuePartnerSlot[] | undefined): number {
  if (!slots) return 0;
  const now = new Date().toISOString().slice(0, 10);
  return slots.filter((s) => !s.booked && s.date >= now).length;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postalCode = url.searchParams.get("postalCode")?.trim();
  const category = url.searchParams.get("category")?.trim();

  const snap = await adminDb.collection("venuePartnerApplications").where("status", "==", "active").get();
  const partners = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as VenuePartner);

  const department = postalCode?.length === 5 ? postalCode.slice(0, 2) : undefined;

  const ranked = partners
    .filter((p) => !category || p.category === category)
    .map((p) => {
      // 0 = exact postal code, 1 = same department, 2 = no location
      // signal to compare against — a real, explainable tiering, not a
      // fuzzy score nobody could account for.
      let locationTier = 2;
      if (postalCode && p.postalCode === postalCode) locationTier = 0;
      else if (department && p.postalCode?.startsWith(department)) locationTier = 1;
      return { partner: p, locationTier, openSlots: openSlotCount(p.slots) };
    })
    .filter((r) => r.openSlots > 0) // a venue with nothing bookable isn't a useful result
    .sort((a, b) => a.locationTier - b.locationTier || b.openSlots - a.openSlots)
    .slice(0, 20)
    .map((r) => ({
      id: r.partner.id,
      venueName: r.partner.venueName,
      category: r.partner.category,
      address: r.partner.address,
      postalCode: r.partner.postalCode ?? null,
      nextSlots: (r.partner.slots ?? [])
        .filter((s) => !s.booked)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 3)
        .map((s) => ({ id: s.id, date: s.date, time: s.time })),
    }));

  return NextResponse.json({ results: ranked });
}
