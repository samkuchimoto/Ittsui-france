// /lib/cities.ts
// The eight cities Ittsui is open in (2026-10-23): one shared configuration
// instead of Paris assumptions spread through the code. A meeting's city,
// chosen by the person (never guessed from their IP, GPS or store country),
// decides its timezone, its venue suggestions (OpenStreetMap around the
// city centre; French data only in Paris) and how its dates read.
// No runtime imports: safe in the browser, the server and Node tests.

export const CITY_IDS = ["paris", "new-york", "london", "tokyo", "berlin", "amsterdam", "tel-aviv", "mexico-city"] as const;
export type CityId = (typeof CITY_IDS)[number];

/** Languages the app speaks; German and Dutch come later for Berlin and Amsterdam. */
type Lang = "fr" | "en" | "ja" | "es" | "he";

export interface City {
  id: CityId;
  name: Record<Lang, string>;
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** IANA timezone: the meeting's local time is kept in it. */
  timezone: string;
  /** The city's languages, its first one being the default there. */
  langs: Lang[];
  /** Intl locale for dates and numbers in this city. */
  locale: string;
  currency: "EUR" | "USD" | "GBP" | "JPY" | "ILS" | "MXN";
  /** Where venue searches start when no neighbourhood is given. */
  center: { lat: number; lon: number };
  /** "11/12" is the 11th of December here (false: November 12th). */
  dayFirst: boolean;
  /** French postal codes, the address API and the French venue catalogue apply. */
  frenchData: boolean;
  /** How OpenStreetMap names parks and museums here, for the venue suggestions. */
  osmWords: { park: string; museum: string };
  /** The city's landing page in each language it has one in (app/components/site/CityLanding.tsx). */
  landing: Partial<Record<Lang, string>>;
}

export const CITIES: Record<CityId, City> = {
  paris: {
    id: "paris",
    name: { fr: "Paris", en: "Paris", ja: "パリ", es: "París", he: "פריז" },
    country: "FR",
    timezone: "Europe/Paris",
    langs: ["fr", "en"],
    locale: "fr-FR",
    currency: "EUR",
    center: { lat: 48.8566, lon: 2.3522 },
    dayFirst: true,
    frenchData: true,
    osmWords: { park: "parc", museum: "musée" },
    landing: { fr: "/paris", en: "/en/paris" },
  },
  "new-york": {
    id: "new-york",
    name: { fr: "New York", en: "New York City", ja: "ニューヨーク", es: "Nueva York", he: "ניו יורק" },
    country: "US",
    timezone: "America/New_York",
    langs: ["en"],
    locale: "en-US",
    currency: "USD",
    center: { lat: 40.7306, lon: -73.9866 },
    dayFirst: false,
    frenchData: false,
    osmWords: { park: "park", museum: "museum" },
    landing: { en: "/en/new-york" },
  },
  london: {
    id: "london",
    name: { fr: "Londres", en: "London", ja: "ロンドン", es: "Londres", he: "לונדון" },
    country: "GB",
    timezone: "Europe/London",
    langs: ["en"],
    locale: "en-GB",
    currency: "GBP",
    center: { lat: 51.5074, lon: -0.1278 },
    dayFirst: true,
    frenchData: false,
    osmWords: { park: "park", museum: "museum" },
    landing: { en: "/en/london" },
  },
  tokyo: {
    id: "tokyo",
    name: { fr: "Tokyo", en: "Tokyo", ja: "東京", es: "Tokio", he: "טוקיו" },
    country: "JP",
    timezone: "Asia/Tokyo",
    langs: ["ja", "en"],
    locale: "ja-JP",
    currency: "JPY",
    center: { lat: 35.6812, lon: 139.7671 },
    dayFirst: false,
    frenchData: false,
    osmWords: { park: "公園", museum: "美術館" },
    landing: { ja: "/ja/tokyo", en: "/en/tokyo" },
  },
  berlin: {
    id: "berlin",
    name: { fr: "Berlin", en: "Berlin", ja: "ベルリン", es: "Berlín", he: "ברלין" },
    country: "DE",
    timezone: "Europe/Berlin",
    langs: ["en"],
    locale: "en-GB",
    currency: "EUR",
    center: { lat: 52.52, lon: 13.405 },
    dayFirst: true,
    frenchData: false,
    osmWords: { park: "park", museum: "museum" },
    landing: { en: "/en/berlin" },
  },
  amsterdam: {
    id: "amsterdam",
    name: { fr: "Amsterdam", en: "Amsterdam", ja: "アムステルダム", es: "Ámsterdam", he: "אמסטרדם" },
    country: "NL",
    timezone: "Europe/Amsterdam",
    langs: ["en"],
    locale: "en-GB",
    currency: "EUR",
    center: { lat: 52.3676, lon: 4.9041 },
    dayFirst: true,
    frenchData: false,
    osmWords: { park: "park", museum: "museum" },
    landing: { en: "/en/amsterdam" },
  },
  "tel-aviv": {
    id: "tel-aviv",
    name: { fr: "Tel Aviv", en: "Tel Aviv", ja: "テルアビブ", es: "Tel Aviv", he: "תל אביב" },
    country: "IL",
    timezone: "Asia/Jerusalem",
    langs: ["he", "en"],
    locale: "he-IL",
    currency: "ILS",
    center: { lat: 32.0853, lon: 34.7818 },
    dayFirst: true,
    frenchData: false,
    osmWords: { park: "פארק", museum: "מוזיאון" },
    landing: { he: "/he/tel-aviv", en: "/en/tel-aviv" },
  },
  "mexico-city": {
    id: "mexico-city",
    name: { fr: "Mexico", en: "Mexico City", ja: "メキシコシティ", es: "Ciudad de México", he: "מקסיקו סיטי" },
    country: "MX",
    timezone: "America/Mexico_City",
    langs: ["es", "en"],
    locale: "es-MX",
    currency: "MXN",
    center: { lat: 19.4326, lon: -99.1332 },
    dayFirst: true,
    frenchData: false,
    osmWords: { park: "parque", museum: "museo" },
    landing: { es: "/es/ciudad-de-mexico", en: "/en/mexico-city" },
  },
};

export function isCityId(value: unknown): value is CityId {
  return typeof value === "string" && (CITY_IDS as readonly string[]).includes(value);
}

/** A stored meeting's city; Paris for everything made before cities existed. */
export function cityOf(value: unknown): City {
  return CITIES[isCityId(value) ? value : "paris"];
}

/** The city and language a landing page path is for (middleware.ts), or null. */
export function landingOf(pathname: string): { city: CityId; lang: Lang } | null {
  for (const id of CITY_IDS) {
    for (const [lang, path] of Object.entries(CITIES[id].landing)) if (path === pathname) return { city: id, lang: lang as Lang };
  }
  return null;
}

/** The city a language most likely means, as a default only (the person can change it); none for English. */
export function defaultCityFor(lang: Lang): CityId | null {
  return ({ fr: "paris", ja: "tokyo", es: "mexico-city", he: "tel-aviv", en: null } as const)[lang];
}
