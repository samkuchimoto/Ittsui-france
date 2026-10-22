"use client";
// /app/components/DuoSandbox.tsx
// The interactive sandbox for the "just browsing" visitor — verbatim from
// the user research this implements: "Deux types: ceux d'utilisateurs qui
// vont vers le site, un autre qui juste browsing" and "L'appli qui doit
// lui dire c'est quoi sans chercher".
//
// What it replaces: two separate static sections. Four photo tiles
// labelled Amis / Partenaire / Famille / Parents that did nothing when
// tapped ("Image not clikable"), and, several screens below them, a demo
// card fixed to a single Paris café. A browser had to scroll between the
// two and connect them mentally.
//
// They are one control surface now. Picking a duo reconfigures the live
// card underneath it — different person, different day, different venue,
// each one a real address from the same catalog the production proposal
// pipeline falls back to (lib/venueCatalog.ts). Nothing here is a
// screenshot: every tap does the thing it looks like it does, which is
// the answer to "En naviguant au lieu de naviguer c'est la confirmation
// cad satisfaire" — navigating should confirm, not just display.

import { useState } from "react";
import Image from "next/image";
import { MUTED, ACCENT, BORDER } from "@/lib/theme";
import { FridayCard } from "@/app/components/FridayCard";
import { sandboxScenarios, scenarioFor, type DuoContext } from "@/lib/sandboxScenarios";
import type { Locale } from "@/lib/i18n";

const COPY: Record<Locale, { tabs: string; hint: string }> = {
  fr: {
    tabs: "Avec qui",
    hint: "Voici la proposition qu'Ittsui enverrait. Glissez la carte, échangez le lieu, ou validez — c'est exactement l'application.",
  },
  en: {
    tabs: "Who with",
    hint: "This is the proposal Ittsui would send. Swipe the card, swap the place, or confirm: it works exactly like the app.",
  },
  ja: {
    tabs: "誰と",
    hint: "これがIttsuiから届く提案です。カードをスワイプしたり、場所を入れ替えたり、確定したり。実際のアプリと同じように動きます。",
  },
  es: {
    tabs: "Con quién",
    hint: "Esta es la propuesta que Ittsui enviaría. Desliza la tarjeta, cambia el lugar o confirma: funciona exactamente como la app.",
  },
  he: {
    tabs: "עם מי",
    hint: "זו ההצעה ש-Ittsui הייתה שולחת. החליקו את הכרטיס, החליפו מקום או אשרו: זה עובד בדיוק כמו באפליקציה.",
  },
};

export function DuoSandbox({ lang = "fr" }: { lang?: Locale } = {}) {
  const [active, setActive] = useState<DuoContext>("amis");
  const scenario = scenarioFor(active, lang);

  return (
    <div>
      <div
        className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
        role="tablist"
        aria-label={COPY[lang].tabs}
      >
        {sandboxScenarios(lang).map((s) => {
          const selected = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(s.id)}
              // flex-col, not the default: a <button> centres its content
              // box vertically, so once one tile's label wrapped to two
              // lines the grid stretched all four and the three shorter
              // ones floated their photos ~4px down out of alignment.
              className="flex flex-col overflow-hidden rounded-2xl border bg-white text-start transition-transform hover:scale-[1.02]"
              style={{
                borderColor: selected ? ACCENT : BORDER,
                boxShadow: selected ? `0 0 0 1px ${ACCENT}` : undefined,
              }}
            >
              <div className="relative h-24 w-full shrink-0 sm:h-28">
                <Image
                  src={s.tilePhoto}
                  alt={s.tileAlt}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-[filter] duration-300"
                  style={{ filter: selected ? "none" : "saturate(0.75)" }}
                />
              </div>
              {/* Fixed two-line box: "Vos ami(e)s proches" wraps and the
                  other three don't, which made one tile taller than its
                  neighbours and the whole row look misaligned. */}
              <p
                className="flex min-h-[2.75rem] items-center justify-center px-2 py-2 text-center text-xs font-medium leading-snug sm:text-[13px]"
                style={{ color: selected ? ACCENT : undefined }}
              >
                {s.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Over the hero footage, so light rather than MUTED — at #565049
          this line was effectively invisible on the dark scrim. */}
      <p className="mt-5 text-center text-sm" style={{ color: "rgba(255,253,249,0.82)" }}>
        {COPY[lang].hint}
      </p>

      <div className="mt-6">
        <FridayCard scenario={scenario} lang={lang} />
      </div>
    </div>
  );
}
