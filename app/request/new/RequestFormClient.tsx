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
import { Fraunces, Work_Sans } from "next/font/google";
import type { User } from "firebase/auth";
import { auth, signInWithGoogle, watchAuthState } from "@/lib/firebase";
import { TimeSelect } from "@/app/components/TimeSelect";
import { DiscoveryGrid, type DiscoveryTile } from "@/app/components/DiscoveryGrid";
import { departmentFromPostalCode, STATIC_CATALOG } from "@/lib/venueCatalog";
import { fetchNearbyVenueSuggestions } from "@/lib/geoVenueSuggestions";
import type { Contact, VenueType } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

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

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        setDraft(JSON.parse(raw));
      } catch {
        // corrupt draft, ignore and keep the empty default
      }
    }
    return watchAuthState((u) => setUser(u ?? false));
  }, []);

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

  function pickVenue(v: { name: string; address: string; venueType?: VenueType | null }) {
    setDraft((d) => ({
      ...d,
      venueName: v.name,
      venueAddress: v.address,
      venueType: v.venueType ?? d.venueType,
    }));
  }

  async function handleConnect() {
    setError(null);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion.");
    }
  }

  async function handleSend() {
    if (!user) return;
    setError(null);

    if (!draft.recipientName.trim() || !draft.recipientEmail.trim()) {
      setError("Le nom et l'e-mail du destinataire sont requis.");
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
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>Ittsui</span>
        <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
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
            <section>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Destinataire
              </label>
              {contacts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickContact(c)}
                      className="rounded-full border px-3 py-1.5 text-xs"
                      style={{
                        borderColor: draft.recipientEmail === c.email ? ACCENT : BORDER,
                        color: draft.recipientEmail === c.email ? ACCENT : INK,
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
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
            </section>

            <section>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Lieu
              </label>
              <input
                type="text"
                placeholder="Code postal (suggestions de lieux)"
                value={draft.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ borderColor: BORDER }}
              />
              {suggestionsLoading && (
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  Recherche de lieux près de {draft.postalCode}...
                </p>
              )}
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => pickVenue(v)}
                      className="rounded-full border px-3 py-1.5 text-xs"
                      style={{
                        borderColor: draft.venueName === v.name ? ACCENT : BORDER,
                        color: draft.venueName === v.name ? ACCENT : INK,
                      }}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
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
            </section>

            <section>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Date et heure
              </label>
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
                className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {submitting ? "Envoi..." : "Envoyer"}
              </button>
            ) : (
              <div>
                <button
                  onClick={handleConnect}
                  className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: ACCENT }}
                >
                  Se connecter pour envoyer
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
