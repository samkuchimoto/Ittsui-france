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
import type { CuratedGestureItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

type Tile = { id: string; emoji: string; title: string; body: string; detail: string; items: string[] };

// The category names in English and Japanese. lib/gestureLinks.ts keeps
// the French ones the gesture flow itself uses.
const ITEM_LABEL: Record<Exclude<Locale, "fr">, Record<CuratedGestureItem, string>> = {
  en: {
    fleurs: "Flowers",
    livre: "A book",
    chocolat: "Chocolates",
    plante: "A plant",
    bougie: "A candle",
    papeterie: "Nice stationery",
    repas: "A meal delivered",
    autre: "Other",
  },
  ja: {
    fleurs: "花",
    livre: "本",
    chocolat: "チョコレート",
    plante: "植物",
    bougie: "キャンドル",
    papeterie: "すてきな文房具",
    repas: "食事のデリバリー",
    autre: "その他",
  },
  // Not translated yet: shown in English.
  es: {
    fleurs: "Flowers",
    livre: "A book",
    chocolat: "Chocolates",
    plante: "A plant",
    bougie: "A candle",
    papeterie: "Nice stationery",
    repas: "A meal delivered",
    autre: "Other",
  },
  he: {
    fleurs: "Flowers",
    livre: "A book",
    chocolat: "Chocolates",
    plante: "A plant",
    bougie: "A candle",
    papeterie: "Nice stationery",
    repas: "A meal delivered",
    autre: "Other",
  },
};

const UI: Record<Locale, { close: string; examples: string; send: string }> = {
  fr: { close: "Replier", examples: "Voir des exemples →", send: "Envoyer ce geste" },
  en: { close: "Close", examples: "See examples →", send: "Send this gesture" },
  ja: { close: "閉じる", examples: "例を見る →", send: "この贈りものを送る" },
  // Not translated yet: shown in English.
  es: { close: "Close", examples: "See examples →", send: "Send this gesture" },
  he: { close: "Close", examples: "See examples →", send: "Send this gesture" },
};

const TILES: Tile[] = [
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

// The gesture flow hands the sender off to French shops to finish the
// order (see lib/gestureLinks.ts), which a French visitor takes for
// granted and nobody else would; the translations say it.
const TILES_BY_LOCALE: Record<Locale, Tile[]> = {
  fr: TILES,
  en: [
    {
      id: "own",
      emoji: "🎁",
      title: "Something of yours",
      body: "Send something you already have that makes you think of them.",
      detail:
        "A book you've finished, a printed photo, the jumper she always borrowed. You describe it, and they tell you where to send it, or that they'd rather get it from you in person next time you meet.",
      items: [],
    },
    {
      id: "curated",
      emoji: "🛍️",
      title: "A small gift",
      body: "Pick a kind of gesture and have it delivered.",
      detail: "The categories on offer today (you finish the order on a French shop's website):",
      items: CURATED_ITEMS.map((i) => ITEM_LABEL.en[i]),
    },
    {
      id: "suggested",
      emoji: "✨",
      title: "Let Ittsui find the idea",
      body: "A ready-made suggestion, so you don't have to think about it.",
      detail:
        "Ittsui picks from the same categories and suggests one. No algorithm pretending to know the person you love: just one less decision to make, as many times as you like.",
      items: [],
    },
  ],
  ja: [
    {
      id: "own",
      emoji: "🎁",
      title: "手元にあるものを贈る",
      body: "相手を思い出させる、あなたの持ちものを贈りましょう。",
      detail:
        "読み終えた本、プリントした写真、いつも貸していたセーター。どんなものかを伝えると、相手が送り先を教えてくれます。「次に会ったときに手渡しで」という返事でもかまいません。",
      items: [],
    },
    {
      id: "curated",
      emoji: "🛍️",
      title: "ちょっとした贈りもの",
      body: "贈りものの種類を選んで、届けてもらいましょう。",
      detail: "現在選べるカテゴリー（注文はフランスのショップのサイトで完了します）：",
      items: CURATED_ITEMS.map((i) => ITEM_LABEL.ja[i]),
    },
    {
      id: "suggested",
      emoji: "✨",
      title: "アイデアはIttsuiにおまかせ",
      body: "考えなくていい、すぐに使える提案です。",
      detail:
        "Ittsuiが同じカテゴリーからひとつ提案します。大切な人のことを知っているふりをするアルゴリズムではありません。決めることがひとつ減るだけ。何度でも引き直せます。",
      items: [],
    },
  ],
  // Not translated yet: shown in English.
  es: [
    {
      id: "own",
      emoji: "🎁",
      title: "Something of yours",
      body: "Send something you already have that makes you think of them.",
      detail:
        "A book you've finished, a printed photo, the jumper she always borrowed. You describe it, and they tell you where to send it, or that they'd rather get it from you in person next time you meet.",
      items: [],
    },
    {
      id: "curated",
      emoji: "🛍️",
      title: "A small gift",
      body: "Pick a kind of gesture and have it delivered.",
      detail: "The categories on offer today (you finish the order on a French shop's website):",
      items: CURATED_ITEMS.map((i) => ITEM_LABEL.en[i]),
    },
    {
      id: "suggested",
      emoji: "✨",
      title: "Let Ittsui find the idea",
      body: "A ready-made suggestion, so you don't have to think about it.",
      detail:
        "Ittsui picks from the same categories and suggests one. No algorithm pretending to know the person you love: just one less decision to make, as many times as you like.",
      items: [],
    },
  ],
  he: [
    {
      id: "own",
      emoji: "🎁",
      title: "Something of yours",
      body: "Send something you already have that makes you think of them.",
      detail:
        "A book you've finished, a printed photo, the jumper she always borrowed. You describe it, and they tell you where to send it, or that they'd rather get it from you in person next time you meet.",
      items: [],
    },
    {
      id: "curated",
      emoji: "🛍️",
      title: "A small gift",
      body: "Pick a kind of gesture and have it delivered.",
      detail: "The categories on offer today (you finish the order on a French shop's website):",
      items: CURATED_ITEMS.map((i) => ITEM_LABEL.en[i]),
    },
    {
      id: "suggested",
      emoji: "✨",
      title: "Let Ittsui find the idea",
      body: "A ready-made suggestion, so you don't have to think about it.",
      detail:
        "Ittsui picks from the same categories and suggests one. No algorithm pretending to know the person you love: just one less decision to make, as many times as you like.",
      items: [],
    },
  ],
};

export function GestureTiles({ lang = "fr" }: { lang?: Locale } = {}) {
  const [open, setOpen] = useState<string | null>(null);
  const ui = UI[lang];

  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3 sm:items-start">
      {TILES_BY_LOCALE[lang].map((tile) => {
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
              className="w-full p-5 text-start"
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
                {expanded ? ui.close : ui.examples}
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
                  {ui.send}
                  <IconArrowRight className="h-3 w-3 rtl:-scale-x-100" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
