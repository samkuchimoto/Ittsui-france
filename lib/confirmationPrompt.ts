// Shared prompt + validation for the weekly confirmation-text rewrite,
// used by both lib/groq.ts and lib/mistral.ts so the two vendors are asked
// the exact same question and held to the exact same output contract —
// editing the prompt once here, rather than keeping two copies that could
// quietly drift apart between vendors.

export const MAX_OUTPUT_LENGTH = 140; // hard ceiling; the prompt itself asks for <=100

export interface WarmConfirmationParams {
  venueName: string;
  day: string; // French day label, e.g. "samedi"
  time: string; // "HH:MM"
  partnerName: string;
  streakCount: number | null; // count of past confirmed weeks, if known
  // Set only when weather actually changed which venue got picked this
  // week (see lib/weather.ts + weekly-propose/route.ts) — never just
  // because it happens to be raining. Passing this on a week where the
  // pick would've been the same regardless would make the model narrate a
  // reason that isn't the real one, which is exactly what the "narrate,
  // don't fabricate" rule in the AI-opportunities memo warns against.
  weatherSwapNote: string | null;
}

export const CONFIRMATION_SYSTEM_PROMPT =
  "Tu écris UNE seule ligne de confirmation chaleureuse en français pour une " +
  "appli de rendez-vous hebdomadaire entre deux proches. Règles strictes : " +
  "mentionne le lieu, le jour et l'heure fournis ; français uniquement ; pas " +
  "d'emoji ; pas de guillemets ; maximum 100 caractères ; ton chaleureux mais " +
  "sobre, jamais mièvre, sans formule de politesse finale (pas de \"Bonne " +
  "soirée\", \"À bientôt\", etc). Si une raison météo est fournie, glisse-la " +
  "naturellement en une courte proposition (ex: \"vu la pluie annoncée, " +
  "plutôt...\") plutôt que de l'ignorer. Réponds uniquement avec la ligne, " +
  "rien d'autre, sans explication.";

export function buildConfirmationUserContent(params: WarmConfirmationParams): string {
  return (
    `Lieu: ${params.venueName}. Jour: ${params.day}. Heure: ${params.time}. ` +
    `Prénom du partenaire: ${params.partnerName}.` +
    (params.streakCount && params.streakCount > 0
      ? ` Nombre de semaines déjà partagées: ${params.streakCount}.`
      : "") +
    (params.weatherSwapNote ? ` Raison météo du choix: ${params.weatherSwapNote}.` : "")
  );
}

// Same acceptance bar for every vendor: non-empty, single line, under the
// hard length ceiling. A model that fails this is treated identically to
// a network error — the caller falls through to the next option.
export function isValidConfirmationLine(content: unknown): content is string {
  if (typeof content !== "string") return false;
  const line = content.trim();
  return Boolean(line) && line.length <= MAX_OUTPUT_LENGTH && !line.includes("\n");
}
