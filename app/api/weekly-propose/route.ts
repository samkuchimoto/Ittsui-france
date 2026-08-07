// /app/api/weekly-propose/route.ts
// Triggered by Vercel Cron (see vercel.json) — runs daily, proposes for any
// pair whose agreedDay is today and who doesn't already have a week doc.
//
// Flow: pull due pairs → get venue shortlist → Groq picks one + writes the
// one-line confirmation → write week doc → send push (fallback: email).
// If Groq fails, fall back to the shortlist's first entry — no LLM call
// blocks the flow.

import { NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import type { Pair, User, VenueType } from "@/lib/types";

const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface VenueCandidate {
  id: string;
  name: string;
  address: string;
  type: VenueType;
  dietaryTags: string[];
  city: string;
}

export async function GET(request: Request) {
  // Simple shared-secret check so this can't be triggered by randoms
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = DAY_MAP[new Date().getDay()];
  const weekOf = getMondayISO(new Date());

  const pairsSnap = await adminDb
    .collection("pairs")
    .where("agreedDay", "==", today)
    .where("status", "==", "active") // skip pending/declined/expired invites
    .where("subscriptionStatus", "in", ["active", "trialing"])
    .get();

  const results: { pairId: string; status: string }[] = [];

  for (const pairDoc of pairsSnap.docs) {
    const pair = { id: pairDoc.id, ...pairDoc.data() } as Pair;

    // Skip if this week's proposal already exists (idempotent re-runs)
    const existing = await adminDb
      .collection("pairs")
      .doc(pair.id)
      .collection("weeks")
      .doc(weekOf)
      .get();
    if (existing.exists) {
      results.push({ pairId: pair.id, status: "already_proposed" });
      continue;
    }

    const shortlist = await getShortlist(pair);
    if (shortlist.length === 0) {
      results.push({ pairId: pair.id, status: "no_venues_available" });
      continue;
    }

    const { venue, confirmationText } = await pickVenue(pair, shortlist);

    const proposedTime = buildProposedTime(pair.agreedWindowStart);

    await adminDb
      .collection("pairs")
      .doc(pair.id)
      .collection("weeks")
      .doc(weekOf)
      .set({
        pairId: pair.id,
        weekOf,
        venueName: venue.name,
        venueAddress: venue.address,
        confirmationText,
        proposedTime,
        status: "proposed",
        responses: { [pair.userIds[0]]: null, [pair.userIds[1]]: null },
      });

    await notifyBothUsers(pair, confirmationText);
    results.push({ pairId: pair.id, status: "proposed" });
  }

  return NextResponse.json({ weekOf, results });
}

// --- Venue shortlist (Phase 1: curated Firestore list, filtered) ---
async function getShortlist(pair: Pair): Promise<VenueCandidate[]> {
  const { venueTypes, dietaryFilters } = pair.preferences;
  const query = adminDb.collection("venues").where("type", "in", venueTypes);

  const snap = await query.get();
  let candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VenueCandidate);

  // Filter by dietary tags only if the pair has filters set and the venue type needs it
  if (dietaryFilters.length > 0) {
    candidates = candidates.filter(
      (v) =>
        v.type === "home" || // home needs no dietary matching
        v.type === "park" || // park has no menu
        dietaryFilters.some((f) => v.dietaryTags.includes(f))
    );
  }

  return candidates;
}

// --- Groq call: one-shot pick + confirmation line, with non-LLM fallback ---
async function pickVenue(
  pair: Pair,
  shortlist: VenueCandidate[]
): Promise<{ venue: VenueCandidate; confirmationText: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content:
              'You pick exactly one venue from a given list and write one short French confirmation line. Respond ONLY as JSON: {"venueId": string, "confirmationText": string}. No markdown, no preamble.',
          },
          {
            role: "user",
            content: `Day: ${pair.agreedDay}, window: ${pair.agreedWindowStart}-${pair.agreedWindowEnd}. Shortlist: ${JSON.stringify(
              shortlist.map((v) => ({ id: v.id, name: v.name, type: v.type }))
            )}`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const venue = shortlist.find((v) => v.id === parsed.venueId) ?? shortlist[0];
    return { venue, confirmationText: parsed.confirmationText };
  } catch {
    // Fallback: no LLM call at all, just take the top of the shortlist
    const venue = shortlist[0];
    return {
      venue,
      confirmationText: `${venue.name}, ${dayLabel(pair.agreedDay)} ${pair.agreedWindowStart}`,
    };
  }
}

// --- Notification: FCM push, falling back to Resend email ---
async function notifyBothUsers(pair: Pair, confirmationText: string) {
  for (const userId of pair.userIds) {
    const userSnap = await adminDb.collection("users").doc(userId).get();
    if (!userSnap.exists) continue;
    const user = userSnap.data() as User;

    if (user.notificationPrefs.pushEnabled && user.pushToken) {
      try {
        await adminMessaging.send({
          token: user.pushToken,
          notification: { title: "Ittsui", body: confirmationText },
        });
        continue;
      } catch {
        // fall through to email
      }
    }

    if (user.notificationPrefs.emailEnabled) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Ittsui <hello@ittsui.fr>",
          to: user.email,
          subject: "Votre rendez-vous de la semaine",
          text: confirmationText,
        }),
      });
    }
  }
}

// --- helpers ---
function getMondayISO(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function buildProposedTime(windowStart: string): string {
  const [h, m] = windowStart.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function dayLabel(day: Pair["agreedDay"]): string {
  const labels: Record<Pair["agreedDay"], string> = {
    mon: "lundi",
    tue: "mardi",
    wed: "mercredi",
    thu: "jeudi",
    fri: "vendredi",
    sat: "samedi",
    sun: "dimanche",
  };
  return labels[day];
}
