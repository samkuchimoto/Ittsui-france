"use client";
// /app/request/new/RequestFormClient.tsx
// Send a one-off meeting request (venue, address, date, time) to a
// contact — the ad-hoc counterpart to /setup's permanent weekly Pair
// bond. The form itself (recipient, venue selection, date/time) is fully
// usable with no account, per the "show the full value first" requirement
// — only the final "Envoyer" tap requires being signed in, matching
// exactly how /invite/{pairId} already gates auth at the moment of
// action rather than at page load.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import type { User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { auth, db, signInWithGoogle, watchAuthState } from "@/lib/firebase";
import { TimeSelect } from "@/app/components/TimeSelect";
import { DiscoveryGrid, type DiscoveryTile } from "@/app/components/DiscoveryGrid";
import { departmentFromPostalCode, STATIC_CATALOG } from "@/lib/venueCatalog";
import { fetchNearbyVenueSuggestions } from "@/lib/geoVenueSuggestions";
import { isValidEmail } from "@/lib/validation";
import { pickNativeContact } from "@/lib/nativeContacts";
import { listenOnce } from "@/lib/nativeSpeech";
import { mostRecentByCreatedAt } from "@/lib/sort";
import type { Contact, Pair, VenueType } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

const SIMPLE_MODE_KEY = "ittsui-request-simple-mode";

// Local calendar-day math for the three big date-preset buttons in simple
// mode — this is a client-side convenience the person still sees and can
// change before sending, not a hidden server computation, so browser-local
// "today" is an acceptable basis here (unlike the server-side scheduling
// arithmetic elsewhere in this app, which has to be Paris-correct
// regardless of where the server runs).
function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Deterministic word-stripping, not an LLM call — extracting a name from a
// short, fixed-shape utterance ("Ittsui meeting avec Tad") is exactly the
// kind of thing plain code does reliably, unlike date arithmetic, which is
// why lib/parseMeetingRequest.ts had to stop trusting a model to compute
// dates and only ever classify them. Filters filler words out wherever
// they appear (not just as a prefix) so it still works whether someone
// says the trigger phrase, a partial version of it, or just the bare name.
const VOICE_FILLER_WORDS = new Set([
  "ittsui",
  "meeting",
  "rendez-vous",
  "rendezvous",
  "rdv",
  "avec",
  "with",
  "un",
  "une",
  "le",
  "la",
  "pour",
]);

function extractNameFromVoiceTranscript(transcript: string): string {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter((w) => !VOICE_FILLER_WORDS.has(w.toLowerCase().replace(/[.,!?]/g, "")));
  return words.join(" ").trim();
}

// Same tile set SetupClient.tsx's discovery grid uses for venue-type
// preferences — no per-tile photo here (this form isn't tied to any
// user's onboarding preferences), so every tile falls back to
// DiscoveryGrid's own AI-mood-illustration-or-tinted-block behavior,
// badge included, exactly as already proven there.
const VENUE_TYPE_TILES: DiscoveryTile[] = [
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "park", label: "Parc" },
  { value: "museum", label: "Musée" },
  { value: "home", label: "Chez vous" },
];

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

const DRAFT_KEY = "ittsui-request-draft";

interface Draft {
  recipientName: string;
  recipientEmail: string;
  venueName: string;
  venueAddress: string;
  venueType: VenueType | null;
  postalCode: string;
  date: string;
  time: string;
}

function emptyDraft(): Draft {
  const today = new Date();
  return {
    recipientName: "",
    recipientEmail: "",
    venueName: "",
    venueAddress: "",
    venueType: null,
    postalCode: "",
    date: today.toISOString().slice(0, 10),
    time: "15:00",
  };
}

// Last-resort fallback only, when the real geo lookup (below) times out,
// fails, or genuinely has nothing nearby — same curated catalog
// SetupClient.tsx's one-tap preview reads. No per-item venueType here
// (STATIC_CATALOG is keyed BY type but this flattens across all of
// them), unlike the real geo suggestions, which do carry one.
function staticSuggestionsForPostalCode(postalCode: string): { name: string; address: string }[] {
  const metro = departmentFromPostalCode(postalCode);
  if (!metro) return [];
  const byType = STATIC_CATALOG[metro];
  return Object.values(byType).flat().filter((v): v is { name: string; address: string } => Boolean(v));
}

export default function RequestFormClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contactId");
  const [user, setUser] = useState<User | false | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; address: string; venueType?: VenueType }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  // Off by default (unchanged behavior for everyone already using the full
  // form). ?simple=1 lets someone set this up FOR another person once —
  // e.g. a grandson bookmarking a pre-simplified link on his grandmother's
  // phone — and it then persists via localStorage on that device, so she
  // never has to find or touch the toggle herself again.
  const [simpleMode, setSimpleMode] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [importingContact, setImportingContact] = useState(false);
  const [listeningForName, setListeningForName] = useState(false);
  const [voiceCandidate, setVoiceCandidate] = useState<Contact | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Checked post-mount, not during render: Capacitor's platform check only
  // resolves correctly in the browser, so seeding it into render directly
  // would render "web" on the server and "native" on the client's first
  // paint — the exact class of SSR/client mismatch already hit and fixed
  // once in this file's own simple-mode work.
  useEffect(() => setIsNative(Capacitor.isNativePlatform()), []);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        setDraft(JSON.parse(raw));
      } catch {
        // corrupt draft, ignore and keep the empty default
      }
    }
    if (searchParams.get("simple") === "1") {
      localStorage.setItem(SIMPLE_MODE_KEY, "1");
      setSimpleMode(true);
    } else {
      setSimpleMode(localStorage.getItem(SIMPLE_MODE_KEY) === "1");
    }
    return watchAuthState((u) => setUser(u ?? false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSimpleMode() {
    setSimpleMode((current) => {
      const next = !current;
      localStorage.setItem(SIMPLE_MODE_KEY, next ? "1" : "0");
      return next;
    });
  }

  // Auto-fills the postal code from this person's own existing weekly Pair,
  // if they have one — one less thing to type. Same "most recent, sorted
  // client-side" query shape SetupClient.tsx and DashboardClient.tsx
  // already use for the identical userIds array-contains lookup, so no new
  // Firestore composite index is needed here either. Best-effort: silently
  // does nothing if there's no pair, no postal code on it, or the query
  // fails — the manual postal-code field is always still there as a
  // fallback either way.
  useEffect(() => {
    if (!user || draft.postalCode) return;
    (async () => {
      try {
        const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => d.data() as Pair);
        const pair = mostRecentByCreatedAt(docs);
        if (pair?.status === "active" && pair.postalCode) {
          update("postalCode", pair.postalCode);
        }
      } catch {
        // Best-effort — the manual postal-code input is still right there.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/contacts", { headers: { Authorization: `Bearer ${idToken}` } });
      if (res.ok) {
        const data = await res.json();
        const loaded: Contact[] = data.contacts ?? [];
        setContacts(loaded);
        // Arriving from /contacts' "Proposer un RDV" link — pre-fill that
        // contact rather than making someone re-pick it from the chip row.
        if (contactId) {
          const match = loaded.find((c) => c.id === contactId);
          if (match) pickContact(match);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Debounced so this fires once someone's actually done typing a 5-digit
  // code, not on every keystroke — real network calls (geocode, then
  // Overpass), not the instant static lookup this replaces. Falls back to
  // the static catalog only when the real lookup comes back empty (a
  // genuine failure or nothing OSM has mapped nearby), never overwriting
  // a set of real results with the static ones.
  useEffect(() => {
    if (!/^\d{5}$/.test(draft.postalCode)) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSuggestionsLoading(true);
      fetchNearbyVenueSuggestions(draft.postalCode).then((results) => {
        if (cancelled) return;
        setSuggestionsLoading(false);
        setSuggestions(results.length > 0 ? results : staticSuggestionsForPostalCode(draft.postalCode));
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft.postalCode]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function pickContact(contact: Contact) {
    update("recipientName", contact.name);
    update("recipientEmail", contact.email);
  }

  // Simple mode shows only contact chips (no manual name/email fields to
  // confirm a selection against), so an imported person who isn't already
  // a saved contact needs to be persisted immediately — otherwise the
  // import would silently fill state with nothing visible to show for it.
  // In the full form the manual fields make the fill itself visible, so
  // this persists there too only to save a redundant retype, not to make
  // the selection legible.
  async function handleImportContact() {
    setError(null);
    setVoiceCandidate(null); // don't leave a stale voice confirm card showing alongside this
    setImportingContact(true);
    try {
      const picked = await pickNativeContact();
      if (!picked) return; // not native, permission denied, or cancelled

      if (!picked.email || !isValidEmail(picked.email)) {
        setError(
          simpleMode
            ? "Ce contact n'a pas d'e-mail valide — ajoutez-le d'abord depuis « Mes contacts »."
            : "Ce contact n'a pas d'e-mail valide — complétez-le ci-dessous."
        );
        if (picked.name && !simpleMode) update("recipientName", picked.name);
        return;
      }

      // Lowercased to match how /api/contacts always normalizes and returns
      // emails — device contacts are often mixed-case, and without this the
      // chip-highlight check below (a strict ===) would silently never
      // match, leaving simple mode with no visible confirmation of who got
      // selected.
      const email = picked.email.toLowerCase();
      update("recipientName", picked.name || email);
      update("recipientEmail", email);

      if (simpleMode && user) {
        const alreadyKnown = contacts.some((c) => c.email.toLowerCase() === email);
        if (!alreadyKnown) {
          const idToken = await user.getIdToken();
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name: picked.name || email, email }),
          });
          if (res.ok) {
            const saved = await res.json();
            setContacts((prev) => [...prev, saved as Contact]);
          } else {
            setError("Contact importé mais pas encore enregistré — réessayez.");
          }
        }
      }
    } finally {
      setImportingContact(false);
    }
  }

  // Voice only ever searches this person's own already-saved Ittsui
  // contacts (same match logic handleParseFreeText already uses for a
  // spoken/typed recipient name) — it never creates a new one, unlike
  // handleImportContact above. A misheard name silently landing on the
  // wrong person is worse here than anywhere else in the app (this picks
  // who a real invitation goes to), so a match always needs an explicit
  // tap to confirm before it's used — see voiceCandidate below.
  async function handleVoiceSearch() {
    setError(null);
    setVoiceCandidate(null);
    setListeningForName(true);
    try {
      const transcript = await listenOnce();
      if (!transcript) {
        setError("Rien entendu — réessayez, ou choisissez un contact ci-dessous.");
        return;
      }
      const name = extractNameFromVoiceTranscript(transcript) || transcript;
      const needle = name.toLowerCase();
      const match = contacts.find(
        (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
      );
      if (match) {
        setVoiceCandidate(match);
      } else {
        setError(`Aucun contact ne correspond à « ${name} » — choisissez ci-dessous.`);
      }
    } finally {
      setListeningForName(false);
    }
  }

  function confirmVoiceCandidate() {
    if (voiceCandidate) pickContact(voiceCandidate);
    setVoiceCandidate(null);
  }

  function pickVenue(v: { name: string; address: string; venueType?: VenueType | null }) {
    setDraft((d) => ({
      ...d,
      venueName: v.name,
      venueAddress: v.address,
      venueType: v.venueType ?? d.venueType,
    }));
  }

  // Only pre-fills fields — never sends anything. Someone still reviews
  // and can edit every field before tapping "Envoyer".
  async function handleParseFreeText() {
    if (!freeText.trim()) return;
    if (!user) {
      setParseMessage("Connectez-vous pour utiliser le remplissage automatique.");
      return;
    }
    setParsing(true);
    setParseMessage(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/parse-meeting-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ text: freeText }),
      });
      const data = await res.json().catch(() => null);
      const result = data?.result as
        | {
            recipientName: string | null;
            venueName: string | null;
            venueAddress: string | null;
            venueType: VenueType | null;
            date: string | null;
            time: string | null;
          }
        | undefined;

      if (!res.ok || !result) {
        setParseMessage("Rien n'a pu être deviné — complétez ci-dessous.");
        return;
      }

      if (result.recipientName) {
        const needle = result.recipientName.toLowerCase();
        const match = contacts.find(
          (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
        );
        if (match) pickContact(match);
        else update("recipientName", result.recipientName);
      }
      if (result.venueName) update("venueName", result.venueName);
      if (result.venueAddress) update("venueAddress", result.venueAddress);
      if (result.venueType) update("venueType", result.venueType);
      if (result.date) update("date", result.date);
      if (result.time) update("time", result.time);

      const filledCount = Object.values(result).filter(Boolean).length;
      setParseMessage(
        filledCount > 0 ? "Champs pré-remplis — vérifiez avant d'envoyer." : "Rien n'a pu être deviné — complétez ci-dessous."
      );
    } catch {
      setParseMessage("Rien n'a pu être deviné — complétez ci-dessous.");
    } finally {
      setParsing(false);
    }
  }

  async function handleConnect() {
    if (signingIn) return; // a second tap while the popup is open cancels and
    // reopens it, which looks like the account chooser inexplicably
    // reappearing (confirmed via real testing 2026-08-25)
    setError(null);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion.");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSend() {
    if (!user) return;
    setError(null);

    if (!draft.recipientName.trim() || !draft.recipientEmail.trim()) {
      setError("Le nom et l'e-mail du destinataire sont requis.");
      return;
    }
    if (!isValidEmail(draft.recipientEmail)) {
      setError("Cette adresse e-mail ne semble pas valide.");
      return;
    }
    if (!draft.venueName.trim() || !draft.venueAddress.trim()) {
      setError("Le lieu et l'adresse sont requis.");
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();

      // Save as a contact for next time, unless it's already one on file —
      // exactly what "add to closest contact list" means in practice: a
      // side effect of sending, not a separate step someone has to
      // remember to do first.
      const alreadyKnown = contacts.some((c) => c.email.toLowerCase() === draft.recipientEmail.trim().toLowerCase());
      if (!alreadyKnown) {
        fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ name: draft.recipientName, email: draft.recipientEmail }),
        }).catch(() => {});
      }

      const res = await fetch("/api/meeting-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          recipientName: draft.recipientName,
          recipientEmail: draft.recipientEmail,
          venueName: draft.venueName,
          venueAddress: draft.venueAddress,
          ...(draft.venueType ? { venueType: draft.venueType } : {}),
          date: draft.date,
          time: draft.time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");

      sessionStorage.removeItem(DRAFT_KEY);
      setSentTo(draft.recipientName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`} style={{ color: INK }}>
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="flex items-center justify-between">
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
            Ittsui
          </Link>
          <button
            type="button"
            onClick={toggleSimpleMode}
            className="rounded-full border px-3 py-1 text-xs font-medium"
            style={
              simpleMode
                ? { borderColor: ACCENT, backgroundColor: `${ACCENT}1A`, color: ACCENT }
                : { borderColor: BORDER, color: MUTED }
            }
          >
            Mode simple {simpleMode ? "activé" : ""}
          </button>
        </div>
        <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: simpleMode ? "2rem" : "1.75rem" }}>
          Proposer un rendez-vous
        </h1>

        {sentTo ? (
          <div className="mt-8">
            <p className="text-sm" style={{ color: MUTED }}>
              Demande envoyée à {sentTo}. Vous serez notifié(e) par e-mail dès qu&apos;elle répond.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Retour au tableau de bord
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {!simpleMode && (
              <section>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                  Décrire en une phrase <span className="font-normal normal-case" style={{ color: MUTED }}>(optionnel)</span>
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Ex. un café avec Marie mardi soir vers Bastille"
                  rows={2}
                  className="mt-2 w-full resize-none rounded-lg border px-3 py-2.5 text-sm"
                  style={{ borderColor: BORDER }}
                />
                <button
                  type="button"
                  onClick={handleParseFreeText}
                  disabled={parsing || !freeText.trim()}
                  className="mt-2 text-xs font-medium underline underline-offset-4 disabled:opacity-50"
                  style={{ color: ACCENT }}
                >
                  {parsing ? "Analyse..." : "Remplir automatiquement"}
                </button>
                {parseMessage && (
                  <p className="mt-1 text-xs" style={{ color: MUTED }}>
                    {parseMessage}
                  </p>
                )}
              </section>
            )}

            <section>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Destinataire
              </label>
              {isNative && contacts.length > 0 && !voiceCandidate && (
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  disabled={listeningForName}
                  className={
                    simpleMode
                      ? "mt-2 min-h-[56px] w-full rounded-2xl border text-lg font-medium disabled:opacity-60"
                      : "mt-2 w-full rounded-lg border py-2.5 text-sm font-medium disabled:opacity-60"
                  }
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  {listeningForName ? "🎤 Écoute..." : "🎤 Dire un nom"}
                </button>
              )}
              {voiceCandidate && (
                <div
                  className={simpleMode ? "mt-2 rounded-2xl border p-4" : "mt-2 rounded-lg border p-3"}
                  style={{ borderColor: ACCENT, backgroundColor: `${ACCENT}14` }}
                >
                  <p className={simpleMode ? "text-lg font-medium" : "text-sm font-medium"} style={{ color: INK }}>
                    {voiceCandidate.name} ?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={confirmVoiceCandidate}
                      className={
                        simpleMode
                          ? "min-h-[56px] flex-1 rounded-2xl text-lg font-medium text-white"
                          : "flex-1 rounded-lg py-2 text-sm font-medium text-white"
                      }
                      style={{ backgroundColor: ACCENT }}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceCandidate(null)}
                      className={
                        simpleMode
                          ? "min-h-[56px] flex-1 rounded-2xl border text-lg font-medium"
                          : "flex-1 rounded-lg border py-2 text-sm font-medium"
                      }
                      style={{ borderColor: BORDER, color: INK }}
                    >
                      Non
                    </button>
                  </div>
                </div>
              )}
              {isNative && !voiceCandidate && (
                <button
                  type="button"
                  onClick={handleImportContact}
                  disabled={importingContact}
                  className={
                    simpleMode
                      ? "mt-2 min-h-[56px] w-full rounded-2xl border text-lg font-medium disabled:opacity-60"
                      : "mt-2 w-full rounded-lg border py-2.5 text-sm font-medium disabled:opacity-60"
                  }
                  style={{ borderColor: BORDER, color: INK }}
                >
                  {importingContact ? "Import..." : "Importer depuis mes contacts"}
                </button>
              )}
              {contacts.length > 0 && (
                <div className={`mt-2 flex flex-wrap gap-2 ${simpleMode ? "gap-3" : ""}`}>
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickContact(c)}
                      className={simpleMode ? "min-h-[56px] rounded-2xl border px-5 text-lg font-medium" : "rounded-full border px-3 py-1.5 text-xs"}
                      style={{
                        borderColor: draft.recipientEmail === c.email ? ACCENT : BORDER,
                        color: draft.recipientEmail === c.email ? ACCENT : INK,
                        backgroundColor: draft.recipientEmail === c.email && simpleMode ? `${ACCENT}14` : undefined,
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {simpleMode ? (
                contacts.length === 0 && (
                  <p className="mt-2 text-sm" style={{ color: MUTED }}>
                    Aucun contact enregistré.{" "}
                    <Link href="/contacts" className="underline underline-offset-4" style={{ color: ACCENT }}>
                      En ajouter un
                    </Link>{" "}
                    d&apos;abord.
                  </p>
                )
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={draft.recipientName}
                    onChange={(e) => update("recipientName", e.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
                    style={{ borderColor: BORDER }}
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={draft.recipientEmail}
                    onChange={(e) => update("recipientEmail", e.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
                    style={{ borderColor: BORDER }}
                  />
                </>
              )}
            </section>

            <section>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Lieu
              </label>

              {/* Postal code input only shown when there isn't one already —
                  in simple mode this is usually already auto-filled from the
                  person's own weekly Pair, so this rarely appears at all. */}
              {(!simpleMode || !draft.postalCode) && (
                <input
                  type="text"
                  placeholder="Code postal (suggestions de lieux)"
                  value={draft.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                  className={simpleMode ? "mt-2 min-h-[56px] w-full rounded-2xl border px-4 text-lg" : "mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"}
                  style={{ borderColor: BORDER }}
                />
              )}
              {suggestionsLoading && (
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  Recherche de lieux près de {draft.postalCode}...
                </p>
              )}
              {suggestions.length > 0 && (
                <div className={`mt-2 flex flex-wrap gap-2 ${simpleMode ? "gap-3" : ""}`}>
                  {suggestions.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => pickVenue(v)}
                      className={simpleMode ? "min-h-[56px] rounded-2xl border px-5 text-lg font-medium" : "rounded-full border px-3 py-1.5 text-xs"}
                      style={{
                        borderColor: draft.venueName === v.name ? ACCENT : BORDER,
                        color: draft.venueName === v.name ? ACCENT : INK,
                        backgroundColor: draft.venueName === v.name && simpleMode ? `${ACCENT}14` : undefined,
                      }}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              {!simpleMode && (
                <>
                  <input
                    type="text"
                    placeholder="Nom du lieu"
                    value={draft.venueName}
                    onChange={(e) => update("venueName", e.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
                    style={{ borderColor: BORDER }}
                  />
                  <input
                    type="text"
                    placeholder="Adresse"
                    value={draft.venueAddress}
                    onChange={(e) => update("venueAddress", e.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
                    style={{ borderColor: BORDER }}
                  />
                </>
              )}

              {/* Hidden in simple mode: tapping a bare category here (vs. a
                  specific suggestion chip above) sets venueType but not
                  venueName/venueAddress, which "Envoyer" requires — with the
                  manual text fields also hidden in this mode, that would be
                  a real dead end with no way to fix it. Requiring a named
                  suggestion instead also matches what was actually asked
                  for: specific tappable places, not abstract categories. */}
              {!simpleMode && (
                <>
                  <p className="mt-4 text-xs" style={{ color: MUTED }}>
                    Type de lieu (optionnel, ajoute une illustration à l&apos;invitation)
                  </p>
                  <div className="mt-2">
                    <DiscoveryGrid
                      tiles={VENUE_TYPE_TILES}
                      selected={draft.venueType ? [draft.venueType] : []}
                      onToggle={(v) => update("venueType", draft.venueType === v ? null : v)}
                    />
                  </div>
                </>
              )}
            </section>

            <section>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Date et heure
              </label>
              {simpleMode ? (
                <>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { label: "Aujourd'hui", value: isoDateInDays(0) },
                      { label: "Demain", value: isoDateInDays(1) },
                      { label: "Après-demain", value: isoDateInDays(2) },
                    ].map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => update("date", d.value)}
                        className="min-h-[56px] rounded-2xl border px-2 text-base font-medium"
                        style={
                          draft.date === d.value
                            ? { borderColor: ACCENT, backgroundColor: `${ACCENT}14`, color: ACCENT }
                            : { borderColor: BORDER, color: INK }
                        }
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => update("date", e.target.value)}
                    className="mt-2 min-h-[56px] w-full rounded-2xl border px-4 text-lg"
                    style={{ borderColor: BORDER }}
                  />
                </>
              ) : (
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => update("date", e.target.value)}
                    className="rounded-lg border px-3 py-2.5 text-sm"
                    style={{ borderColor: BORDER }}
                  />
                  <TimeSelect value={draft.time} onChange={(v) => update("time", v)} label="Heure du rendez-vous" />
                </div>
              )}
              {simpleMode && (
                <div className="mt-2">
                  <TimeSelect value={draft.time} onChange={(v) => update("time", v)} label="Heure du rendez-vous" />
                </div>
              )}
            </section>

            {error && (
              <p className="text-sm" style={{ color: ACCENT }}>
                {error}
              </p>
            )}

            {user ? (
              <button
                onClick={handleSend}
                disabled={submitting}
                className={
                  simpleMode
                    ? "min-h-[64px] w-full rounded-full text-xl font-medium text-white disabled:opacity-60"
                    : "w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
                }
                style={{ backgroundColor: ACCENT }}
              >
                {submitting ? "Envoi..." : "Envoyer"}
              </button>
            ) : (
              <div>
                <button
                  onClick={handleConnect}
                  disabled={signingIn}
                  className={
                    simpleMode
                      ? "min-h-[64px] w-full rounded-full text-xl font-medium text-white disabled:opacity-60"
                      : "w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
                  }
                  style={{ backgroundColor: ACCENT }}
                >
                  {signingIn ? "Connexion..." : "Se connecter pour envoyer"}
                </button>
                <p className="mt-3 text-center text-xs" style={{ color: MUTED }}>
                  Via Google, juste pour vérifier que c&apos;est bien vous.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
