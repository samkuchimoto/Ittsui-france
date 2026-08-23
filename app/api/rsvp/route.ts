// /app/api/rsvp/route.ts
// Handles one person's tap on a weekly proposal.
// Single-option weeks (no optionB): "yes"/"no", both yes -> confirmed,
// any no -> cancelled. Same rule as always.
// Two-option weeks (optionB present): each person votes "A" or "B" (or
// "no" to decline both). Confirms only once both have voted AND picked
// the same option — mismatched picks cancel, same as a "no" would, since
// there's no renegotiation either way.
// On confirm, both people get notified (push -> email fallback), same as
// the initial proposal.

import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { notifyBothUsers } from "@/lib/notify";
import type { Pair, Week } from "@/lib/types";

const VALID_RESPONSES = ["yes", "no", "A", "B"] as const;
type ResponseValue = (typeof VALID_RESPONSES)[number];

const bodySchema = z.object({
  pairId: z.string().min(1),
  weekId: z.string().min(1),
  userId: z.string().min(1),
  response: z.enum(VALID_RESPONSES),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { pairId, weekId, userId, response } = parsed.data;

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

  // A two-option week only accepts "A"/"B"/"no"; a single-option week only
  // accepts "yes"/"no" — prevents voting for an option that isn't there.
  const isTwoOption = Boolean(week.optionB);
  const accepted: ResponseValue[] = isTwoOption ? ["A", "B", "no"] : ["yes", "no"];
  if (!accepted.includes(response as ResponseValue)) {
    return NextResponse.json({ error: "invalid response for this proposal" }, { status: 400 });
  }

  const updatedResponses = { ...week.responses, [userId]: response as ResponseValue };
  const values = Object.values(updatedResponses);

  let newStatus: Week["status"] = "proposed";
  if (response === "no") {
    // A single "no" cancels immediately — no need to wait on the other person
    newStatus = "cancelled";
  } else if (values.every((v) => v !== null)) {
    // Both people have responded and neither said "no" (a "no" would have
    // already cancelled above, on whichever turn it was submitted) — so
    // every value here is an accept ("yes", or "A"/"B"). Confirmed only if
    // they picked the exact same thing.
    newStatus = values.every((v) => v === values[0]) ? "confirmed" : "cancelled";
  }

  // On confirm, the Week doc's own venueName/address/confirmationText need
  // to reflect whichever option was actually chosen — they were written
  // once at proposal time mirroring optionA, which would be wrong to leave
  // in place if the pair ended up locking optionB instead.
  const chosenOption =
    isTwoOption && (response === "A" || response === "B")
      ? response === "A"
        ? week.optionA
        : week.optionB
      : null;

  await weekRef.update({
    responses: updatedResponses,
    status: newStatus,
    ...(newStatus === "confirmed" && chosenOption
      ? {
          venueName: chosenOption.venueName,
          venueAddress: chosenOption.venueAddress,
          confirmationText: `${chosenOption.venueName}, ${chosenOption.venueAddress}`,
        }
      : {}),
  });

  if (newStatus === "confirmed") {
    const pairSnap = await adminDb.collection("pairs").doc(pairId).get();
    if (pairSnap.exists) {
      const pair = { id: pairSnap.id, ...pairSnap.data() } as Pair;
      const venueName = chosenOption?.venueName ?? week.venueName;
      const notifyResults = await notifyBothUsers(pair, `Rendez-vous verrouillé : ${venueName}.`);
      await weekRef.update({
        notificationLog: FieldValue.arrayUnion({
          event: "confirmed",
          sentAt: new Date().toISOString(),
          results: notifyResults,
        }),
      });
    }
  }

  return NextResponse.json({ status: newStatus });
}
