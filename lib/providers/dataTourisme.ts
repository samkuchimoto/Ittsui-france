// /lib/providers/dataTourisme.ts
// Real DATAtourisme v1 client — endpoint, auth, query params, and response
// shape verified against their live docs (api.datatourisme.fr/v1/docs) on
// 2026-08-22, not written from memory. Same pattern as
// lib/providers/openAgenda.ts: gated behind DATATOURISME_API_KEY, returns
// [] when unset, fully inert until a key exists and this is deliberately
// wired into a live path.
//
// STATUS: see the module's own test — run once at the bottom of this
// comment block's sibling verification pass. Lower priority than
// OpenAgenda for actual production use: the existing static catalog
// (lib/venueCatalog.ts) already covers parks/heritage sites in 5 major
// metros, so this is additive breadth, not filling a hole nothing covers.
//
// Not yet wired into app/api/weekly-propose/route.ts's fallback chain —
// same reasoning as openAgenda.ts: don't add an untested tier ahead of
// the already-working RAG -> Firestore -> static pipeline.

// Shape below is verified against a REAL response object (not the docs'
// summary, which was wrong on several fields — see the git history on
// this file): isLocatedAt and address are both arrays, city has both a
// plain addressLocality string AND a redundant language-tagged
// hasAddressCity.label — addressLocality is simpler and used first.
interface DataTourismeAddress {
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
  hasAddressCity?: { label?: Record<string, string> };
}

interface DataTourismeLocation {
  geo?: { latitude?: number; longitude?: number };
  address?: DataTourismeAddress[];
}

export interface DataTourismePOI {
  uuid: string;
  label: string;
  type?: string;
  description?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

const DATATOURISME_BASE = "https://api.datatourisme.fr/v1";
const TIMEOUT_MS = 1500; // matches the other providers' RAG_TIMEOUT_MS convention

// label/description come back as multilingual objects keyed with an "@"
// prefix (e.g. "@fr", "@ru") — confirmed against a real response, and
// different from OpenAgenda's plain "fr" key, so this isn't shared with
// that provider's pickFrench despite looking similar.
function pickFrench(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, string>;
    return obj["@fr"] ?? obj.fr ?? Object.values(obj)[0];
  }
  return undefined;
}

export async function searchDataTourismePOIs(params: {
  city?: string; // soft filter, applied client-side below for consistency with the static catalog's own city-matching, even though geo_distance (below) is the more precise option when coordinates are known
  geoDistance?: { latitude: number; longitude: number; radiusKm: number }; // real query param — more precise than city name when the user's actual coordinates are known
  keyword?: string;
  pageSize?: number;
}): Promise<DataTourismePOI[]> {
  const apiKey = process.env.DATATOURISME_API_KEY;
  if (!apiKey) return [];

  const qs = new URLSearchParams();
  if (params.keyword) qs.set("search", params.keyword);
  if (params.geoDistance) {
    const { latitude, longitude, radiusKm } = params.geoDistance;
    qs.set("geo_distance", `${latitude},${longitude},${radiusKm}km`);
  }
  qs.set("page_size", String(params.pageSize ?? 10));
  qs.set("lang", "fr");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${DATATOURISME_BASE}/catalog?${qs}`, {
      headers: { "X-API-Key": apiKey },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawObjects: Record<string, unknown>[] = data.objects ?? [];

    const pois: DataTourismePOI[] = rawObjects.map((o) => {
      const location = (o.isLocatedAt as DataTourismeLocation[] | undefined)?.[0];
      const address = location?.address?.[0];
      // hasDescription is an array; the actual text is nested one level
      // further under shortDescription — verified against a real object.
      const shortDescription = (o.hasDescription as { shortDescription?: unknown }[] | undefined)?.[0]
        ?.shortDescription;
      // type is an array of category tags (e.g. ["PointOfInterest",
      // "CulturalSite"]), not a single multilingual value.
      const types = o.type as string[] | undefined;

      return {
        uuid: o.uuid as string,
        label: pickFrench(o.label) ?? "",
        type: types?.[0],
        description: pickFrench(shortDescription),
        city: address?.addressLocality ?? pickFrench(address?.hasAddressCity?.label),
        postalCode: address?.postalCode,
        address: address?.streetAddress,
        latitude: location?.geo?.latitude,
        longitude: location?.geo?.longitude,
      };
    });

    if (params.city) {
      return pois.filter((p) => p.city?.toLowerCase() === params.city!.toLowerCase());
    }
    return pois;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
