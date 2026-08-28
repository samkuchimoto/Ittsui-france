// Groq implementation of the weekly confirmation-text rewrite — now the
// FALLBACK behind Mistral (see lib/confirmationText.ts), not the primary.
// It was the only vendor for this job until 2026-08-24; real side-by-side
// testing that day showed Mistral producing faster, more idiomatic French
// on the identical prompt, so Mistral moved to primary and this became the
// safety net. Kept, not deleted: still free, still works, still exactly
// what fires if Mistral's key, balance, or the network fails.
//
// Model choice: verified directly against the live API (2026-08-24, not
// assumed) that this key's available models skew either toward heavy
// "reasoning" models (openai/gpt-oss-*, qwen/qwen3.6-27b — both burn their
// entire token budget on hidden chain-of-thought before ever emitting the
// actual line, unusable at a tight max_tokens) or allam-2-7b (fast and
// clean in testing, but an Arabic-specialized model — not a safe default
// for a French-only app). groq/compound-mini was the one candidate that
// reliably produced direct, on-brief French output at real 1-2s latency in
// repeated tests; it routes internally through llama-3.3-70b-versatile
// (not directly reachable on this key) and occasionally erroring outright
// in testing is exactly why every call here is wrapped in a hard timeout
// and a try/catch that falls back to the caller's next option — never
// something that blocks or breaks the actual weekly notification.

import {
  CONFIRMATION_SYSTEM_PROMPT,
  buildConfirmationUserContent,
  isValidConfirmationLine,
  type WarmConfirmationParams,
} from "@/lib/confirmationPrompt";

const GROQ_TIMEOUT_MS = 3000;

interface GroqOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Generic completion call — mirrors lib/mistral.ts's mistralComplete
// exactly (same signature, same silent-fail-to-null shape), generalized
// out of what used to be generateWarmConfirmationGroq's confirmation-
// text-only body. mistralComplete's own comment already anticipated this
// exact reuse ("any future Mistral use... can reuse it") but Groq's
// version was never given the same treatment — found as a real gap
// 2026-08-26: lib/parseMeetingRequest.ts calls mistralComplete directly
// with NO fallback at all, unlike every other AI call in this codebase
// (confirmation text, venue selection). When Mistral fails — an
// exhausted prepaid credit balance, a network blip, a timeout — the
// natural-language "Remplir automatiquement" feature always shows
// "rien n'a pu être deviné," regardless of how simple the input was, with
// no safety net. This function exists so parseMeetingRequestText can have
// the same Mistral -> Groq resilience every other AI call here already
// has.
export async function groqComplete(
  systemPrompt: string,
  userPrompt: string,
  options: GroqOptions = {}
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? "groq/compound-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: options.maxTokens ?? 100,
        temperature: options.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Same visibility fix as mistralComplete (2026-08-28) — was silently
      // swallowed before, meaning a real failure on BOTH vendors in a row
      // (the actual worst case for any caller) left zero trail either.
      const body = await res.text().catch(() => "");
      console.error(`groqComplete: ${res.status} ${body.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : null;
  } catch (err) {
    // Timeout (AbortError), network error, or bad JSON — all the same:
    // the caller's next option is the correct fallback, but still worth
    // logging now that this is the last vendor in the chain for callers
    // like parseMeetingRequestText.
    console.error("groqComplete: request threw", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Returns the warm one-liner, or null on any failure — missing key,
// timeout, network error, malformed response, or output that fails basic
// sanity checks. Callers must always have a next option ready; this is a
// best-effort enhancement, never a dependency.
export async function generateWarmConfirmationGroq(params: WarmConfirmationParams): Promise<string | null> {
  const content = await groqComplete(CONFIRMATION_SYSTEM_PROMPT, buildConfirmationUserContent(params), {
    maxTokens: 100,
    temperature: 0.8,
  });
  return isValidConfirmationLine(content) ? content : null;
}
