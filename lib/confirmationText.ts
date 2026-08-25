// Single entry point for the weekly confirmation-text rewrite — the thing
// that turns "Café de Flore, samedi 15:00" into a warm one-liner. Mistral
// first (better quality/latency in direct testing, 2026-08-24), Groq as
// fallback if Mistral fails for any reason, the caller's own deterministic
// template if both fail. Route files should import from here, not
// lib/mistral.ts or lib/groq.ts directly, so the vendor order lives in
// exactly one place.

import { generateWarmConfirmationMistral } from "@/lib/mistral";
import { generateWarmConfirmationGroq } from "@/lib/groq";
import type { WarmConfirmationParams } from "@/lib/confirmationPrompt";

export type { WarmConfirmationParams };

export async function generateWarmConfirmation(params: WarmConfirmationParams): Promise<string | null> {
  const fromMistral = await generateWarmConfirmationMistral(params);
  if (fromMistral) return fromMistral;

  return generateWarmConfirmationGroq(params);
}
