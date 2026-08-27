// /app/api/admin/venue-partners/route.ts
// Lists every venue-partner application for manual review — same
// admin-secret pattern as /api/admin/early-access. See
// /api/admin/venue-partners/[id]/approve for turning one into a real,
// bookable partner.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("venuePartnerApplications").orderBy("createdAt", "desc").get();
  const applications = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ count: applications.length, applications });
}
