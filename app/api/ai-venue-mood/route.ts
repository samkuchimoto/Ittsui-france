// /app/api/ai-venue-mood/route.ts
// Generates a CATEGORY mood illustration (e.g. "restaurant ambiance"),
// never a picture of one specific named real venue — the discovery grid
// only has category tiles (cafe/park/restaurant/museum), not per-address
// photos, so there's nothing here that could be mistaken for "this is
// what [real place] looks like". That distinction is what makes this
// buildable at all: an AI mood board for a category, clearly disclosed as
// such client-side, is a different thing from a fabricated photo
// presented as documentary evidence of a specific street address.
//
// No API key configured in this project for any image-generation
// service (Fal.ai, OpenAI images, or otherwise) — this returns 501
// immediately when unset, which is the honest state until real
// credentials are added. Callers (AIVenueTile) already treat that
// identically to a timeout: fall back to the existing real-photo/tinted-
// block pattern, never to a fabricated image pretending to be one.

import { NextResponse } from "next/server";

const GENERATION_TIMEOUT_MS = 2000;

const CATEGORY_PROMPTS: Record<string, string> = {
  cafe: "warm editorial mood photograph of a cozy French café interior, soft natural light, no people, no text, no logos",
  park: "warm editorial mood photograph of a peaceful French park in golden hour light, no people, no text, no logos",
  restaurant: "warm editorial mood photograph of an intimate French bistro table setting, soft candlelight, no people, no text, no logos",
  museum: "warm editorial mood photograph of a quiet museum gallery space, soft natural light, no people, no text, no logos",
};

export async function POST(request: Request) {
  const { category } = await request.json();
  const prompt = typeof category === "string" ? CATEGORY_PROMPTS[category] : undefined;
  if (!prompt) {
    return NextResponse.json({ error: "catégorie inconnue" }, { status: 400 });
  }

  const falKey = process.env.FAL_API_KEY;
  if (!falKey) {
    // The honest current state — no key configured yet. Not a server
    // error in the 500 sense; the caller's fallback path is the correct,
    // expected behavior here, not something to paper over.
    return NextResponse.json({ error: "génération IA non configurée" }, { status: 501 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
  try {
    const res = await fetch("https://fal.run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, image_size: "landscape_4_3", num_images: 1 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json({ error: "échec de génération" }, { status: 502 });
    }
    const data = await res.json();
    const imageUrl: unknown = data?.images?.[0]?.url;
    if (typeof imageUrl !== "string") {
      return NextResponse.json({ error: "réponse inattendue" }, { status: 502 });
    }
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ error: "délai dépassé" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
