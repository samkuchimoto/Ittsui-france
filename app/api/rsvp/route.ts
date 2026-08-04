// /app/api/rsvp/route.ts
// Handles one person's tap on a weekly proposal.
// Rule: both yes -> confirmed. Any no (or anything but yes from both) -> cancelled.
// No thread, no renegotiation — this is the whole point of the product.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import type { Week } from "@/lib/types";

export async function POST(request: Request) {
  const { pairId, weekId, userId, response } = await request.json();

  if (!pairId || !weekId || !userId || (response !== "yes" && response !== "no")) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const weekRef = adminDb
    .collection("pairs")
    .doc(pairId)
    .collection("weeks")
    .doc(weekId);

  const weekSnap = await weekRef.get();
  if (!weekSnap.exists) {
    return NextResponse.json({ error: "week not found" }, { status: 404 });
  }

  const week = weekSnap.data() as Week;

  if (week.status !== "proposed") {
    // Already locked or cancelled — taps after that don't change anything
    return NextResponse.json({ status: week.status });
  }

  if (!(userId in week.responses)) {
    return NextResponse.json({ error: "user not part of this pair" }, { status: 403 });
  }

  const updatedResponses = { ...week.responses, [userId]: response };
  const values = Object.values(updatedResponses);

  let newStatus: Week["status"] = "proposed";
  if (response === "no") {
    // A single "no" cancels immediately — no need to wait on the other person
    newStatus = "cancelled";
  } else if (values.every((v) => v === "yes")) {
    newStatus = "confirmed";
  }

  await weekRef.update({
    responses: updatedResponses,
    status: newStatus,
  });

  return NextResponse.json({ status: newStatus });
}
