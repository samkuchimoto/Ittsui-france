// /app/api/gestures/gif-search/route.ts
// Thin server-side proxy to GIPHY's real search endpoint, so
// GIPHY_API_KEY never reaches the client bundle — the same reasoning
// every other server-only key in this app (Fal.ai, Stuart, Resend) is
// never called directly from a page component. Powers the optional GIF
// picker on "message"-mode gestures (lib/gestureLinks.ts's zero-object
// mode) — verified 2026-08-28 against a real GIPHY Beta API key created
// for this project (developers.giphy.com), not guessed.
//
// Honest-fallback posture, same as Fal.ai/Stuart: unset key returns 501
// and the picker simply doesn't appear client-side.

import { NextResponse } from "next/server";

const GIPHY_SEARCH_TIMEOUT_MS = 6000;

export async function GET(request: Request) {
  // "Web" specifically — this route runs server-side in a Next.js API
  // route, not inside the Android SDK context GIPHY_ANDROID_API_KEY was
  // created for (same GIPHY workspace has both keys; using the wrong
  // one wouldn't necessarily fail loudly, just be the wrong credential
  // for this call site).
  const apiKey = process.env.GIPHY_WEB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "recherche GIF non configurée" }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length > 100) {
    return NextResponse.json({ error: "recherche invalide" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GIPHY_SEARCH_TIMEOUT_MS);
  try {
    const url = new URL("https://api.giphy.com/v1/gifs/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "9");
    url.searchParams.set("rating", "pg-13");
    url.searchParams.set("lang", "fr");

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return NextResponse.json({ error: "échec de la recherche" }, { status: 502 });
    }
    const data = await res.json();
    const results = Array.isArray(data?.data)
      ? data.data
          .map((gif: any) => ({
            id: gif?.id,
            previewUrl: gif?.images?.fixed_width_small?.url,
            url: gif?.images?.original?.url,
          }))
          .filter((g: any) => typeof g.id === "string" && typeof g.previewUrl === "string" && typeof g.url === "string")
      : [];
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "délai dépassé" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
