// /app/robots.ts
// Real gap found live 2026-08-27: this route didn't exist, so /robots.txt
// returned the app's own 404 page rather than real rules — not
// catastrophic on its own (crawlers default to "allow all" with no
// robots.txt), but a missing, deliberate signal is worse than a real one.
// Disallows account-specific/bearer-link pages that have nothing generic
// to offer a search result — same reasoning sitemap.ts only lists the
// static marketing/legal pages.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/setup",
        "/dashboard",
        "/request/",
        "/invite/",
        "/geste/",
        "/contacts",
        "/api/",
        // The venue's own bearer-link management page — a private
        // credential in the URL itself, same reasoning meeting-request
        // and invite bearer links are already excluded above.
        "/partenaires/*/gerer",
        // Internal fundraising scenario tool — not a public product
        // page, deliberately unlinked from any nav; a direct-link-only
        // private URL, not something search engines should surface.
        "/investors",
      ],
    },
    sitemap: "https://www.ittsui.fr/sitemap.xml",
  };
}
