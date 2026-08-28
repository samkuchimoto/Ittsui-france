// Mistral implementation of the weekly confirmation-text rewrite — the
// PRIMARY vendor as of 2026-08-24 (see lib/confirmationText.ts for the
// fallback chain to Groq). Real side-by-side testing against the exact
// same prompt Groq had already been running in production showed Mistral
// faster (~0.6s vs Groq's 1-2s) and more idiomatic French, with none of
// the reasoning-token overhead some Groq models showed. Verified live
// against a real, funded org key, not assumed.
//
// Account note: the org's €10 credit balance has no visible monthly
// spend-limit toggle despite what Mistral's public docs describe — the
// balance itself is the practical ceiling for now. That's not a special
// case to handle here: once it's exhausted, completions start returning a
// non-2xx response, which mistralComplete already treats as a normal
// failure — falls straight through to Groq, same as any other outage.

import {
  CONFIRMATION_SYSTEM_PROMPT,
  buildConfirmationUserContent,
  isValidConfirmationLine,
  type WarmConfirmationParams,
} from "@/lib/confirmationPrompt";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_TIMEOUT_MS = 5000;

interface MistralOptions {
  model?: "mistral-small-latest" | "ministral-8b-latest";
  maxTokens?: number;
  temperature?: number;
}

// Generic completion call — deliberately not confirmation-text-specific,
// so any future Mistral use (e.g. the natural-language-intake scenario in
// the AI-opportunities memo) can reuse it. Silent-fail like every other
// external call in this codebase (lib/groq.ts, lib/weather.ts): no
// console logging, just null on any failure — the caller's fallback is
// the correct response, not a log line nobody's watching on a cron route.
export async function mistralComplete(
  systemPrompt: string,
  userPrompt: string,
  options: MistralOptions = {}
): Promise<string | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MISTRAL_TIMEOUT_MS);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: options.maxTokens ?? 60,
        temperature: options.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Real gap fixed 2026-08-28: this used to fail completely silently,
      // by design ("no console logging, just null"), which meant a real
      // production failure on parseMeetingRequestText had zero trail to
      // diagnose from — no way to tell "Mistral genuinely failed here" from
      // "Mistral was never even tried." Still falls through to the
      // caller's next option exactly as before; this only adds visibility.
      const body = await response.text().catch(() => "");
      console.error(`mistralComplete: ${response.status} ${body.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : null;
  } catch (err) {
    console.error("mistralComplete: request threw", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWarmConfirmationMistral(params: WarmConfirmationParams): Promise<string | null> {
  const content = await mistralComplete(CONFIRMATION_SYSTEM_PROMPT, buildConfirmationUserContent(params), {
    model: "mistral-small-latest",
    maxTokens: 100,
    temperature: 0.8,
  });
  return isValidConfirmationLine(content) ? content : null;
}
