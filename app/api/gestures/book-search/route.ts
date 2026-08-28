// /app/api/gestures/book-search/route.ts
// Real book search for "curated"/"suggested" mode's "livre" item — thin
// server-side proxy to Google Books (books.googleapis.com), same reasoning
// as gif-search: the key never reaches the client bundle. Verified
// 2026-08-28 directly against the real API with the real configured key
// before writing this (response shape, field names, and the fact that
// keyless access has a genuine 0/day quota for this project — confirmed
// live, not assumed).
//
// Turns "Un livre" (a generic curated-category label with nothing real
// behind it) into an actual specific book the sender picked — the real
// gap this closes.

import { NextResponse } from "next/server";

const BOOKS_SEARCH_TIMEOUT_MS = 6000;

export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    // Honest fallback, same posture as every other optional integration
    // here — unset key means the search box simply doesn't appear.
    return NextResponse.json({ error: "recherche de livres non configurée" }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length > 100) {
    return NextResponse.json({ error: "recherche invalide" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKS_SEARCH_TIMEOUT_MS);
  try {
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", q);
    url.searchParams.set("maxResults", "9");
    url.searchParams.set("printType", "books");
    url.searchParams.set("langRestrict", "fr");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`gestures/book-search: Google Books failed (${res.status}) ${body.slice(0, 300)}`);
      return NextResponse.json({ error: "échec de la recherche" }, { status: 502 });
    }
    const data = await res.json();
    const results = Array.isArray(data?.items)
      ? data.items
          .map((item: any) => {
            const info = item?.volumeInfo ?? {};
            // http:// in Google's own response — upgraded to https to avoid
            // mixed-content blocking when rendered on this app's https pages.
            const thumbnail: string | undefined = info.imageLinks?.thumbnail?.replace(/^http:/, "https:");
            return {
              id: item?.id,
              title: info.title,
              authors: Array.isArray(info.authors) ? info.authors : [],
              thumbnail: thumbnail ?? null,
            };
          })
          .filter((b: any) => typeof b.id === "string" && typeof b.title === "string")
      : [];
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "délai dépassé" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
