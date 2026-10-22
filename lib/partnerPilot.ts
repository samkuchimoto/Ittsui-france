// /lib/partnerPilot.ts
// The partner pilot (live in Paris: matching is by French postal code):
// venues pay for the rendez-vous Ittsui brings them in their slow hours, on
// the terms of lib/venuePilot.ts. Server-only.
//   - Matching: an active partner in the rendez-vous' postal code whose slow
//     hours cover its day and time (lib/partnerHours.ts) is suggested first,
//     as "Partenaire · {perk}": option A of the weekly ritual
//     (weekly-propose), the first chips of the request form (/api/
//     venue-partners/nearby).
//   - Visits: once a rendez-vous there is confirmed (rsvp for the ritual,
//     meeting-requests/respond for a request), venuePartnerApplications/
//     {id}/visits/{visitId} gets a 4-character code that both people show at
//     the counter; the venue validates it on its own page, which counts the
//     visits Ittsui brought (/api/venue-partners/[id]/pilot). That count is
//     what gets invoiced (lib/venuePilot.ts: €1.50 per verified visit).

import { randomInt } from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { inSlowHours } from "@/lib/partnerHours";
import type { Pair, VenueOption, VenuePartner, VenueType } from "@/lib/types";

export const PARTNERS = "venuePartnerApplications";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

const VENUE_TYPE: Record<VenuePartner["category"], VenueType> = {
  cafe: "cafe",
  restaurant: "restaurant",
  museum: "museum",
  autre: "cafe",
};

export interface Visit {
  id: string;
  source: "ritual" | "request";
  date: string;
  time: string;
  perk: string;
  code: string;
  status: "confirmed" | "visited";
  createdAt: string;
  checkedInAt?: string;
}

/** The venue's own bearer link (sent at approval) is its only credential. */
export async function verifyPartnerToken(id: string, token: string | null | undefined) {
  if (!token) return null;
  const ref = adminDb.collection(PARTNERS).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.manageToken !== token) return null;
  return { ref, data: { id: snap.id, ...snap.data() } as VenuePartner };
}

export async function activePartners(postalCode?: string): Promise<VenuePartner[]> {
  const snap = await adminDb.collection(PARTNERS).where("status", "==", "active").get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as VenuePartner)
    .filter((p) => !postalCode || p.postalCode === postalCode);
}

export function partnerOption(p: VenuePartner): VenueOption {
  return {
    venueId: `partner_${p.id}`,
    venueName: p.venueName,
    venueAddress: p.address,
    venueType: VENUE_TYPE[p.category],
    partner: { id: p.id, perk: p.perk ?? "" },
  };
}

function hash(input: string): number {
  let h = 0;
  for (const ch of input) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * The partner for a pair's ritual this week: in their postal code, slow
 * hours covering their day and start time. With several, the pair and the
 * week pick one, so it rotates fairly.
 */
export async function partnerForRitual(pair: Pair, weekOf: string): Promise<VenueOption | null> {
  if (!pair.postalCode) return null;
  const matches = (await activePartners(pair.postalCode))
    .filter((p) => inSlowHours(p.slowHours, pair.agreedDay, pair.agreedWindowStart))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!matches.length) return null;
  return partnerOption(matches[hash(pair.id + weekOf) % matches.length]);
}

/** An active partner by id, if `venueName` is really its name (a request can't claim one it didn't pick). */
export async function partnerNamed(id: string, venueName: string): Promise<VenuePartner | null> {
  const snap = await adminDb.collection(PARTNERS).doc(id).get();
  const p = snap.exists ? ({ id: snap.id, ...snap.data() } as VenuePartner) : null;
  return p && p.status === "active" && p.venueName === venueName ? p : null;
}

/** Records a confirmed rendez-vous at a partner and returns its code; the same visit id returns the same code. */
export async function recordVisit(
  partnerId: string,
  visitId: string,
  fields: Pick<Visit, "source" | "date" | "time" | "perk">
): Promise<string> {
  const ref = adminDb.collection(PARTNERS).doc(partnerId).collection("visits").doc(visitId);
  const existing = await ref.get();
  if (existing.exists) return existing.data()!.code as string;
  const code = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  await ref.set({ ...fields, code, status: "confirmed", createdAt: new Date().toISOString() });
  return code;
}
