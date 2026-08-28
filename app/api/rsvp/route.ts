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
import { logEvent } from "@/lib/analytics";
import { dayLabel, notifyBothUsers } from "@/lib/notify";
import { generateWarmConfirmation } from "@/lib/confirmationText";
import type { Pair, VenueOption, Week } from "@/lib/types";

const VALID_RESPONSES = ["yes", "no", "A", "B"] as const;
type ResponseValue = (typeof VALID_RESPONSES)[number];

const bodySchema = z.object({
  pairId: z.string().min(1),
  weekId: z.string().min(1),
  userId: z.string().min(1),
  response: z.enum(VALID_RESPONSES),
});

type TxOutcome =
  | { ok: false; error: string; status: number }
  | { ok: true; newStatus: Week["status"]; chosenOption: VenueOption | null; week: Week; justResolved: boolean };

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { pairId, weekId, userId, response } = parsed.data;

  const weekRef = adminDb.collection("pairs").doc(pairId).collection("weeks").doc(weekId);

  // Read-decide-write, wrapped in a transaction — NOT the plain get()-then-
  // later-update() this used to be. Found directly in testing: two people
  // tapping "Oui" near-simultaneously (genuinely the single most likely
  // real-world moment for this exact app, since both partners often open
  // the Friday card right when the push notification lands) would each
  // read a stale copy of the other's still-null response. Firestore's
  // plain update() REPLACES the whole `responses` map rather than merging
  // it, so whichever write landed second silently overwrote the other's
  // "yes" — the week would never confirm, and both people would be stuck
  // on "En attente de l'autre personne..." forever, with no error. A
  // transaction re-reads the freshest doc and auto-retries on contention,
  // which closes this race entirely: only the request that actually
  // witnesses both responses present will ever see newStatus "confirmed".
  //
  // The AI confirmation-text call and notifyBothUsers() deliberately stay
  // OUTSIDE the transaction below — external calls inside a Firestore
  // transaction risk running multiple times if the transaction retries
  // under contention, which would turn "closed one bug" into "introduced
  // a duplicate-notification bug."
  const outcome = await adminDb.runTransaction<TxOutcome>(async (tx) => {
    const weekSnap = await tx.get(weekRef);
    if (!weekSnap.exists) {
      return { ok: false, error: "week not found", status: 404 };
    }
    const week = weekSnap.data() as Week;

    if (week.status !== "proposed") {
      // Already locked or cancelled — taps after that don't change anything
      return { ok: true, newStatus: week.status, chosenOption: null, week, justResolved: false };
    }

    if (!(userId in week.responses)) {
      return { ok: false, error: "user not part of this pair", status: 403 };
    }

    // A two-option week only accepts "A"/"B"/"no"; a single-option week
    // only accepts "yes"/"no" — prevents voting for an option that isn't there.
    const isTwoOption = Boolean(week.optionB);
    const accepted: ResponseValue[] = isTwoOption ? ["A", "B", "no"] : ["yes", "no"];
    if (!accepted.includes(response)) {
      return { ok: false, error: "invalid response for this proposal", status: 400 };
    }

    const updatedResponses = { ...week.responses, [userId]: response };
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

    // On confirm, the Week doc's own venueName/address need to reflect
    // whichever option was actually chosen — they were written once at
    // proposal time mirroring optionA, which would be wrong to leave in
    // place if the pair ended up locking optionB instead. confirmationText
    // is intentionally NOT set here — the warm rewrite needs an external
    // call, done after the transaction commits (see below); this write
    // uses the tier's own flat template as an interim value so the field
    // is never left stale in the moment between commit and that follow-up.
    const chosenOption: VenueOption | null =
      isTwoOption && (response === "A" || response === "B")
        ? response === "A"
          ? (week.optionA ?? null)
          : (week.optionB ?? null)
        : null;

    tx.update(weekRef, {
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

    return { ok: true, newStatus, chosenOption, week: { ...week, responses: updatedResponses }, justResolved: true };
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  const { newStatus, chosenOption, week, justResolved } = outcome;
  if (justResolved) logEvent("rsvp_response", { pairId, weekId, response, newStatus });

  if (newStatus !== "confirmed") {
    return NextResponse.json({ status: newStatus });
  }

  if (justResolved) logEvent("week_confirmed", { pairId, weekId });

  // From here on, only the one request that actually witnessed the
  // transition to "confirmed" reaches this point — the transaction above
  // already guarantees that, so no risk of a duplicate notification send
  // even if both people's taps arrived within milliseconds of each other.
  const pairSnap = await adminDb.collection("pairs").doc(pairId).get();
  const pair = pairSnap.exists ? ({ id: pairSnap.id, ...pairSnap.data() } as Pair) : null;
  if (!pair) {
    return NextResponse.json({ status: newStatus });
  }

  // Best-effort warmth pass, same pattern as weekly-propose/route.ts: only
  // needed here because a two-option confirm otherwise leaves
  // confirmationText as the flat "venueName, address" template written by
  // the transaction above — a single-option week's already-warm
  // proposal-time text is left alone (chosenOption is null in that case).
  // No streak lookup here (unlike weekly-propose) — this is a synchronous,
  // interactive tap a real person is waiting on, not a background cron
  // job, so it isn't worth the extra Firestore read.
  //
  // Known tradeoff, accepted rather than unexamined: generateWarmConfirmation
  // now tries Mistral (5s timeout) then Groq (3s timeout) before falling
  // back to the plain template, so a double-failure here — both vendors
  // down or out of quota at once — means up to ~8s before this resolves,
  // not the ~3s ceiling this endpoint had when it only called Groq. Left
  // as-is rather than adding a shorter, interactive-specific timeout:
  // DashboardClient.tsx already shows a loading state (setResponding) for
  // the whole request, so this degrades to a longer wait, never a frozen
  // UI, and a simultaneous double-vendor failure is rare.
  if (chosenOption) {
    const warmConfirmedText = await generateWarmConfirmation({
      venueName: chosenOption.venueName,
      day: dayLabel(pair.agreedDay),
      time: pair.agreedWindowStart,
      partnerName: pair.partnerName,
      streakCount: null,
      weatherSwapNote: null,
    });
    if (warmConfirmedText) {
      await weekRef.update({ confirmationText: warmConfirmedText });
    }
  }

  const venueName = chosenOption?.venueName ?? week.venueName;
  const notifyResults = await notifyBothUsers(pair, `Rendez-vous verrouillé : ${venueName}.`);
  await weekRef.update({
    notificationLog: FieldValue.arrayUnion({
      event: "confirmed",
      sentAt: new Date().toISOString(),
      results: notifyResults,
    }),
  });

  return NextResponse.json({ status: newStatus });
}
