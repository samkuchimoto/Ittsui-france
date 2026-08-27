// /app/api/venue-partners/route.ts
// Intake for venues (cafés, restaurants, museums) interested in joining
// Ittsui as a bookable partner — the real first slice of the "Ittsui
// Partenaires" idea, deliberately scoped to what's honest to ship
// tonight: collecting genuine interest from real venue owners, not a
// live booking engine. There is no real-time availability system, no
// payment/commission handling, and no AI matching layer yet — those all
// depend on real partner venues actually existing first, which this
// route is the very first step toward. Never claim or imply a specific
// real venue is "on Ittsui" until it has actually gone through this (or
// a future, fuller) onboarding — see app/partenaires/page.tsx's own
// copy for the same honesty boundary.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  venueName: z.string().trim().min(1).max(200),
  category: z.enum(["cafe", "restaurant", "museum", "autre"]),
  address: z.string().trim().min(1).max(300),
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

  const ref = adminDb.collection("venuePartnerApplications").doc();
  await ref.set({
    ...parsed.data,
    status: "pending_review",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ status: "received", id: ref.id });
}
