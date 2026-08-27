"use client";
// /app/cadeau/nouveau/page.tsx
// "Envoyer un geste" — a physical gesture as a distinct relationship
// action alongside a rendez-vous, not an ecommerce marketplace. Three
// modes (a broad multi-AI review of this feature converged on this
// exact framing on 2026-08-27 — see docs/three-fronts-and-gifting.md):
//   - "own": something the sender already has. Zero API, zero delivery
//     arrangement — Ittsui only notifies the recipient; getting the
//     object to them is the sender's own problem, same as it would be
//     without this feature at all.
//   - "curated": a small, deliberately non-Amazon list of gesture types
//     (lib/giftLinks.ts), each linking to one real merchant homepage.
//   - "suggested": Ittsui picks one curated item so the sender doesn't
//     have to — reshuffleable, and honestly just decision-load removal,
//     not a claim of personal knowledge about the recipient.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { CURATED_ITEM_LABEL, CURATED_ITEMS, curatedItemExternalLink, suggestCuratedItem } from "@/lib/giftLinks";
import type { GiftMode, CuratedGiftItem } from "@/lib/types";
import { shareLink } from "@/lib/shareLink";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const MODES: { id: GiftMode; emoji: string; title: string; subtitle: string }[] = [
  { id: "own", emoji: "🎁", title: "Quelque chose que vous avez", subtitle: "Un objet qui vous appartient déjà." },
  { id: "curated", emoji: "🛍️", title: "Quelque chose à choisir", subtitle: "Choisissez un type de geste." },
  { id: "suggested", emoji: "✨", title: "Laissez Ittsui vous proposer", subtitle: "Une petite idée, sans avoir à réfléchir." },
];

export default function NewGiftPage() {
  const router = useRouter();
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [mode, setMode] = useState<GiftMode | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [item, setItem] = useState<CuratedGiftItem>(() => suggestCuratedItem());
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [giftUrl, setGiftUrl] = useState<string | null>(null);

  const externalLink = mode !== "own" ? curatedItemExternalLink(item) : null;
  const canSubmit = mode === "own" ? itemDescription.trim().length > 0 : true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          recipientName,
          ...(recipientEmail ? { recipientEmail } : {}),
          ...(recipientPhone ? { recipientPhone } : {}),
          mode,
          ...(mode === "own" ? { itemDescription } : { item }),
          ...(notes ? { notes } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setGiftUrl(data.giftUrl);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main
        className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
        style={{ color: INK }}
      >
        <div className="mx-auto max-w-md px-6 py-14 text-center">
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
            {recipientName} a été prévenu(e)
          </h1>
          {mode === "own" ? (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Ittsui n&apos;organise pas la remise — à vous de voir avec {recipientName} comment le lui faire
              parvenir.
            </p>
          ) : (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Il ne reste plus qu&apos;à finaliser {CURATED_ITEM_LABEL[item].toLowerCase()} vous-même.
            </p>
          )}
          {externalLink && externalLink.url && (
            <a
              href={externalLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full py-3.5 text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              {externalLink.label} →
            </a>
          )}
          {recipientPhone && giftUrl && (
            <button
              type="button"
              onClick={() => shareLink({ title: "Ittsui", text: `${senderName} vous envoie un geste.`, url: giftUrl })}
              className="mt-3 w-full rounded-full border py-3 text-sm font-medium"
              style={{ borderColor: BORDER, color: INK }}
            >
              Partager le lien à {recipientName}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full text-sm underline underline-offset-4"
            style={{ color: MUTED }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-14">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>

        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          Envoyer quelque chose
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Pas envie ou pas le temps d&apos;un rendez-vous cette semaine ? Un petit geste peut dire la même
          chose.
        </p>

        <div className="mt-6 space-y-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className="flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors"
              style={
                mode === m.id
                  ? { borderColor: ACCENT, backgroundColor: "rgba(184,78,42,0.06)" }
                  : { borderColor: BORDER, backgroundColor: "white" }
              }
            >
              <span className="text-xl leading-none">{m.emoji}</span>
              <span>
                <span className="block text-sm font-medium">{m.title}</span>
                <span className="block text-xs" style={{ color: MUTED }}>
                  {m.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>

        {mode && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "own" && (
              <div>
                <label className="block text-sm font-medium">Qu&apos;avez-vous envie de lui envoyer ?</label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Un livre que j'ai déjà lu, une photo, un pull..."
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                  style={{ borderColor: BORDER }}
                />
              </div>
            )}

            {mode === "curated" && (
              <div>
                <label className="block text-sm font-medium">Quel genre de geste ?</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CURATED_ITEMS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setItem(c)}
                      className="rounded-full border px-3.5 py-2 text-sm transition-colors"
                      style={
                        item === c
                          ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                          : { borderColor: BORDER, color: INK }
                      }
                    >
                      {CURATED_ITEM_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "suggested" && (
              <div className="rounded-2xl border p-4 text-center" style={{ borderColor: BORDER }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>
                  Ittsui vous propose
                </p>
                <p className="mt-1 text-lg font-medium">{CURATED_ITEM_LABEL[item]}</p>
                <button
                  type="button"
                  onClick={() => setItem((current) => suggestCuratedItem(current))}
                  className="mt-2 text-xs underline underline-offset-4"
                  style={{ color: ACCENT }}
                >
                  Une autre idée
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Votre prénom</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Pour qui ?</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Son numéro ou son e-mail</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="Numéro de téléphone"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                style={{ borderColor: BORDER }}
              />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Ou son e-mail"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Un mot <span className="font-normal" style={{ color: MUTED }}>(optionnel)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                style={{ borderColor: BORDER }}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: ACCENT }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting" || !canSubmit || (!recipientEmail && !recipientPhone)}
              className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {status === "submitting" ? "Envoi..." : "Prévenir " + (recipientName || "la personne")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
