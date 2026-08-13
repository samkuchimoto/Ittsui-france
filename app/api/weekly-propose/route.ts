// /app/api/weekly-propose/route.ts
// Triggered by Vercel Cron (see vercel.json) — runs daily, proposes for any
// pair whose agreedDay is today and who doesn't already have a week doc.
//
// AUDIT NOTE — what changed vs. production, and why (Task 4.2, "API
// Independence Pattern"):
//   UNCHANGED: the cron-secret auth check, the daily pairs query (agreedDay
//   == today, status == active, subscriptionStatus in [active, trialing]),
//   the idempotent "already proposed this week" check, the week-doc write
//   shape, and notifyBothUsers() (push -> email fallback) — none of that
//   needed to change for this task.
//
//   CHANGED: venue selection. It used to be a single synchronous Groq call
//   inline in this route, with a "shortlist[0]" fallback on Groq failure.
//   That's now a 3-tier graceful-degradation chain:
//     1. PRIMARY — fetch the precomputed proposal from the Python/Redis RAG
//        service (see /rag-service). This is where the LLM call now lives,
//        run well ahead of time during that service's precompute job, not
//        in this request path.
//     2. FALLBACK, tier 1 — the existing Firestore `venues` shortlist logic
//        (kept, not deleted: a DB that's actually up beats a hardcoded
//        list), picking deterministically instead of via LLM.
//     3. FALLBACK, tier 2 — a fully static, no-DB-dependency catalog. This
//        is the true last resort: it fires if BOTH the RAG service AND
//        Firestore are unavailable, so a Friday proposal still goes out.
//   Tiers 1 and 2 never call an LLM — "deterministic" per the brief.
//   The RAG service call is bounded to 1.5s via AbortController; on
//   timeout, non-200, or a malformed body, this immediately drops to the
//   fallback chain rather than waiting further.

import { NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import type { Pair, User, VenueType } from "@/lib/types";

const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const RAG_TIMEOUT_MS = 1500;

interface VenueCandidate {
  id: string;
  name: string;
  address: string;
  type: VenueType;
  dietaryTags: string[];
  city: string;
}

interface VenueProposal {
  venueName: string;
  venueAddress: string;
  confirmationText: string;
  source: "rag-service" | "firestore-rule-engine" | "static-rule-engine";
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

  const results: { pairId: string; status: string; source?: string }[] = [];

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

    const proposal = await getFridayProposal(pair, weekOf);
    if (!proposal) {
      results.push({ pairId: pair.id, status: "no_venues_available" });
      continue;
    }

    const proposedTime = buildProposedTime(pair.agreedWindowStart);

    await adminDb
      .collection("pairs")
      .doc(pair.id)
      .collection("weeks")
      .doc(weekOf)
      .set({
        pairId: pair.id,
        weekOf,
        venueName: proposal.venueName,
        venueAddress: proposal.venueAddress,
        confirmationText: proposal.confirmationText,
        proposedTime,
        status: "proposed",
        responses: { [pair.userIds[0]]: null, [pair.userIds[1]]: null },
      });

    await notifyBothUsers(pair, proposal.confirmationText);
    results.push({ pairId: pair.id, status: "proposed", source: proposal.source });
  }

  return NextResponse.json({ weekOf, results });
}

// --- API Independence Pattern: RAG service primary, deterministic fallback chain ---

async function getFridayProposal(pair: Pair, weekOf: string): Promise<VenueProposal | null> {
  const fromRag = await tryRagService(pair, weekOf);
  if (fromRag) return fromRag;

  const fromFirestore = await tryFirestoreRuleEngine(pair);
  if (fromFirestore) return fromFirestore;

  return staticRuleEngineFallback(pair);
}

// Tier 1 (primary): the precomputed proposal from the Python/Redis RAG
// service. Bounded to RAG_TIMEOUT_MS — if the service, its Postgres, or
// whatever LLM it calls internally is slow or down, we do not wait past
// that window.
async function tryRagService(pair: Pair, weekOf: string): Promise<VenueProposal | null> {
  const baseUrl = process.env.RAG_SERVICE_URL;
  if (!baseUrl) return null; // not configured — go straight to fallback, don't error the cron run

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/proposals/${pair.id}?week_of=${weekOf}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null; // includes 404 = "not precomputed yet", not an error worth logging loudly

    const data = await res.json();
    if (!data?.venue_name || !data?.venue_address || !data?.confirmation_text) return null;

    return {
      venueName: data.venue_name,
      venueAddress: data.venue_address,
      confirmationText: data.confirmation_text,
      source: "rag-service",
    };
  } catch {
    // Network error, timeout (AbortError), or bad JSON — all treated the
    // same: fall through to the next tier. This route's job is to get a
    // proposal out the door, not to diagnose the RAG service's health.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Tier 2 (fallback): the pre-existing Firestore-backed shortlist, picked
// deterministically (no LLM). Kept because a Firestore lookup that's
// actually up is strictly better than the hardcoded static list below.
async function tryFirestoreRuleEngine(pair: Pair): Promise<VenueProposal | null> {
  try {
    const shortlist = await getShortlist(pair);
    if (shortlist.length === 0) return null;

    const venue = shortlist[0];
    return {
      venueName: venue.name,
      venueAddress: venue.address,
      confirmationText: `${venue.name}, ${dayLabel(pair.agreedDay)} ${pair.agreedWindowStart}`,
      source: "firestore-rule-engine",
    };
  } catch {
    return null; // Firestore itself unavailable — drop to the static tier
  }
}

// Tier 3 (fallback, true last resort): zero external dependencies. This is
// what fires if BOTH the RAG service AND Firestore are unavailable — it's
// what guarantees a Friday proposal still goes out.
const STATIC_CATALOG: Record<VenueType, { name: string; address: string }[]> = {
  cafe: [
    { name: "Café de Flore", address: "172 Bd Saint-Germain, 75006 Paris" },
    { name: "Café de l'Industrie", address: "16 Rue Saint-Sabin, 75011 Paris" },
  ],
  restaurant: [{ name: "Chez Janou", address: "2 Rue Roger Verlomme, 75003 Paris" }],
  park: [{ name: "Jardin du Luxembourg", address: "75006 Paris" }],
  museum: [{ name: "Musée Rodin", address: "77 Rue de Varenne, 75007 Paris" }],
  home: [{ name: "Chez vous", address: "" }],
};

function staticRuleEngineFallback(pair: Pair): VenueProposal {
  const preferredType = pair.preferences.venueTypes[0] ?? "cafe";
  const options = STATIC_CATALOG[preferredType] ?? STATIC_CATALOG.cafe;
  // Deterministic rotation (not random) so re-runs are stable and pairs
  // aren't always handed the exact same fallback spot.
  const index = hashToIndex(`${pair.id}`, options.length);
  const venue = options[index];

  return {
    venueName: venue.name,
    venueAddress: venue.address,
    confirmationText: `${venue.name}, ${dayLabel(pair.agreedDay)} ${pair.agreedWindowStart}`,
    source: "static-rule-engine",
  };
}

// --- Venue shortlist (Firestore-backed, Tier 2 input) ---
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

// Small deterministic string hash -> bounded index. Not cryptographic,
// just needs to distribute pair IDs across the tiny static catalog.
function hashToIndex(input: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % mod;
}
