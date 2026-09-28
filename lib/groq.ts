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
//
// 2026-09-28: groq/compound-mini was retired — every call returned 404
// model_not_found, so every Groq caller had been failing silently, and
// with no MISTRAL_API_KEY in production "Décrire en une phrase" never
// worked at all. The reasoning models' token-burn problem above goes away
// with Groq's reasoning_effort parameter, so they are usable now; see
// GROQ_MODELS. A list rather than one model so that one retirement can't
// take every caller down again.

import {
  CONFIRMATION_SYSTEM_PROMPT,
  buildConfirmationUserContent,
  isValidConfirmationLine,
  type WarmConfirmationParams,
} from "@/lib/confirmationPrompt";

const GROQ_TIMEOUT_MS = 3000;

// Tried in order until one answers. Measured 2026-09-28 on French meeting-
// request extraction: qwen 0.2-0.4s and gpt-oss-120b 0.5-0.8s, both correct
// on every test sentence (gpt-oss-20b was not — it resolved "demain" to
// Tuesday and dropped the name "maman").
const GROQ_MODELS: { model: string; reasoningEffort: string }[] = [
  { model: "qwen/qwen3.8-27b", reasoningEffort: "none" },
  { model: "openai/gpt-oss-120b", reasoningEffort: "low" },
];

interface GroqOptions {
  maxTokens?: number;
  temperature?: number;
  /** Ask for a JSON object (Groq's response_format). */
  json?: boolean;
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

  for (const { model, reasoningEffort } of GROQ_MODELS) {
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
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: options.maxTokens ?? 100,
          temperature: options.temperature ?? 0.7,
          reasoning_effort: reasoningEffort,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Same visibility fix as mistralComplete (2026-08-28) — was silently
        // swallowed before, meaning a real failure on BOTH vendors in a row
        // (the actual worst case for any caller) left zero trail either.
        const body = await res.text().catch(() => "");
        console.error(`groqComplete: ${model} ${res.status} ${body.slice(0, 300)}`);
        continue;
      }

      const data = await res.json();
      const content: unknown = data?.choices?.[0]?.message?.content;
      // Defensive: a reasoning model that ignores reasoning_effort would put
      // its chain of thought inline.
      const text = typeof content === "string" ? content.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : "";
      if (text) return text;
    } catch (err) {
      // Timeout (AbortError), network error, or bad JSON — all the same:
      // move on to the next model, and log, since this is the last vendor
      // in the chain for callers like parseMeetingRequestText.
      console.error(`groqComplete: ${model} request threw`, err);
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
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
