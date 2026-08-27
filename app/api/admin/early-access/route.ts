// /app/api/admin/early-access/route.ts
// Real gap: /api/early-access could collect signups but there was no way
// to actually see them short of opening the Firestore console by hand.
// Same admin-secret pattern already used by /api/admin/migrate — this
// one is meant to stay, not a one-time route.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("earlyAccessSignups").orderBy("createdAt", "desc").get();
  const signups = snap.docs.map((doc) => doc.data());
  return NextResponse.json({ count: signups.length, signups });
}
