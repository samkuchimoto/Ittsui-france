// /app/api/venue-partners/route.ts
// Intake for venues (cafés, restaurants, museums) interested in joining
// Ittsui as a bookable partner. This is step one of the real pipeline:
// application (here) -> manual admin review (/api/admin/venue-partners)
// -> approval generates the venue's own manage link
// (/api/admin/venue-partners/[id]/approve) -> the venue posts real open
// slots (/partenaires/[id]/gerer) -> anyone can browse
// (/partenaires/rechercher, backed by /api/venue-partners/search's
// deterministic ranking) and book one for real
// (/partenaires/[id]/reserver -> /api/venue-partners/[id]/book, a
// transaction-guarded write so two people can't double-book the same
// slot). Still no payment/commission handling, and still no external
// POS/calendar integration — this app is the sole source of truth for
// its own directly-onboarded partners' availability, which is what
// keeps every booking honest: nothing is ever shown as bookable unless
// a real venue actually opened that exact slot themselves.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  venueName: z.string().trim().min(1).max(200),
  category: z.enum(["cafe", "restaurant", "museum", "autre"]),
  address: z.string().trim().min(1).max(300),
  // 5-digit French postal code — needed for real matching later (see
  // /api/venue-partners/search), not just display. Loosely validated,
  // same lenient reasoning invite-partner/route.ts already applies to
  // its own postalCode field: silently ignored if malformed rather than
  // rejecting the whole application over it.
  postalCode: z.string().trim().optional(),
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().toLowerCase().email().max(320),
  contactPhone: z
    .string()
    .trim()
    .min(6)
    .max(30)
    .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }

  const { postalCode, ...rest } = parsed.data;
  const ref = adminDb.collection("venuePartnerApplications").doc();
  await ref.set({
    ...rest,
    ...(postalCode && /^\d{5}$/.test(postalCode) ? { postalCode } : {}),
    status: "pending_review",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ status: "received", id: ref.id });
}
