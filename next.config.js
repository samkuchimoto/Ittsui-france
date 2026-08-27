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
//     own client SDK calls. https://apis.google.com is a DIFFERENT host
//     (not a googleapis.com subdomain, so the wildcard above doesn't cover
//     it) that signInWithPopup's underlying gapi helper loads directly —
//     confirmed via a real browser console CSP violation, not assumed:
//     "Loading the script 'https://apis.google.com/js/api.js...' violates
//     ... script-src" blocked every popup sign-in outright. That gapi
//     script also opens its own relay iframe against apis.google.com for
//     the popup<->opener postMessage handshake, hence it's listed in
//     frame-src too, not just script-src.
//   - frame-src also carries 'self': NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN went
//     through a custom-domain phase (ittsui.fr) that needed this for
//     Firebase's own same-origin session iframe. authDomain is back to
//     Firebase's default (ittsui-france.firebaseapp.com — see the removed
//     rewrites() below for why), so that iframe is firebaseapp.com again
//     and 'self' isn't load-bearing anymore, but it's harmless to leave
//     and removing it buys nothing.
//
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN history, for context: default
//   (ittsui-france.firebaseapp.com) -> custom domain (ittsui.fr), to work
//   around Chrome treating firebaseapp.com's storage as partitioned during
//   signInWithRedirect's round-trip -> back to the default, once sign-in
//   moved to signInWithPopup (lib/firebase.ts), which never calls
//   getRedirectResult() and so was never exposed to that partitioning
//   issue in the first place. The custom-domain phase cost three separate
//   production incidents on its own (a self-referential redirect loop, a
//   redirect_uri_mismatch from the apex->www platform redirect changing
//   the effective host mid-flow, and the same-origin iframe CSP gap
//   above) — none of which are possible once authDomain is Firebase's own
//   domain again, since nothing in this app's own routing sits in front
//   of it. If a real reason to move off the default domain comes up
//   again, treat this history as the reason to think hard before doing it,
//   not as something already solved.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' here is a pragmatic choice, not the strictest
  // possible CSP (a nonce-based setup needs Next.js middleware, a bigger
  // change) — Next.js's own hydration script and styled-jsx (used in
  // app/page.tsx's FridayCard, app/dashboard's Hitbonenut pause) both
  // need it.
  "script-src 'self' 'unsafe-inline' https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://apis.google.com https://*.firebaseio.com https://api-adresse.data.gouv.fr https://overpass-api.de",
  "frame-src 'self' https://*.firebaseapp.com https://apis.google.com",
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
  // Short aliases for the two bearer-link routes — cleaner in a WhatsApp/
  // SMS preview than the full path. "r"/"p" (not the collection names) so
  // the shared link never spells out "meetingRequests" or reveals which
  // Firestore collection backs it. 307, not a permanent redirect: this is
  // a routing alias that could change shape later, not a URL migration.
  async redirects() {
    return [
      { source: "/m/r/:id", destination: "/request/:id", permanent: false },
      { source: "/m/p/:id", destination: "/invite/:id", permanent: false },
      { source: "/m/g/:id", destination: "/geste/:id", permanent: false },
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
