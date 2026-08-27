"use client";
// /app/cadeau/nouveau/page.tsx
// "Envoyer un geste" — a physical gift/gesture as a distinct alternative
// to a rendez-vous, real product idea: diversify what a relationship
// touchpoint on Ittsui can be, not just a meeting. Honest v1: this
// points the sender at a real external service (lib/giftLinks.ts) to
// actually pick and pay for something — Ittsui has no live purchase or
// delivery integration with Amazon/Deliveroo/Uber/a florist yet (see
// docs/gift-feature.md for what a real one would need).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { GIFT_CATEGORY_LABEL, giftExternalLink } from "@/lib/giftLinks";
import type { GiftCategory } from "@/lib/types";
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

const CATEGORIES: GiftCategory[] = ["repas", "objet", "fleurs", "autre"];

export default function NewGiftPage() {
  const router = useRouter();
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [category, setCategory] = useState<GiftCategory>("repas");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [giftUrl, setGiftUrl] = useState<string | null>(null);

  const externalLink = giftExternalLink(category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          category,
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
          <p className="mt-2 text-sm" style={{ color: MUTED }}>
            Il ne reste plus qu&apos;à finaliser {GIFT_CATEGORY_LABEL[category].toLowerCase()} vous-même.
          </p>
          {externalLink.url && (
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
          Envoyer un geste
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Pas envie ou pas le temps d&apos;un rendez-vous cette semaine ? Un objet, un repas livré ou des
          fleurs peuvent dire la même chose.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            <label className="block text-sm font-medium">Quel genre de geste ?</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="rounded-full border px-3.5 py-2 text-sm transition-colors"
                  style={
                    category === c
                      ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                      : { borderColor: BORDER, color: INK }
                  }
                >
                  {GIFT_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
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
            disabled={status === "submitting" || (!recipientEmail && !recipientPhone)}
            className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {status === "submitting" ? "Envoi..." : "Prévenir " + (recipientName || "la personne")}
          </button>
        </form>
      </div>
    </main>
  );
}
