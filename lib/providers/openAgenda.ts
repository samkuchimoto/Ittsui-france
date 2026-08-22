// /lib/providers/openAgenda.ts
// Real OpenAgenda v2 client — endpoint, auth mechanism, and response field
// names verified against their live docs (developers.openagenda.com) on
// 2026-08-22, not written from memory. Gated behind OPENAGENDA_API_KEY,
// same pattern as every other optional integration in this codebase
// (Fal.ai, Resend): returns [] when unset, so this is fully inert and
// changes nothing about current behavior until a key is added.
//
// STATUS: VERIFIED 2026-08-22 against the real API with a real key —
// confirmed 200 OK on both /agendas/{uid} and /agendas/{uid}/events, auth
// and query params all correct. Real response is currently 0 events
// because the agenda ("Ittsui France", uid 5862128) was created the same
// day this was tested and has nothing published to it yet — that's the
// agenda being empty, not this client being broken. Re-run
// scripts/test-openagenda.mjs (if kept) or the equivalent fetch once
// events exist to see real results.
//
// Not yet wired into app/api/weekly-propose/route.ts's existing 3-tier
// chain (RAG service -> Firestore -> static catalog) — that chain is live
// and tested; adding a tier that always returns [] right now wouldn't
// change production behavior anyway. To activate once the agenda actually
// has events: call searchOpenAgendaEvents() as a new first tier in
// fetchVenueProposal(), same shape as the existing tiers (return null on
// empty/failure to fall through).

interface OpenAgendaTiming {
  begin: string; // ISO datetime
  end: string;
}

interface OpenAgendaLocation {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface OpenAgendaEvent {
  uid: number;
  title: string;
  description?: string;
  timings: OpenAgendaTiming[];
  location?: OpenAgendaLocation;
}

const OPENAGENDA_BASE = "https://api.openagenda.com/v2";
const TIMEOUT_MS = 1500; // matches RAG_TIMEOUT_MS in weekly-propose/route.ts

// The account's own agenda (calendar) — OPENAGENDA_API_KEY is a public
// (read-only) key scoped to this agenda's owner account, obtained
// 2026-08-22. Callers can still pass a different agendaUid explicitly.
export const DEFAULT_AGENDA_UID = "5862128";

// title/description come back as multilingual objects (e.g. { fr: "...",
// en: "..." }) per OpenAgenda's docs — this app is French-only, so this
// always prefers "fr" and falls back to whatever key exists rather than
// assuming "fr" is always present.
function pickFrench(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, string>;
    return obj.fr ?? Object.values(obj)[0];
  }
  return undefined;
}

export async function searchOpenAgendaEvents(params: {
  agendaUid?: string; // defaults to DEFAULT_AGENDA_UID; override to query a different agenda
  city?: string; // soft filter, applied client-side below — no confirmed geo/postal-code query param in their docs as of this verification pass
  fromISO?: string;
  toISO?: string;
  keyword?: string;
  size?: number;
}): Promise<OpenAgendaEvent[]> {
  const apiKey = process.env.OPENAGENDA_API_KEY;
  if (!apiKey) return [];

  const agendaUid = params.agendaUid ?? DEFAULT_AGENDA_UID;
  const qs = new URLSearchParams();
  if (params.fromISO) qs.set("timings[gte]", params.fromISO);
  if (params.toISO) qs.set("timings[lte]", params.toISO);
  if (params.keyword) qs.set("search", params.keyword);
  qs.set("size", String(params.size ?? 10));
  qs.set("sort", "timings.asc");
  qs.set("detailed", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OPENAGENDA_BASE}/agendas/${agendaUid}/events?${qs}`, {
      headers: { key: apiKey },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawEvents: Record<string, unknown>[] = data.events ?? [];

    const events: OpenAgendaEvent[] = rawEvents.map((e) => ({
      uid: e.uid as number,
      title: pickFrench(e.title) ?? "",
      description: pickFrench(e.description),
      timings: (e.timings as OpenAgendaTiming[]) ?? [],
      location: e.location as OpenAgendaLocation | undefined,
    }));

    if (params.city) {
      return events.filter((e) => e.location?.city?.toLowerCase() === params.city!.toLowerCase());
    }
    return events;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
