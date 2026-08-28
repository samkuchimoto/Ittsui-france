"use client";
// /app/geste/nouveau/page.tsx
// "Envoyer un geste" — a physical gesture (or just a note, or a real
// AI-generated illustration) as a distinct relationship action alongside
// a rendez-vous, not an ecommerce marketplace. Five modes (a broad
// multi-AI review of this feature converged on this exact framing on
// 2026-08-27 — see docs/three-fronts-and-gestures.md), shown as an
// equal-weight tab alongside /request/new rather than a link buried in
// the dashboard:
//   - "own": something the sender already has. Zero API, zero delivery
//     arrangement — Ittsui only notifies the recipient; getting the
//     object to them is the sender's own problem, same as it would be
//     without this feature at all.
//   - "curated": a small, deliberately non-Amazon list of gesture types
//     (lib/gestureLinks.ts), each linking to one real merchant homepage.
//     Includes a free-text "Autre" option — categories were flagged as
//     too restrictive, so this is the escape hatch rather than forcing
//     every real gesture into one of seven fixed buckets.
//   - "suggested": Ittsui picks one curated item for the sender so they
//     don't have to — reshuffleable, honest decision-load removal.
//   - "message": no object at all, just a note — the zero-friction floor
//     of the whole feature.
//   - "painting": a REAL AI-generated illustration (not a mockup) —
//     calls the same Fal.ai infrastructure already proven in
//     app/api/ai-venue-mood/route.ts. This is the one mode that produces
//     something the sender didn't have before, per direct feedback that
//     a pure category picker "does not bring value" on its own.

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

const ALL_MODES: { id: GestureMode; emoji: string; title: string; subtitle: string }[] = [
  { id: "own", emoji: "🎁", title: "Quelque chose que vous avez", subtitle: "Un objet qui vous appartient déjà." },
  { id: "curated", emoji: "🛍️", title: "Quelque chose à choisir", subtitle: "Choisissez un type de geste." },
  { id: "suggested", emoji: "✨", title: "Laissez Ittsui vous proposer", subtitle: "Une petite idée, sans avoir à réfléchir." },
  { id: "message", emoji: "💌", title: "Un mot doux", subtitle: "Juste leur faire savoir que vous pensez à eux." },
  { id: "painting", emoji: "🎨", title: "Une peinture Ittsui", subtitle: "Une illustration générée par IA, rien que pour vous deux." },
];

// Hidden rather than shown-but-broken while the Fal.ai account is
// waiting on a balance top-up (2026-08-28) — every real submission
// would fall back to the honest "not configured" message, which reads
// as a bug to someone testing the app rather than an unfinished
// feature. Flip NEXT_PUBLIC_GESTURE_PAINTING_ENABLED=true on Vercel and
// redeploy once Fal.ai is funded; no code change needed at that point.
const MODES = ALL_MODES.filter((m) => m.id !== "painting" || process.env.NEXT_PUBLIC_GESTURE_PAINTING_ENABLED === "true");

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
  const [customItem, setCustomItem] = useState("");
  const [notes, setNotes] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; url: string; previewUrl: string }[]>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [gestureUrl, setGestureUrl] = useState<string | null>(null);
  const [paintingImageUrl, setPaintingImageUrl] = useState<string | null>(null);

  async function searchGifs(e: React.FormEvent) {
    e.preventDefault();
    if (!gifQuery.trim()) return;
    setGifSearching(true);
    try {
      const res = await fetch(`/api/gestures/gif-search?q=${encodeURIComponent(gifQuery.trim())}`);
      const data = await res.json();
      setGifResults(res.ok ? (data.results ?? []) : []);
    } catch {
      setGifResults([]);
    } finally {
      setGifSearching(false);
    }
  }

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

  const externalLink =
    mode === "curated" || mode === "suggested" ? curatedItemExternalLink(item) : null;
  const canSubmit =
    mode === "own"
      ? itemDescription.trim().length > 0
      : mode === "message"
        ? notes.trim().length > 0
        : mode === "curated" && item === "autre"
          ? customItem.trim().length > 0
          : true;

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
          ...(mode === "own" && pickupAddress ? { pickupAddress } : {}),
          ...(mode === "own" && pickupPhone ? { pickupPhone } : {}),
          ...(mode === "curated" || mode === "suggested" ? { item } : {}),
          ...(mode === "curated" && item === "autre" ? { customItem } : {}),
          ...(notes ? { notes } : {}),
          ...(mode === "message" && gifUrl ? { gifUrl } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setGestureUrl(data.gestureUrl);
      setPaintingImageUrl(data.paintingImageUrl ?? null);
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
              {pickupAddress
                ? `Dès que ${recipientName} indique son adresse, un coursier peut venir récupérer l'objet chez vous.`
                : `Ittsui n'organise pas la remise — à vous de voir avec ${recipientName} comment le lui faire parvenir.`}
            </p>
          )}
          {mode === "message" && (
            <>
              <p className="mt-2 text-sm" style={{ color: MUTED }}>
                Votre mot est parti, rien d&apos;autre à faire.
              </p>
              {gifUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gifUrl} alt="" className="mx-auto mt-4 h-32 rounded-xl" />
              )}
            </>
          )}
          {(mode === "curated" || mode === "suggested") && (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Il ne reste plus qu&apos;à finaliser {(item === "autre" ? customItem : CURATED_ITEM_LABEL[item]).toLowerCase()} vous-même.
            </p>
          )}
          {mode === "painting" && paintingImageUrl && (
            <div className="relative mt-5 overflow-hidden rounded-2xl text-left" style={{ border: `1px solid ${BORDER}` }}>
              <span
                className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
              >
                Illustration générée par IA
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paintingImageUrl} alt="Peinture générée par IA" className="block w-full" />
            </div>
          )}
          {mode === "painting" && !paintingImageUrl && (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              La génération IA n&apos;est pas encore configurée sur Ittsui — votre mot a bien été envoyé à{" "}
              {recipientName} à la place.
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

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          Le geste
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className="flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-colors"
              style={
                mode === m.id
                  ? { borderColor: ACCENT, backgroundColor: "rgba(184,78,42,0.06)" }
                  : { borderColor: BORDER, backgroundColor: "white" }
              }
            >
              <span className="text-xl leading-none">{m.emoji}</span>
              <span className="text-sm font-medium leading-tight">{m.title}</span>
              <span className="text-xs leading-snug" style={{ color: MUTED }}>
                {m.subtitle}
              </span>
            </button>
          ))}
        </div>

        {mode && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {mode === "own" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                  L&apos;objet
                </p>
                <div className="mt-2 space-y-3 rounded-2xl border p-4" style={{ borderColor: BORDER, backgroundColor: "rgba(28,25,23,0.015)" }}>
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
                  <div className="border-t pt-3" style={{ borderColor: BORDER }}>
                    <label className="block text-sm font-medium">
                      Votre adresse{" "}
                      <span className="font-normal" style={{ color: MUTED }}>
                        (optionnel)
                      </span>
                    </label>
                    <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                      Permet à un vrai coursier de venir le récupérer chez vous.
                    </p>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="12 rue de la Paix, 75002 Paris"
                      className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                      style={{ borderColor: BORDER }}
                    />
                    {pickupAddress && (
                      <input
                        type="tel"
                        value={pickupPhone}
                        onChange={(e) => setPickupPhone(e.target.value)}
                        placeholder="Votre numéro (pour le coursier)"
                        className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                        style={{ borderColor: BORDER }}
                      />
                    )}
                  </div>
                </div>
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
                  {/* Free-text escape hatch — categories were flagged as
                      too restrictive; this doesn't force every gesture
                      into one of the seven fixed buckets. */}
                  <button
                    type="button"
                    onClick={() => setItem("autre")}
                    className="rounded-full border px-3.5 py-2 text-sm transition-colors"
                    style={
                      item === "autre"
                        ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                        : { borderColor: BORDER, color: INK }
                    }
                  >
                    Autre
                  </button>
                </div>
                {item === "autre" && (
                  <input
                    type="text"
                    required
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    placeholder="Deux places de cinéma, une bouteille de vin..."
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                    style={{ borderColor: BORDER }}
                  />
                )}
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

            {mode === "painting" && (
              <div>
                <label className="block text-sm font-medium">
                  Un mot pour inspirer l&apos;illustration{" "}
                  <span className="font-normal" style={{ color: MUTED }}>
                    (optionnel)
                  </span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notre après-midi au Jardin du Luxembourg..."
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                  style={{ borderColor: BORDER }}
                />
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                Vous
              </p>
              <label className="mt-2 block text-sm font-medium">Votre prénom</label>
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
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                Destinataire
              </p>
              <label className="mt-2 block text-sm font-medium">Pour qui ?</label>
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

            {mode !== "painting" && (
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
            )}

            {mode === "message" && (
              <div>
                <label className="block text-sm font-medium">
                  Ajouter un GIF <span className="font-normal" style={{ color: MUTED }}>(optionnel)</span>
                </label>
                {gifUrl ? (
                  <div className="relative mt-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gifUrl} alt="" className="h-32 rounded-xl border" style={{ borderColor: BORDER }} />
                    <button
                      type="button"
                      onClick={() => setGifUrl(null)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={searchGifs} className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={gifQuery}
                        onChange={(e) => setGifQuery(e.target.value)}
                        placeholder="Chercher un GIF (ex: câlin, merci...)"
                        className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                        style={{ borderColor: BORDER }}
                      />
                      <button
                        type="submit"
                        disabled={gifSearching}
                        className="shrink-0 rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
                        style={{ borderColor: BORDER, color: INK }}
                      >
                        {gifSearching ? "..." : "Chercher"}
                      </button>
                    </form>
                    {gifResults.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {gifResults.map((gif) => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => {
                              setGifUrl(gif.url);
                              setGifResults([]);
                            }}
                            className="overflow-hidden rounded-lg border"
                            style={{ borderColor: BORDER }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gif.previewUrl} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

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
              {status === "submitting"
                ? mode === "painting"
                  ? "Création de votre peinture..."
                  : "Envoi..."
                : "Prévenir " + (recipientName || "la personne")}
            </button>
            {!recipientEmail && !recipientPhone && (
              <p className="-mt-2 text-center text-xs" style={{ color: MUTED }}>
                Ajoutez le numéro ou l&apos;e-mail du destinataire pour pouvoir envoyer.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
