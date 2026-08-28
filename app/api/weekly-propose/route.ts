// /app/api/weekly-propose/route.ts
// Triggered by Vercel Cron (see vercel.json) — runs daily, proposes for any
// pair whose weekly notification is due today and who doesn't already have
// a week doc.
//
// AUDIT NOTE — what changed vs. production, and why (Task 4.2, "API
// Independence Pattern"):
//   UNCHANGED: the cron-secret auth check, the idempotent "already proposed
//   this week" check, and notifyBothUsers() (push -> email fallback, moved
//   to lib/notify.ts so rsvp/route.ts can reuse it unchanged).
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
//   Tiers 2 and 3 now return up to TWO real candidates (optionA/optionB)
//   instead of one, when the underlying source actually has two distinct
//   ones — no fabricated second option. Tier 1 (RAG) still returns one,
//   since the service's own HTTP contract wasn't changed here.
//
//   ALSO CHANGED: the pairs query no longer filters on agreedDay == today.
//   Pair.notifyDaysBefore (new, optional field) lets the notification fire
//   ahead of the meeting day itself (e.g. Thursday notify for a Saturday
//   meeting), so "is this pair due today" is now computed per-pair via
//   isDueToday() instead of expressed as a single Firestore equality
//   filter — see that function for why.
//
//   ALSO CHANGED: venue selection is now postal-code-aware. Tier 2
//   (Firestore) soft-prefers venues whose city matches the pair's metro,
//   without dropping anything. Tier 3 (static) routes park/museum to real
//   landmarks in 5 major metros (Paris, Marseille, Lyon, Lille, Bordeaux)
//   — deliberately limited to large, long-standing public institutions,
//   not small businesses whose current address isn't something to guess
//   at. Cafe/restaurant stay Paris-only for the same reason; "home" always
//   resolves everywhere. This is an honest partial step toward nationwide
//   coverage, not the finished thing — see departmentFromPostalCode().
//
//   ALSO CHANGED (2026-08-24): confirmation text gets a best-effort warmth
//   pass via lib/groq.ts, but ONLY for tiers 2/3 — the RAG tier already
//   returns its own LLM-authored text from that service's precompute job,
//   so this doesn't double up on it. This is a direct, interim Groq call
//   (GROQ_API_KEY was sitting configured and unused since the RAG-service
//   refactor moved the old inline call out of this route entirely) — it
//   rewrites the ALREADY-DETERMINISTICALLY-CHOSEN venue's confirmation
//   line into something warmer, it never influences which venue gets
//   picked. Bounded and best-effort like everything else here: on any
//   failure or timeout, the existing deterministic template string is used
//   unchanged, so this can never be the reason a Friday proposal doesn't
//   go out.
//
//   ALSO CHANGED (2026-08-24): a real-weather pass, applied BEFORE tiers
//   2/3 pick a venue, not after. If Open-Meteo (lib/weather.ts) reports
//   rain likely for the pair's metro on the actual meeting date, and
//   "park" is one of this pair's preferences, park is dropped from the
//   preference list for this run only — the existing preference-walk logic
//   in both tiers then naturally lands on whatever's next (or "cafe" as
//   its own existing default, unchanged). This is deliberately a filter on
//   the INPUT to the existing deterministic selection, not a new selection
//   path of its own — the venue-picking logic itself never changes. The
//   weather call is best-effort like the RAG tier: timeout, network error,
//   an unsupported metro, or a forecast date too far out all resolve to
//   "no signal," and the pair's original preferences are used exactly as
//   before this existed.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { logEvent } from "@/lib/analytics";
import { dayLabel, notifyBothUsers } from "@/lib/notify";
import { generateWarmConfirmation } from "@/lib/confirmationText";
import { getWeatherSignal } from "@/lib/weather";
import type { Pair, VenueOption, VenueType } from "@/lib/types";
import { type Metro, departmentFromPostalCode, STATIC_CATALOG } from "@/lib/venueCatalog";
import { parisNow, parisMondayISO, parisWallClockToUTCISOString, WEEKDAYS } from "@/lib/timezone";

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
  optionA: VenueOption;
  optionB?: VenueOption; // present only when a second distinct real candidate existed
  confirmationText: string;
  source: "rag-service" | "firestore-rule-engine" | "static-rule-engine";
}

export async function GET(request: Request) {
  // Simple shared-secret check so this can't be triggered by randoms
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Vercel's serverless functions run with TZ=UTC — new Date().getDay() and
  // a bare getMondayISO(new Date()) would compute the wrong weekday/week
  // whenever it's already tomorrow in Paris but not yet in UTC (or vice
  // versa). Safe by coincidence under this route's current fixed 06:00 UTC
  // cron schedule (vercel.json) since that's mid-morning in Paris either
  // way, but this is also a bearer-token-gated GET endpoint that could be
  // triggered manually at any real-world moment, so it shouldn't depend on
  // the schedule staying exactly as-is to stay correct.
  const today = parisNow().weekday;
  const weekOf = parisMondayISO();

  const pairsSnap = await adminDb
    .collection("pairs")
    .where("status", "==", "active") // skip pending/declined/expired invites
    .where("subscriptionStatus", "in", ["active", "trialing"])
    .get();

  const results: { pairId: string; status: string; source?: string; weatherSwapped?: boolean }[] = [];

  for (const pairDoc of pairsSnap.docs) {
    const pair = { id: pairDoc.id, ...pairDoc.data() } as Pair;

    if (pair.paused) {
      results.push({ pairId: pair.id, status: "paused" });
      continue;
    }

    if (!isDueToday(pair, today)) continue;

    // Checked BEFORE isCadenceDue on purpose: for a monthly/yearly pair, a
    // same-day retry would otherwise see its own just-written week as the
    // "most recent" one and get silently skipped with no entry in
    // `results` at all (elapsed days since itself is 0, well under the
    // cadence threshold) — correct in effect (no duplicate), but
    // inconsistent with how a weekly pair's retry is reported. Checking
    // the cheap direct doc lookup first means every pair gets the same
    // "already_proposed" outcome on a retry, and it also skips the extra
    // isCadenceDue query entirely in that case.
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

    if (!(await isCadenceDue(pair, weekOf))) continue;

    const { pair: weatherPair, swapNote } = await weatherAdjustPair(pair, weekOf);

    const proposal = await getFridayProposal(weatherPair, weekOf);
    if (!proposal) {
      results.push({ pairId: pair.id, status: "no_venues_available" });
      continue;
    }

    // Plus-only supplement (2026-08-28): a real, buildable benefit that
    // doesn't touch the "one proposal, one decision" surface at all — it
    // just makes the existing swap-to-an-alternative mechanic (already
    // fully built, see optionB/rsvp.ts) reliably available instead of
    // whatever tiers 1-3 happened to find. Only ever fills in optionB when
    // every other tier already produced optionA but genuinely had no
    // second candidate (the static catalog often has just one entry per
    // metro/type) — never touches optionA, never runs for a non-Plus pair,
    // never blocks the proposal on failure.
    if (pair.subscriptionStatus === "active" && !proposal.optionB && proposal.optionA.venueType) {
      const extra = await tryFreeVenueApiForOptionB(pair, proposal.optionA.venueType, proposal.optionA.venueName);
      if (extra) proposal.optionB = extra;
    }

    const confirmationText =
      proposal.source === "rag-service" ? proposal.confirmationText : await withWarmConfirmation(pair, proposal, swapNote);

    const proposedTime = buildProposedTime(pair.agreedWindowStart);

    const weekRef = adminDb.collection("pairs").doc(pair.id).collection("weeks").doc(weekOf);

    await weekRef.set({
      pairId: pair.id,
      weekOf,
      venueName: proposal.optionA.venueName,
      venueAddress: proposal.optionA.venueAddress,
      confirmationText,
      proposedTime,
      status: "proposed",
      responses: { [pair.userIds[0]]: null, [pair.userIds[1]]: null },
      optionA: proposal.optionA,
      ...(proposal.optionB ? { optionB: proposal.optionB } : {}),
    });

    const notifyResults = await notifyBothUsers(pair, confirmationText);
    await weekRef.update({
      notificationLog: [{ event: "proposed", sentAt: new Date().toISOString(), results: notifyResults }],
    });
    results.push({ pairId: pair.id, status: "proposed", source: proposal.source, weatherSwapped: Boolean(swapNote) });
    logEvent("proposal_shown", { pairId: pair.id, source: proposal.source, hasOptionB: Boolean(proposal.optionB) });
  }

  return NextResponse.json({ weekOf, results });
}

// A pair is due for its weekly notification today if today's weekday is
// exactly notifyDaysBefore days ahead of agreedDay. notifyDaysBefore
// defaults to 0 (same day) — every pair created before this field existed
// keeps its exact current behavior unchanged.
function isDueToday(pair: Pair, today: (typeof WEEKDAYS)[number]): boolean {
  const leadDays = pair.notifyDaysBefore ?? 0;
  const meetingIndex = WEEKDAYS.indexOf(pair.agreedDay);
  // Double-modulo, not a single "+7" correction: found directly in testing
  // that leadDays >= 14 makes (meetingIndex - leadDays + 7) go negative
  // again, producing a negative array index -> WEEKDAYS[notifyIndex] is
  // undefined -> this pair's weekly proposal silently never fires again,
  // permanently. invite-partner/route.ts's Zod schema now caps
  // notifyDaysBefore at 6, but this is the function whose failure mode is
  // catastrophic (breaks the entire product loop with no error anywhere)
  // — worth being correct on its own regardless of what validates the
  // input upstream, not dependent on a single point of defense.
  const notifyIndex = (((meetingIndex - leadDays) % WEEKDAYS.length) + WEEKDAYS.length) % WEEKDAYS.length;
  return WEEKDAYS[notifyIndex] === today;
}

// isDueToday() alone only ever answers "is today this pair's normal
// meeting weekday" — for a weekly pair (the default, and every pair
// created before Pair.cadence existed) that's the whole answer, unchanged.
// For monthly/yearly, it's necessary but not sufficient: this pair's
// weekday comes around every week regardless of cadence, so most of those
// weekly matches need to be skipped. Checked against the most recent
// existing week doc rather than a stored "next due" date, so cadence can
// change later without needing a migration — it just changes how far back
// the interval check looks starting from the next run.
// No existing week doc at all -> always due, regardless of cadence, so a
// brand-new monthly/yearly pair still gets its first proposal right away
// instead of waiting out a full cycle first.
const CADENCE_MIN_DAYS: Record<NonNullable<Pair["cadence"]>, number> = {
  weekly: 0,
  monthly: 21, // skip 3 weekly opportunities, fire on the 4th (~28 days)
  yearly: 357, // skip 50, fire on the 52nd (~364 days)
};

async function isCadenceDue(pair: Pair, weekOf: string): Promise<boolean> {
  const cadence = pair.cadence ?? "weekly";
  const minDays = CADENCE_MIN_DAYS[cadence];
  if (minDays === 0) return true;

  const lastWeekSnap = await adminDb
    .collection("pairs")
    .doc(pair.id)
    .collection("weeks")
    .orderBy("weekOf", "desc")
    .limit(1)
    .get();
  if (lastWeekSnap.empty) return true;

  const lastWeekOf = lastWeekSnap.docs[0].data().weekOf as string;
  const elapsedDays = Math.round((new Date(weekOf).getTime() - new Date(lastWeekOf).getTime()) / (24 * 60 * 60 * 1000));
  return elapsedDays >= minDays;
}

// Best-effort warmth pass over an already-deterministically-chosen venue's
// confirmation text (tiers 2/3 only — see AUDIT NOTE above). Falls back to
// the tier's own template string on any failure, so this never blocks or
// alters a proposal, only its wording.
async function withWarmConfirmation(pair: Pair, proposal: VenueProposal, weatherSwapNote: string | null): Promise<string> {
  const streakCount = await getConfirmedStreakCount(pair.id);
  const warm = await generateWarmConfirmation({
    venueName: proposal.optionA.venueName,
    day: dayLabel(pair.agreedDay),
    time: pair.agreedWindowStart,
    partnerName: pair.partnerName,
    streakCount,
    cadence: pair.cadence ?? "weekly",
    weatherSwapNote,
  });
  return warm ?? proposal.confirmationText;
}

// Filters "park" out of a pair's venue-type preferences, for this run
// only, when rain is actually likely on their actual meeting date — never
// mutates the stored Pair doc. Returns the ORIGINAL pair unchanged (and a
// null swapNote) whenever weather is unavailable, park isn't even one of
// this pair's preferences, or rain isn't likely — so the vast majority of
// calls are a single skipped fetch, not a wasted one: the weather lookup
// itself is only attempted when park is actually in play.
async function weatherAdjustPair(pair: Pair, weekOf: string): Promise<{ pair: Pair; swapNote: string | null }> {
  if (!pair.preferences.venueTypes.includes("park")) return { pair, swapNote: null };

  const metro = departmentFromPostalCode(pair.postalCode) ?? "paris";
  const weather = await getWeatherSignal(metro, weekOf, pair.agreedDay);
  if (!weather || !weather.rainLikely) return { pair, swapNote: null };

  const adjustedTypes = pair.preferences.venueTypes.filter((t) => t !== "park");
  return {
    pair: {
      ...pair,
      preferences: {
        ...pair.preferences,
        venueTypes: adjustedTypes.length ? adjustedTypes : (["cafe"] as VenueType[]),
      },
    },
    swapNote: "pluie probable, une option en intérieur a été proposée à la place",
  };
}

// How many past weeks this pair has actually confirmed — used only to give
// the warm confirmation line real context to reference (e.g. "12 semaines
// déjà partagées"), never shown as its own streak/counter UI (see AGENTS.md
// on avoiding dependency-loop mechanics). Best-effort: a Firestore error
// here just means the line is generated without that context, not that the
// whole proposal fails.
async function getConfirmedStreakCount(pairId: string): Promise<number | null> {
  try {
    const snap = await adminDb
      .collection("pairs")
      .doc(pairId)
      .collection("weeks")
      .where("status", "==", "confirmed")
      .count()
      .get();
    return snap.data().count;
  } catch {
    return null;
  }
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

    // The RAG service's own HTTP contract (see rag-service/main.py) only
    // returns one venue per proposal — not extended here to a second
    // option, since that service is a scaffold with RAG_SERVICE_URL unset
    // in production (this tier never actually fires today).
    return {
      optionA: {
        venueId: data.venue_id ?? `rag-${pair.id}`,
        venueName: data.venue_name,
        venueAddress: data.venue_address,
      },
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

    const venueA = shortlist[0];
    const venueB = shortlist[1]; // undefined if the shortlist only had one candidate — not faked
    return {
      optionA: { venueId: venueA.id, venueName: venueA.name, venueAddress: venueA.address, venueType: venueA.type },
      optionB: venueB
        ? { venueId: venueB.id, venueName: venueB.name, venueAddress: venueB.address, venueType: venueB.type }
        : undefined,
      confirmationText: `${venueA.name}, ${dayLabel(pair.agreedDay)} ${pair.agreedWindowStart}`,
      source: "firestore-rule-engine",
    };
  } catch {
    return null; // Firestore itself unavailable — drop to the static tier
  }
}

// Tier 3 (fallback, true last resort): zero external dependencies. This is
// what fires if BOTH the RAG service AND Firestore are unavailable — it's
// what guarantees a Friday proposal still goes out. Metro/postal-code
// routing and the venue catalog itself live in lib/venueCatalog.ts, shared
// with the setup wizard's one-tap CTA preview (SetupClient.tsx) so both
// read the exact same curated data.
const HOME_FALLBACK = { name: "Chez vous", address: "" };

function staticRuleEngineFallback(pair: Pair): VenueProposal {
  const metro = departmentFromPostalCode(pair.postalCode) ?? "paris";
  const catalog = STATIC_CATALOG[metro];
  const preferences = pair.preferences.venueTypes.length ? pair.preferences.venueTypes : (["cafe"] as VenueType[]);
  const hasDietaryFilter = pair.preferences.dietaryFilters.length > 0;

  // Walk the pair's preferences in order and take the first one that
  // actually has real coverage in their metro. "home" always resolves. If
  // nothing in their metro matches any preference, "home" is the honest
  // last resort — everywhere in France — rather than quietly substituting
  // a Paris address for someone in Lyon, or fabricating a venue.
  //
  // Cafe/restaurant are skipped entirely when a dietary filter is set:
  // STATIC_CATALOG has no dietaryTags (unlike Tier 2's Firestore venues,
  // see getShortlist() above), so there's no honest way to know whether
  // "Café de Flore" is actually casher/halal/etc. — recommending it
  // anyway would silently ignore the filter someone deliberately set,
  // exactly the bug this fixes. Park/museum stay eligible even with a
  // filter active, same exemption getShortlist() already applies ("park
  // has no menu"). This was a real, confirmed gap: whenever a proposal
  // fell through to this tier (no RAG service, no matching seeded
  // Firestore venue), a dietary filter was silently doing nothing.
  let options: { name: string; address: string }[] = [HOME_FALLBACK];
  let resolvedType: VenueType = "home";
  for (const type of preferences) {
    if (type === "home") {
      options = [HOME_FALLBACK];
      resolvedType = "home";
      break;
    }
    if (hasDietaryFilter && (type === "cafe" || type === "restaurant")) continue;
    const forType = catalog[type];
    if (forType?.length) {
      options = forType;
      resolvedType = type;
      break;
    }
  }

  // Deterministic rotation (not random) so re-runs are stable and pairs
  // aren't always handed the exact same fallback spot.
  const indexA = hashToIndex(`${pair.id}`, options.length);
  const indexB = options.length > 1 ? (indexA + 1) % options.length : null;
  const venueA = options[indexA];
  const venueB = indexB !== null ? options[indexB] : null;

  return {
    optionA: {
      venueId: `static-${metro}-${resolvedType}-${indexA}`,
      venueName: venueA.name,
      venueAddress: venueA.address,
      venueType: resolvedType,
    },
    optionB:
      venueB && indexB !== null
        ? {
            venueId: `static-${metro}-${resolvedType}-${indexB}`,
            venueName: venueB.name,
            venueAddress: venueB.address,
            venueType: resolvedType,
          }
        : undefined,
    confirmationText: `${venueA.name}, ${dayLabel(pair.agreedDay)} ${pair.agreedWindowStart}`,
    source: "static-rule-engine",
  };
}

// --- Plus-only optionB supplement (free, no API key) ---
// OpenStreetMap's Nominatim (geocoding) and Overpass (place search) APIs
// are both free and require no API key or account — only a descriptive
// User-Agent per each project's usage policy, which this sends. This
// route runs once/day per due pair via cron, and this path only fires for
// Plus pairs still missing optionB after every other tier, so real
// request volume is nowhere near either service's rate limits.
const OSM_AMENITY_TAG: Partial<Record<VenueType, string>> = {
  cafe: "amenity=cafe",
  restaurant: "amenity=restaurant",
  park: "leisure=park",
  museum: "tourism=museum",
};
const FREE_VENUE_API_TIMEOUT_MS = 2500;

async function tryFreeVenueApiForOptionB(
  pair: Pair,
  venueType: VenueType,
  excludeName: string
): Promise<VenueOption | undefined> {
  const amenityTag = OSM_AMENITY_TAG[venueType];
  if (!amenityTag || !pair.postalCode) return undefined; // "home" has nothing to search for

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FREE_VENUE_API_TIMEOUT_MS);
  const userAgent = "Ittsui/1.0 (+https://www.ittsui.fr; hello@ittsui.fr)";

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pair.postalCode)}&country=France&format=json&limit=1`,
      { signal: controller.signal, headers: { "User-Agent": userAgent } }
    );
    if (!geoRes.ok) return undefined;
    const geoData: unknown = await geoRes.json();
    const first = Array.isArray(geoData) ? geoData[0] : undefined;
    const lat = first?.lat;
    const lon = first?.lon;
    if (!lat || !lon) return undefined;

    const overpassQuery = `[out:json][timeout:2];node(around:1500,${lat},${lon})[${amenityTag}];out 5;`;
    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
      signal: controller.signal,
      headers: { "User-Agent": userAgent, "Content-Type": "text/plain" },
    });
    if (!overpassRes.ok) return undefined;
    const overpassData: { elements?: { type: string; id: number; tags?: Record<string, string> }[] } = await overpassRes.json();

    const match = (overpassData.elements ?? []).find((el) => el.tags?.name && el.tags.name !== excludeName);
    if (!match?.tags?.name) return undefined;

    const addressParts = [match.tags["addr:housenumber"], match.tags["addr:street"], match.tags["addr:postcode"], match.tags["addr:city"]]
      .filter(Boolean)
      .join(" ");

    return {
      venueId: `osm-${match.type}-${match.id}`,
      venueName: match.tags.name,
      venueAddress: addressParts || pair.postalCode,
      venueType,
    };
  } catch {
    // Network error, timeout, or unexpected response shape — same posture
    // as every other tier in this file: optionB just stays undefined,
    // exactly as it already was before this existed. Never worth logging
    // loudly for a best-effort supplement that isn't even part of the
    // real guarantee (tiers 1-3 already produced optionA regardless).
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

const METRO_CITY_NAMES: Record<Metro, string> = {
  paris: "paris",
  marseille: "marseille",
  lyon: "lyon",
  lille: "lille",
  bordeaux: "bordeaux",
};

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

  // Soft preference, not a filter: if a metro is known from the postal
  // code, candidates in that city sort first — but nothing is dropped, so
  // a Firestore venues collection that's actually been seeded still wins
  // over the static tier regardless of city coverage.
  const metro = departmentFromPostalCode(pair.postalCode);
  if (metro) {
    const cityName = METRO_CITY_NAMES[metro];
    candidates = [...candidates].sort((a, b) => {
      const aMatch = a.city?.toLowerCase() === cityName ? 0 : 1;
      const bMatch = b.city?.toLowerCase() === cityName ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  return candidates;
}

// --- helpers ---

// Was: new Date() + setHours(h, m) — sets the SERVER's local hour (UTC on
// Vercel), not Paris's. A pair configured for "15:00" (meant as 15h Paris
// time) was being stored as if the meeting happened at 17:00 Paris time in
// summer (CEST, UTC+2) — verified concretely, not assumed: this exact
// input/output pair was reproduced under TZ=UTC before this fix.
function buildProposedTime(windowStart: string): string {
  return parisWallClockToUTCISOString(windowStart);
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
