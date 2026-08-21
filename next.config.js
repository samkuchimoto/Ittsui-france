// CSP connect-src is scoped from an actual audit of every external fetch
// in this codebase (not a generic template), split by whether it runs in
// the browser or server-side:
//   - Server-side (app/api/**, lib/notify.ts): Resend, Fal.ai — NOT
//     subject to CSP at all, since CSP only governs what the browser
//     itself is allowed to fetch. Deliberately not listed below.
//   - Client-side (app/hooks/useUserLocation.ts, useNearbyVenue.ts): the
//     French government's BAN reverse-geocoding API and OpenStreetMap's
//     Overpass API — both real, both required, both would silently break
//     (their own try/catch would just make it look like "no location
//     found" rather than a CSP violation) without being allowlisted here.
//   - *.googleapis.com covers Firebase Auth/Firestore/Cloud Messaging's
//     own client SDK calls; *.firebaseapp.com is the authDomain Firebase
//     Auth can use an iframe against for certain flows.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' here is a pragmatic choice, not the strictest
  // possible CSP (a nonce-based setup needs Next.js middleware, a bigger
  // change) — Next.js's own hydration script and styled-jsx (used in
  // app/page.tsx's FridayCard, app/dashboard's Hitbonenut pause) both
  // need it.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api-adresse.data.gouv.fr https://overpass-api.de",
  "frame-src https://*.firebaseapp.com",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Step 3's Restaurant/Culture discovery tiles — a stable, permanent
        // host, unlike the AI mood illustration feature's per-request Fal.ai
        // URLs (which use a plain <img> instead; allowlisting a dynamic,
        // credential-gated host here wouldn't make sense the same way).
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    // Proxies Firebase Auth's handler/iframe endpoints through this app's
    // own domain — purely additive (nothing currently serves /__/auth/* on
    // this domain, so this can't break an existing path) but on its own
    // does NOT change the redirect-auth storage-partitioning behavior
    // Chrome's "may soon delete state for intermediate websites" warning
    // flags: Google's OAuth redirect_uri is built from Firebase's
    // `authDomain` config value, which today is the *.firebaseapp.com
    // default — this rewrite only gets hit once authDomain is changed to
    // this app's own domain too, and that change needs the domain added
    // to Firebase Console → Authentication → Settings → Authorized
    // domains first (unverified from here — not flipped in this pass).
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (!authDomain) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${authDomain}/__/auth/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // Only takes effect over HTTPS (inert on local http dev, live
          // once deployed — Vercel is always HTTPS).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
