// /app/sitemap.ts
// Real gap found live 2026-08-27: neither this nor robots.ts existed at
// all — both returned the app's own 404 page. Only the genuinely public,
// generic pages are listed here — /setup, /dashboard, /request/*,
// /invite/*, /contacts are account-specific or single-use bearer-link
// pages with nothing generically indexable, the same reasoning
// robots.ts disallows them for.

import type { MetadataRoute } from "next";

const BASE_URL = "https://www.ittsui.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/a-propos", "/download", "/confidentialite", "/conditions-utilisation", "/mentions-legales"];
  return staticPaths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
