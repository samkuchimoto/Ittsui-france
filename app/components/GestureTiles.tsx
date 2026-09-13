"use client";
// /app/components/GestureTiles.tsx
// The "Envoyer une attention" tiles, made answerable.
//
// They were three static cards with a one-line description each. Same
// dead-affordance problem as the duo tiles: they look like they open,
// and a visitor wondering "what would I actually send?" got nothing back
// for tapping. Each one expands now to the concrete thing behind it —
// for the curated mode, the real category list the gesture flow offers
// (lib/gestureLinks.ts), which is the same set /geste/nouveau will show
// if they go through with it.
//
// No prices. The brief this implements asked for "transparent pricing",
// and there is none to be transparent about: Ittsui doesn't sell these,
// has no merchant API, and hands the sender off to a real shop to finish
// the purchase themselves (see lib/gestureLinks.ts's header for why that
// is the honest v1). Quoting a price Ittsui neither sets nor collects
// would be inventing the one number a visitor would most reasonably
// hold it to.

import { useState } from "react";
import Link from "next/link";
import { MUTED, ACCENT, BORDER } from "@/lib/theme";
import { IconArrowRight } from "@/app/components/HomeIcons";
import { CURATED_ITEMS, CURATED_ITEM_LABEL } from "@/lib/gestureLinks";

const TILES = [
  {
    id: "own",
    emoji: "🎁",
    title: "Un objet qui vient de vous",
    body: "Envoyez quelque chose que vous avez déjà et qui vous fait penser à cette personne.",
    // Was: "...et un coursier passe le récupérer chez vous." Ittsui no
    // longer dispatches couriers (2026-09-13), so that sentence became a
    // promise the product doesn't keep — on the landing page, which is
    // the worst place to make one.
    detail:
      "Un livre que vous avez fini, une photo tirée, un pull qu'elle vous empruntait tout le temps. Vous le décrivez, la personne vous dit où l'envoyer — ou qu'elle préfère le recevoir en main propre la prochaine fois que vous vous voyez.",
    items: [] as string[],
  },
  {
    id: "curated",
    emoji: "🛍️",
    title: "Une petite attention",
    body: "Choisissez un type de geste et faites-le livrer.",
    detail: "Les catégories proposées aujourd'hui :",
    items: CURATED_ITEMS.map((i) => CURATED_ITEM_LABEL[i]),
  },
  {
    id: "suggested",
    emoji: "✨",
    title: "Laissez Ittsui trouver l'idée",
    body: "Une suggestion toute faite, pour ne pas avoir à réfléchir.",
    detail:
      "Ittsui pioche dans les mêmes catégories et vous en propose une. Pas d'algorithme qui prétend connaître votre proche — juste une décision de moins à prendre, rejouable autant de fois que vous voulez.",
    items: [] as string[],
  },
];

export function GestureTiles() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3 sm:items-start">
      {TILES.map((tile) => {
        const expanded = open === tile.id;
        return (
          <div
            key={tile.id}
            className="overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-sm"
            style={{ borderColor: expanded ? ACCENT : BORDER }}
          >
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : tile.id)}
              className="w-full p-5 text-left"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                style={{ backgroundColor: `${ACCENT}14` }}
              >
                {tile.emoji}
              </span>
              <span className="mt-4 block text-sm font-medium">{tile.title}</span>
              <span className="mt-1 block text-xs leading-relaxed" style={{ color: MUTED }}>
                {tile.body}
              </span>
              <span className="mt-3 block text-xs font-medium" style={{ color: ACCENT }}>
                {expanded ? "Replier" : "Voir des exemples →"}
              </span>
            </button>

            {expanded && (
              <div className="border-t px-5 py-4" style={{ borderColor: BORDER }}>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                  {tile.detail}
                </p>
                {tile.items.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tile.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href="/geste/nouveau"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-4"
                  style={{ color: ACCENT }}
                >
                  Envoyer ce geste
                  <IconArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
