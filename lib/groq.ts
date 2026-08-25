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

// Returns the warm one-liner, or null on any failure — missing key,
// timeout, network error, malformed response, or output that fails basic
// sanity checks. Callers must always have a next option ready; this is a
// best-effort enhancement, never a dependency.
export async function generateWarmConfirmationGroq(params: WarmConfirmationParams): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const userContent = buildConfirmationUserContent(params);

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
        model: "groq/compound-mini",
        messages: [
          { role: "system", content: CONFIRMATION_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    if (!isValidConfirmationLine(content)) return null;

    return content.trim();
  } catch {
    // Timeout (AbortError), network error, or bad JSON — all the same:
    // the caller's next option (deterministic template) is the correct
    // fallback.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
