// /app/sitemap.ts
// Real gap found live 2026-08-27: neither this nor robots.ts existed at
// all — both returned the app's own 404 page. Only the genuinely public,
// generic pages are listed here — /setup, /dashboard, /request/*,
// /invite/*, /contacts are account-specific or single-use bearer-link
// pages with nothing generically indexable, the same reasoning
// robots.ts disallows them for.
//
// 2026-10-20: the public pages exist in French, English and Japanese
// (lib/i18n.ts); each is listed with its hreflang alternates. The partner
// directory and the legal notice are French only. 2026-10-23: the city
// landing pages too.

import type { MetadataRoute } from "next";
import { LOCALES, PUBLIC_PAGES, pagePath } from "@/lib/i18n";
import { CITIES, CITY_IDS } from "@/lib/cities";

const BASE_URL = "https://www.ittsui.fr";
const url = (path: string) => `${BASE_URL}${path === "/" ? "" : path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const translated: MetadataRoute.Sitemap = PUBLIC_PAGES.flatMap((page) =>
    LOCALES.map((lang) => ({
      url: url(pagePath(page, lang)),
      lastModified: new Date(),
      changeFrequency: page === "home" ? ("weekly" as const) : ("monthly" as const),
      priority: page === "home" ? 1 : 0.5,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, url(pagePath(page, l))])),
      },
    })),
  );
  const frenchOnly: MetadataRoute.Sitemap = ["/partenaires", "/partenaires/rechercher", "/mentions-legales"].map((path) => ({
    url: url(path),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  // The eight city landing pages (lib/cities.ts City.landing), each with its other languages.
  const cities: MetadataRoute.Sitemap = CITY_IDS.flatMap((id) => {
    const versions = Object.entries(CITIES[id].landing);
    const languages = Object.fromEntries(versions.map(([lang, path]) => [lang === "es" ? "es-MX" : lang, url(path)]));
    return versions.map(([, path]) => ({
      url: url(path),
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages },
    }));
  });
  return [...translated, ...frenchOnly, ...cities];
}
