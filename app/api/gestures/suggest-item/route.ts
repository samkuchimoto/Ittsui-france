// /app/api/gestures/suggest-item/route.ts
// Real, context-aware suggestion for "suggested" mode — replaces a plain
// random pick (lib/gestureLinks.ts's suggestCuratedItem()) with a real
// Mistral/Groq call when the sender actually gives a reason ("elle
// commence un nouveau travail lundi"). Same primary/fallback order as
// every other AI call in this app (lib/confirmationText.ts): Mistral
// first, Groq if that fails, and if BOTH fail or no context was given,
// the caller falls back to the existing random pick client-side — this
// route never fabricates a "smart" answer it doesn't actually have.
//
// No Pair context is used here on purpose, not an oversight: gestures
// have no auth and no link to a real Pair document (verifyRequestUser is
// never called anywhere in this feature, see /api/gestures/route.ts) —
// there is no real relationship data this route could honestly claim to
// know. The sender's own typed reason is the only real signal available,
// and the only one used.

import { NextResponse } from "next/server";
import { z } from "zod";
import { mistralComplete } from "@/lib/mistral";
import { groqComplete } from "@/lib/groq";
import { CURATED_ITEMS, CURATED_ITEM_LABEL } from "@/lib/gestureLinks";
import type { CuratedGestureItem } from "@/lib/types";

const bodySchema = z.object({
  recipientName: z.string().trim().min(1).max(200),
  context: z.string().trim().min(1).max(300),
});

const SYSTEM_PROMPT = `Tu aides à choisir une petite attention (cadeau simple) pour quelqu'un, en français.
Réponds UNIQUEMENT avec un objet JSON de cette forme, sans aucun texte autour :
{"item": "un des choix ci-dessous", "reason": "une phrase courte, chaleureuse, en français, max 15 mots"}
Choix possibles pour "item" (utilise exactement une de ces valeurs) : ${CURATED_ITEMS.join(", ")}.`;

function buildUserPrompt(recipientName: string, context: string): string {
  return `Destinataire : ${recipientName}\nContexte donné par l'expéditeur : ${context}\n\nChoisis l'attention la plus adaptée parmi la liste.`;
}

function parseSuggestion(raw: string | null): { item: CuratedGestureItem; reason: string } | null {
  if (!raw) return null;
  try {
    // Models sometimes wrap JSON in a code fence despite instructions —
    // strip that before parsing rather than failing on it.
    const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const item = parsed?.item;
    const reason = parsed?.reason;
    if (typeof item !== "string" || !CURATED_ITEMS.includes(item as CuratedGestureItem)) return null;
    if (typeof reason !== "string" || !reason.trim()) return null;
    return { item: item as CuratedGestureItem, reason: reason.trim().slice(0, 150) };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }
  const { recipientName, context } = parsed.data;
  const userPrompt = buildUserPrompt(recipientName, context);

  const fromMistral = parseSuggestion(
    await mistralComplete(SYSTEM_PROMPT, userPrompt, { model: "mistral-small-latest", maxTokens: 120, temperature: 0.6 })
  );
  const suggestion =
    fromMistral ?? parseSuggestion(await groqComplete(SYSTEM_PROMPT, userPrompt, { maxTokens: 120, temperature: 0.6 }));

  if (!suggestion) {
    // Honest fallback: no fabricated "smart" pick when both vendors fail
    // or return something outside the real enum — the client already
    // knows how to fall back to a plain random suggestion on its own.
    return NextResponse.json({ error: "suggestion indisponible" }, { status: 502 });
  }

  return NextResponse.json({
    item: suggestion.item,
    label: CURATED_ITEM_LABEL[suggestion.item],
    reason: suggestion.reason,
  });
}
