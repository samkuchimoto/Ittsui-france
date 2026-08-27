"use client";
// /app/geste/nouveau/page.tsx
// "Envoyer un geste" — a physical gesture (or just a note) as a distinct
// relationship action alongside a rendez-vous, not an ecommerce
// marketplace. Four modes (a broad multi-AI review of this feature
// converged on this exact framing on 2026-08-27 — see
// docs/three-fronts-and-gestures.md), shown as an equal-weight tab
// alongside /request/new rather than a link buried in the dashboard:
//   - "own": something the sender already has. Zero API, zero delivery
//     arrangement — Ittsui only notifies the recipient; getting the
//     object to them is the sender's own problem, same as it would be
//     without this feature at all.
//   - "curated": a small, deliberately non-Amazon list of gesture types
//     (lib/gestureLinks.ts), each linking to one real merchant homepage.
//   - "suggested": Ittsui picks one curated item for the sender so they
//     don't have to — reshuffleable, honest decision-load removal.
//   - "message": no object at all, just a note — the zero-friction floor
//     of the whole feature.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import type { User } from "firebase/auth";
import { watchAuthState } from "@/lib/firebase";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { CURATED_ITEM_LABEL, CURATED_ITEMS, curatedItemExternalLink, suggestCuratedItem } from "@/lib/gestureLinks";
import type { GestureMode, CuratedGestureItem, Contact } from "@/lib/types";
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

const MODES: { id: GestureMode; emoji: string; title: string; subtitle: string }[] = [
  { id: "own", emoji: "🎁", title: "Quelque chose que vous avez", subtitle: "Un objet qui vous appartient déjà." },
  { id: "curated", emoji: "🛍️", title: "Quelque chose à choisir", subtitle: "Choisissez un type de geste." },
  { id: "suggested", emoji: "✨", title: "Laissez Ittsui vous proposer", subtitle: "Une petite idée, sans avoir à réfléchir." },
  { id: "message", emoji: "💌", title: "Un mot doux", subtitle: "Juste leur faire savoir que vous pensez à eux." },
];

export default function NewGesturePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | false | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [mode, setMode] = useState<GestureMode | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [item, setItem] = useState<CuratedGestureItem>(() => suggestCuratedItem());
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [gestureUrl, setGestureUrl] = useState<string | null>(null);

  // Signed-in convenience only — this page stays fully usable with no
  // account (see the homepage's "sans créer de compte" link to it), the
  // same "show the full value first" boundary /request/new already
  // draws: only a saved contacts list requires being signed in, nothing
  // about actually sending a gesture does.
  useEffect(() => {
    return watchAuthState((u) => setUser(u ?? false));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/contacts", { headers: { Authorization: `Bearer ${idToken}` } });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts ?? []);
      }
    })();
  }, [user]);

  function pickContact(contact: Contact) {
    setRecipientName(contact.name);
    setRecipientEmail(contact.email ?? "");
    setRecipientPhone(contact.phone ?? "");
  }

  const externalLink = mode && mode !== "own" && mode !== "message" ? curatedItemExternalLink(item) : null;
  const canSubmit =
    mode === "own" ? itemDescription.trim().length > 0 : mode === "message" ? notes.trim().length > 0 : true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/gestures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          ...(senderEmail ? { senderEmail } : {}),
          recipientName,
          ...(recipientEmail ? { recipientEmail } : {}),
          ...(recipientPhone ? { recipientPhone } : {}),
          mode,
          ...(mode === "own" ? { itemDescription } : {}),
          ...(mode === "curated" || mode === "suggested" ? { item } : {}),
          ...(notes ? { notes } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setGestureUrl(data.gestureUrl);
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
          {mode === "own" && (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Ittsui n&apos;organise pas la remise — à vous de voir avec {recipientName} comment le lui faire
              parvenir.
            </p>
          )}
          {mode === "message" && (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Votre mot est parti, rien d&apos;autre à faire.
            </p>
          )}
          {(mode === "curated" || mode === "suggested") && (
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
          {recipientPhone && gestureUrl && (
            <button
              type="button"
              onClick={() => shareLink({ title: "Ittsui", text: `${senderName} vous envoie un geste.`, url: gestureUrl })}
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

        {/* Same two-tab framing as /request/new, mirrored — either page is
            a legitimate front door, not a hidden alternate path. */}
        <div className="mt-4 flex gap-2">
          <Link
            href="/request/new"
            className="flex-1 rounded-full border px-4 py-2.5 text-center text-sm font-medium"
            style={{ borderColor: BORDER, color: INK }}
          >
            ☕ Se voir
          </Link>
          <span
            className="flex-1 rounded-full px-4 py-2.5 text-center text-sm font-medium text-white"
            style={{ backgroundColor: ACCENT }}
          >
            🎁 Envoyer un geste
          </span>
        </div>

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

            {mode !== "message" && (
              <div>
                <label className="block text-sm font-medium">
                  Votre e-mail <span className="font-normal" style={{ color: MUTED }}>(optionnel — pour être prévenu de sa réponse)</span>
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                  style={{ borderColor: BORDER }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Pour qui ?</label>
              {/* Signed-in users with saved contacts get to tap someone
                  they already know instead of retyping a name every time
                  — the same chip row /request/new already uses, capped
                  at 5 with a link to the rest. */}
              {contacts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {contacts.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickContact(c)}
                      className="rounded-full border px-3 py-1.5 text-xs"
                      style={
                        recipientName === c.name
                          ? { borderColor: ACCENT, backgroundColor: `${ACCENT}1A`, color: ACCENT }
                          : { borderColor: BORDER, color: INK }
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                  {contacts.length > 5 && (
                    <Link href="/contacts" className="flex items-center px-1 text-xs underline underline-offset-4" style={{ color: MUTED }}>
                      Voir tous ({contacts.length}) →
                    </Link>
                  )}
                </div>
              )}
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
                {mode === "message" ? "Votre mot" : "Un mot"}{" "}
                {mode !== "message" && (
                  <span className="font-normal" style={{ color: MUTED }}>
                    (optionnel)
                  </span>
                )}
              </label>
              <textarea
                required={mode === "message"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={mode === "message" ? 4 : 2}
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
