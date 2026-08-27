// /app/api/early-access/route.ts
// Landing-page email capture for early tester access — real feature
// request, distinct from any real user account (no auth needed to sign
// up here; this is a pure lead list, checked manually when inviting
// testers). Zod-validated per this codebase's zero-trust convention.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "e-mail invalide" }, { status: 400 });
  }
  const { email } = parsed.data;

  // The email itself as the document ID: simplest possible dedup (a
  // second signup with the same address just overwrites, never creates a
  // duplicate lead) and lets a repeat visitor get an honest "already
  // registered" response instead of a generic success.
  const ref = adminDb.collection("earlyAccessSignups").doc(email);
  const existing = await ref.get();
  if (existing.exists) {
    return NextResponse.json({ status: "already_registered" });
  }

  await ref.set({ email, createdAt: new Date().toISOString() });
  return NextResponse.json({ status: "registered" });
}
