// /lib/providers/openAgenda.ts
// Real OpenAgenda v2 client — endpoint, auth mechanism, and response field
// names verified against their live docs (developers.openagenda.com) on
// 2026-08-22, not written from memory. Gated behind OPENAGENDA_API_KEY,
// same pattern as every other optional integration in this codebase
// (Fal.ai, Resend): returns [] when unset, so this is fully inert and
// changes nothing about current behavior until a key is added.
//
// STATUS: IMPLEMENTED, NOT VERIFIED — no real key exists to test this
// against yet. Get a public (read-only) key at your OpenAgenda account's
// API settings page (self-serve, no approval needed for read access):
// https://developers.openagenda.com/authentification/
//
// Not yet wired into app/api/weekly-propose/route.ts's existing 3-tier
// chain (RAG service -> Firestore -> static catalog) — that chain is live
// and tested; plugging in untested code ahead of the RAG tier isn't worth
// the risk until this can actually be tested against a real key. To
// activate once OPENAGENDA_API_KEY exists: call searchOpenAgendaEvents()
// as a new first tier in fetchVenueProposal(), same shape as the existing
// tiers (return null on empty/failure to fall through).

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
  agendaUid: string; // events live under an "agenda" (a calendar) you own or follow, not a global search across all of OpenAgenda — see the doc comment above for how to obtain one
  city?: string; // soft filter, applied client-side below — no confirmed geo/postal-code query param in their docs as of this verification pass
  fromISO?: string;
  toISO?: string;
  keyword?: string;
  size?: number;
}): Promise<OpenAgendaEvent[]> {
  const apiKey = process.env.OPENAGENDA_API_KEY;
  if (!apiKey) return [];

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
    const res = await fetch(`${OPENAGENDA_BASE}/agendas/${params.agendaUid}/events?${qs}`, {
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
