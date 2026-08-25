// Natural-language intake for the ad-hoc meeting-request form
// (/request/new): "un café avec Marie mardi soir vers Bastille" -> a
// best-effort guess at recipientName/venueName/venueType/date/time. This
// is the scenario the AI-opportunities memo scoped as the safest next
// build — it plays to Mistral's real, verified strength (fast structured
// extraction) rather than the reasoning-heavy weakness some Groq models
// showed for the confirmation-text job.
//
// Narrate/assist, never decide: this ONLY pre-fills the form's existing
// fields. Nothing is ever sent without the person reviewing and hitting
// "Envoyer" themselves. A failed, timed-out, or malformed parse returns
// null — the caller's fallback is the untouched manual form, exactly the
// same resilience shape as every other AI call in this codebase.
//
// DATE HANDLING — a real bug found and fixed in testing, not a
// hypothetical: the model's own date ARITHMETIC was unreliable. "mardi"
// resolved correctly some runs and wrongly on others; "demain" resolved
// wrong on every single run, even after the prompt explicitly handed it
// the pre-computed answer ("demain" = 2026-08-25) — it recomputed its own
// (wrong) answer anyway rather than using the one it was given. Time
// extraction ("15h", "soir" -> 19:00), by contrast, was 100% consistent
// across every test run, because it's pattern-matching, not arithmetic.
// So the model is only ever asked to CLASSIFY which relative day was
// meant (a closed set it can pick from), never to compute a date — the
// actual arithmetic happens in nextDateFor() below, in plain deterministic
// code. Same "narrate, don't decide" split this codebase already applies
// to venue selection.

import { z } from "zod";
import { mistralComplete } from "@/lib/mistral";
import { dayLabel } from "@/lib/notify";
import { parisNow, WEEKDAYS, type Weekday } from "@/lib/timezone";
import type { VenueType } from "@/lib/types";

const RELATIVE_DAYS = ["today", "tomorrow", "day_after_tomorrow", ...WEEKDAYS] as const;
type RelativeDay = (typeof RELATIVE_DAYS)[number];

const responseSchema = z.object({
  recipientName: z.string().trim().min(1).max(100).nullable().optional(),
  venueName: z.string().trim().min(1).max(200).nullable().optional(),
  venueAddress: z.string().trim().min(1).max(300).nullable().optional(),
  venueType: z.enum(["cafe", "restaurant", "home", "park", "museum"]).nullable().optional(),
  relativeDay: z.enum(RELATIVE_DAYS).nullable().optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
});

export interface ParsedMeetingRequest {
  recipientName: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueType: VenueType | null;
  date: string | null;
  time: string | null;
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// Deterministic resolution — the part that must never be delegated to the
// model. A named weekday always means the NEXT occurrence strictly in the
// future (1-7 days out), never "today" even if today happens to match —
// matching how the phrase is actually used in a casual request for a
// future meetup.
function nextDateFor(relativeDay: RelativeDay, todayISO: string, todayWeekday: Weekday): string {
  if (relativeDay === "today") return todayISO;
  if (relativeDay === "tomorrow") return addDaysISO(todayISO, 1);
  if (relativeDay === "day_after_tomorrow") return addDaysISO(todayISO, 2);
  const offset = ((WEEKDAYS.indexOf(relativeDay) - WEEKDAYS.indexOf(todayWeekday) + 7 - 1) % 7) + 1;
  return addDaysISO(todayISO, offset);
}

function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function buildSystemPrompt(todayISO: string, todayWeekdayLabel: string): string {
  return (
    "Tu extrais des informations structurées d'une courte description en " +
    "français d'un rendez-vous entre deux proches. Réponds UNIQUEMENT avec " +
    "un objet JSON valide, sans backticks, sans explication. Champs (null " +
    "si absent ou incertain) : recipientName (prénom ou nom de la " +
    "personne), venueName (nom du lieu s'il est nommé), venueAddress " +
    "(adresse uniquement si elle est explicitement mentionnée, jamais " +
    "inventée), venueType (un seul parmi : cafe, restaurant, home, park, " +
    "museum — ou null), time (format HH:MM, 24h ; \"soir\" sans heure " +
    "précise = 19:00 ; \"midi\" = 12:00), relativeDay — NE CALCULE AUCUNE " +
    "DATE toi-même, choisis uniquement la catégorie qui correspond au " +
    "texte parmi : today, tomorrow, day_after_tomorrow, mon, tue, wed, " +
    "thu, fri, sat, sun (ou null si aucun jour n'est mentionné). " +
    `Aujourd'hui nous sommes ${todayWeekdayLabel} (pour référence ` +
    `uniquement, ne sert pas à calculer une date). Exemples : "demain" -> ` +
    '"tomorrow" ; "mardi" -> "tue" ; "dimanche" -> "sun".'
  );
}

export async function parseMeetingRequestText(text: string): Promise<ParsedMeetingRequest | null> {
  const { dateStr, weekday } = parisNow();
  const content = await mistralComplete(buildSystemPrompt(dateStr, dayLabel(weekday)), text, {
    model: "mistral-small-latest",
    maxTokens: 200,
    temperature: 0.2,
  });
  if (!content) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFence(content));
  } catch {
    return null; // malformed JSON — the manual form is the correct fallback, not an error
  }

  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return null;

  return {
    recipientName: parsed.data.recipientName ?? null,
    venueName: parsed.data.venueName ?? null,
    venueAddress: parsed.data.venueAddress ?? null,
    venueType: parsed.data.venueType ?? null,
    date: parsed.data.relativeDay ? nextDateFor(parsed.data.relativeDay, dateStr, weekday) : null,
    time: parsed.data.time ?? null,
  };
}
