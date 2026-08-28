// /app/api/gestures/describe-photo/route.ts
// Real image-to-text for "own" mode's item description — take a photo
// instead of typing a sentence. Uses Groq's vision model (GROQ_API_KEY
// already configured in this app for confirmation-text rewrites, see
// lib/groq.ts — same key, different model, no new credential needed).
// Model verified directly against Groq's own current docs 2026-08-28
// (console.groq.com/docs/vision), not guessed — their vision lineup has
// changed names before (Llama 3.2 vision was deprecated).
//
// Returns a short real description the sender still reviews/edits before
// sending, never something silently trusted and submitted — an AI vision
// guess (wrong color, wrong item) feeding straight into a real courier
// dispatch with no human check would be exactly the kind of fabricated-
// confidence this app avoids everywhere else.

import { NextResponse } from "next/server";
import { z } from "zod";

const GROQ_VISION_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 6_000_000; // ~6MB — comfortably above a compressed phone photo, well under Groq's request limit

const bodySchema = z.object({
  imageDataUrl: z
    .string()
    .trim()
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "format d'image invalide"),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const { imageDataUrl } = parsed.data;

  if (imageDataUrl.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "image trop lourde" }, { status: 413 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Honest fallback, same posture as every other optional integration in
    // this app — no key means no guess, the sender just types it instead.
    return NextResponse.json({ error: "reconnaissance non configurée" }, { status: 501 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_VISION_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen/qwen3.6-27b",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Décris cet objet en une courte phrase en français, comme si tu l'annonçais à un livreur qui doit venir le récupérer. Sois concret et précis (type d'objet, couleur si visible), pas plus de 12 mots, pas de ponctuation finale.",
              },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 60,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`gestures/describe-photo: Groq vision failed (${res.status}) ${body.slice(0, 300)}`);
      return NextResponse.json({ error: "reconnaissance impossible" }, { status: 502 });
    }
    const data = await res.json();
    const description: unknown = data?.choices?.[0]?.message?.content;
    if (typeof description !== "string" || !description.trim()) {
      console.error(`gestures/describe-photo: unexpected Groq response shape: ${JSON.stringify(data).slice(0, 300)}`);
      return NextResponse.json({ error: "reconnaissance impossible" }, { status: 502 });
    }

    return NextResponse.json({ description: description.trim() });
  } catch (err) {
    console.error("gestures/describe-photo: Groq vision request threw", err);
    return NextResponse.json({ error: "reconnaissance impossible" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
