"use client";
// /app/components/OriginStorySheet.tsx
// The "Origin Story Sheet" touchpoint from the mascot motion framework —
// an optional, skippable 3-slide context card narrated by the mascot
// pair, distinct from /a-propos (the full, linked-from-footer version of
// the same story): this one surfaces proactively, once, during onboarding
// itself, directly answering Tester #3's "would be nice to have
// background and context" rather than waiting for someone to find a
// footer link. Shown at most once per browser (localStorage-gated) and
// dismissible at any point — never a screen someone is forced through,
// matching AGENTS.md's "does this add a screen someone has to check?"
// restraint.

import { useEffect, useState } from "react";
import { MascotPair } from "./MascotPair";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

const STORAGE_KEY = "ittsui_seen_origin_story";

const SLIDES = [
  {
    body: "Avant Ittsui, six mois de volontariat dans des fermes biologiques à Yugawara puis Negoro, au Japon. De longues journées simples — et une question qui a commencé à me travailler : dans une ville de millions de gens, comment est-ce qu'on finit quand même par se sentir seul ?",
  },
  {
    body: "Le voyage a continué jusqu'à Prague. Un soir, arrivé tard, l'auberge prévue était fermée. Dans une autre, j'ai rencontré une voyageuse japonaise, et on a fini par parler de cette idée encore floue d'application.",
  },
  {
    quote: "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »",
    body: "C'est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme : une seule proposition, une seule décision, puis le silence jusqu'à la prochaine fois.",
  },
];

export function OriginStorySheet() {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode, blocked) — just skip the
      // sheet rather than risk showing it every visit with no way to
      // remember it was dismissed.
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  if (!open) return null;

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
        <MascotPair size={48} />
        <p className="mt-5 text-[15px] leading-relaxed" style={{ color: INK }}>
          {"quote" in current && (
            <span className="mb-3 block italic" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: ACCENT }}>
              {current.quote}
            </span>
          )}
          {current.body}
        </p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === slide ? "1.25rem" : "0.375rem", backgroundColor: i <= slide ? ACCENT : BORDER }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => (isLast ? dismiss() : setSlide((s) => s + 1))}
          className="mt-6 min-h-[48px] w-full rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          {isLast ? "Découvrir Ittsui" : "Suivant"}
        </button>
        <button type="button" onClick={dismiss} className="mt-3 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Passer
        </button>
      </div>
    </div>
  );
}
