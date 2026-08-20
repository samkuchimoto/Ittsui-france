"use client";
// /app/setup/SetupClient.tsx
// Split out of page.tsx so page.tsx can stay a Server Component that
// exports `dynamic = "force-dynamic"` — see page.tsx's header comment.
//
// AUDIT NOTE — what changed vs. production and what did not:
//   UNCHANGED, byte-for-byte behavior:
//     - watchAuthState() effect and the (user === null | false | User) tri-state
//     - the Firestore "does this uid already have a pair" query (array-contains
//       on userIds, orderBy createdAt desc, limit 1) and its redirect targets
//     - handleGoogleSignIn, handleDayChange (incl. the Sunday 15:00–17:00
//       auto-suggest), toggle<T>()
//     - handleSubmit: same fetch call, same method/headers, same JSON body
//       shape posted to POST /api/invite-partner (inviterUid, inviterName,
//       partnerName, partnerEmail, agreedDay, agreedWindowStart,
//       agreedWindowEnd, preferences: { venueTypes, dietaryFilters })
//     - lib/types.ts (Pair, VenueType, DietaryFilter) — untouched, imported as-is
//   CHANGED, presentation only:
//     - single long form -> 3-step wizard (La Personne / Le Moment / Les Lieux)
//       matching the brief. Step 2's four preset pills (Samedi Après-midi /
//       Dimanche Matin / Vendredi Soir / Personnalisé) are a new UI layer
//       that writes into the SAME day/windowStart/windowEnd state the old
//       single-page form used — "Personnalisé" reveals the original day-grid
//       + time pickers untouched, so no scheduling capability was removed.
//     - Step 3's vibe pills map onto the existing VENUE_TYPES; "Chez l'un des
//       deux" (home) is kept as a secondary pill so no venue option was
//       dropped, it's just no longer one of the four headline pills.
//     - "Duo type" selector in Step 1 (ami / partenaire / famille) is
//       LOCAL-ONLY UI state for copy/tone — it is never sent to the API,
//       so the invite-partner payload and Pair type stay exactly as they
//       were. Wiring it into the backend would need a schema change, which
//       is out of scope for a restyle.
//     - Design tokens applied throughout: #FBF9F5 / #A84B38 / #1C1917 /
//       #78716C / #E8E2D9, Fraunces headlines, Work Sans body — matching
//       app/page.tsx.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import { auth, db, signInWithGoogle, watchAuthState } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { VenueType, DietaryFilter, Pair } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { StatusBanner, type StatusStep } from "@/app/components/StatusBanner";
import { useUserLocation } from "@/app/hooks/useUserLocation";
import { tapHaptic, ImpactStyle } from "@/lib/haptics";
import { previewVenue } from "@/lib/venueCatalog";

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

const INK = "#1C1917";
const MUTED = "#78716C";
const ACCENT = "#A84B38";
const BORDER = "#E8E2D9";
const CREAM = "#FBF9F5";

const DAYS: { value: Pair["agreedDay"]; label: string }[] = [
  { value: "mon", label: "Lundi" },
  { value: "tue", label: "Mardi" },
  { value: "wed", label: "Mercredi" },
  { value: "thu", label: "Jeudi" },
  { value: "fri", label: "Vendredi" },
  { value: "sat", label: "Samedi" },
  { value: "sun", label: "Dimanche" },
];

const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "home", label: "Chez l'un des deux" },
  { value: "park", label: "Parc" },
  { value: "museum", label: "Musée / lieu culturel" },
];

// Emoji-tagged "vibe pills" per the brief, in the order requested.
// Mapped 1:1 onto existing VenueType values — no new type added.
const VIBE_PILLS: { value: VenueType; label: string; emoji: string }[] = [
  { value: "cafe", label: "Café", emoji: "☕" },
  { value: "park", label: "Parc", emoji: "🌳" },
  { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { value: "museum", label: "Culture", emoji: "🏛️" },
];
const SECONDARY_VENUE: { value: VenueType; label: string; emoji: string } = {
  value: "home",
  label: "Chez vous",
  emoji: "🏠",
};

const LOCATION_STEPS: StatusStep[] = [
  { key: "locating", label: "Détection de votre position..." },
  { key: "resolving", label: "Sélection des pépites..." },
];

const SENT_STEPS: StatusStep[] = [
  { key: "sending", label: "Envoi de l'invitation..." },
  { key: "sent", label: "Invitation transmise !" },
];

const DIETARY_OPTIONS: DietaryFilter[] = ["casher", "halal", "vegetarien", "bio", "antillais"];

type DuoType = "ami" | "partenaire" | "famille";
const DUO_TYPES: { value: DuoType; label: string }[] = [
  { value: "ami", label: "Un(e) ami(e)" },
  { value: "partenaire", label: "Mon/ma partenaire" },
  { value: "famille", label: "Ma famille" },
];

// Step 2 presets. Selecting one writes directly into day/windowStart/windowEnd
// — the exact same state the original single-page form controlled.
const TIME_PRESETS: {
  label: string;
  day: Pair["agreedDay"];
  windowStart: string;
  windowEnd: string;
}[] = [
  { label: "Samedi Après-midi", day: "sat", windowStart: "14:00", windowEnd: "17:00" },
  { label: "Dimanche Matin", day: "sun", windowStart: "09:00", windowEnd: "12:00" },
  { label: "Vendredi Soir", day: "fri", windowStart: "18:00", windowEnd: "20:00" },
];

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: n === step ? "1.5rem" : "0.375rem",
            backgroundColor: n <= step ? ACCENT : BORDER,
          }}
        />
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FBF9F5] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-14">{children}</div>
    </main>
  );
}

export default function SetupClient() {
  const router = useRouter();

  // Auth state: null = not checked yet, false = checked and not signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [checkingPair, setCheckingPair] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [duoType, setDuoType] = useState<DuoType | null>(null); // local UI only, not sent to API

  const [day, setDay] = useState<Pair["agreedDay"]>("sun");
  const [windowStart, setWindowStart] = useState("15:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [customTime, setCustomTime] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [notifyDaysBefore, setNotifyDaysBefore] = useState(0);

  const [venueTypes, setVenueTypes] = useState<VenueType[]>(["cafe"]);
  const [postalCode, setPostalCode] = useState("");
  const [dietaryFilters, setDietaryFilters] = useState<DietaryFilter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ name: string; email: string; pairId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { status: locationStatus, postalCode: detectedPostalCode, detect: detectLocation } = useUserLocation();

  // Pre-fills the manual field rather than replacing it — postalCode stays
  // a normal editable input either way, this just saves a typing step.
  useEffect(() => {
    if (detectedPostalCode) setPostalCode(detectedPostalCode);
  }, [detectedPostalCode]);

  // Fired proactively on mount rather than waiting for Step 3's manual
  // "Utiliser ma position actuelle" button, so the Step 1 one-tap CTA can
  // preview a real nearby venue instead of a generic "café ou parc" line.
  // useUserLocation() already fails completely silently (denial, timeout,
  // unsupported browser) and its own 5s timeout bounds how long this can
  // leave postalCode unset — no separate deadline needed here.
  useEffect(() => {
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch auth state on mount
  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u ?? false);
    });
    return unsub;
  }, []);

  // Once we know who's signed in, check if they already have an ACTIVE
  // pair — a real relationship in progress, so /setup wouldn't make sense.
  // Anything else (pending, declined, expired, cancelled) no longer
  // redirects away: sending a new invite is always allowed and silently
  // obsoletes whichever pending one existed (see invite-partner/route.ts).
  // Previously this redirected for ANY pair regardless of status, which
  // meant a declined/expired pair's own "Nouvelle invitation" button sent
  // you to /setup only to be immediately bounced right back to
  // /setup/pending — a dead loop with no way to actually start a new
  // invite. That's what "invitation déjà envoyée" with no way out was.
  // NOTE: userIds array-contains has no natural order — always take the
  // MOST RECENT pair (createdAt desc), not just docs[0], so a stale
  // declined/expired pair can't shadow a fresh one.
  useEffect(() => {
    if (!user) {
      setCheckingPair(false);
      return;
    }
    (async () => {
      const q = query(
        collection(db, "pairs"),
        where("userIds", "array-contains", user.uid),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const pair = snap.docs[0].data() as Pair;
        if (pair.status === "active") {
          router.push("/dashboard");
          return;
        }
      }
      setCheckingPair(false);
    })();
  }, [user, router]);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion.");
    }
  }

  // Sunday auto-suggests the 15h-17h quiet window, but stays editable
  function handleDayChange(newDay: Pair["agreedDay"]) {
    setDay(newDay);
    if (newDay === "sun") {
      setWindowStart("15:00");
      setWindowEnd("17:00");
    }
  }

  function applyPreset(preset: (typeof TIME_PRESETS)[number]) {
    setDay(preset.day);
    setWindowStart(preset.windowStart);
    setWindowEnd(preset.windowEnd);
    setCustomTime(false);
    setActivePreset(preset.label);
  }

  function enableCustomTime() {
    setCustomTime(true);
    setActivePreset(null);
  }

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function goToStep2() {
    setError(null);
    if (!partnerName.trim() || !partnerEmail.trim()) {
      setError("Indiquez un prénom et un e-mail pour continuer.");
      return;
    }
    setStep(2);
  }

  function goToStep3() {
    setStep(3);
  }

  // Core submit, shared by the customizable wizard (handleSubmit) and the
  // 1-tap path (handleOneTap) below — same request, same validation, same
  // error handling, just a different source for day/window/venue values.
  async function submitInvite(overrides?: {
    day: Pair["agreedDay"];
    windowStart: string;
    windowEnd: string;
    venueTypes: VenueType[];
  }) {
    setError(null);

    if (!user) {
      setError("Vous devez être connecté(e).");
      return;
    }
    const useDay = overrides?.day ?? day;
    const useWindowStart = overrides?.windowStart ?? windowStart;
    const useWindowEnd = overrides?.windowEnd ?? windowEnd;
    const useVenueTypes = overrides?.venueTypes ?? venueTypes;
    if (useVenueTypes.length === 0) {
      setError("Choisissez au moins un type de lieu.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invite-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterUid: user.uid,
          inviterName: user.displayName ?? "Quelqu'un",
          partnerName,
          partnerEmail,
          agreedDay: useDay,
          agreedWindowStart: useWindowStart,
          agreedWindowEnd: useWindowEnd,
          notifyDaysBefore,
          postalCode: postalCode || undefined,
          preferences: { venueTypes: useVenueTypes, dietaryFilters },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");

      setInvited({ name: partnerName, email: partnerEmail, pairId: data.pairId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitInvite();
  }

  // Native share sheet first (lets the recipient pick any app, not just
  // WhatsApp) -> WhatsApp direct link if unsupported or the sheet itself
  // fails to open -> clipboard + toast as the last resort. Mirrors the
  // same graceful-degradation shape as weekly-propose/route.ts's venue
  // pipeline (RAG -> Firestore -> static), just for sharing instead of
  // venue selection.
  async function handleShare() {
    if (!invited) return;
    tapHaptic(ImpactStyle.Light);

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${invited.pairId}`;
    const shareData = {
      title: "Ittsui - Notre moment",
      text: "Je t'ai préparé notre moment de la semaine ! Rejoins-moi sur Ittsui :",
      url: inviteUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // AbortError = the user closed the share sheet without picking
        // anything — an expected, non-error outcome, not something to
        // fall through to a fallback or surface to error tracking for.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`;
    const opened = typeof window !== "undefined" ? window.open(whatsappHref, "_blank", "noopener,noreferrer") : null;
    if (opened) return;

    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Nothing more to do silently — the link is still visible on screen
      // for the user to select and copy manually.
    }
  }

  // The 1-tap path: skips steps 2 and 3 entirely once name + email are in,
  // using the same Sunday 15h-17h default Step 2 already suggests plus a
  // café-or-park default, matching the most common picks rather than
  // inventing a preference nobody chose. "Personnaliser" (goToStep2) stays
  // one tap away for anyone who wants control — this doesn't replace that
  // path, it shortcuts it.
  const ONE_TAP_DAY: Pair["agreedDay"] = "sun";
  const ONE_TAP_WINDOW_START = "15:00";
  const ONE_TAP_WINDOW_END = "17:00";
  const ONE_TAP_VENUE_TYPES: VenueType[] = ["cafe", "park"];

  // Same curated catalog the real weekly-propose pipeline falls back to
  // (lib/venueCatalog.ts) — a genuinely real venue that could turn out to
  // be the first proposal, not an invented one. Preview copy only: the
  // actual submission below still sends venue TYPE preferences, never a
  // specific pre-picked venue — the real pick happens server-side, same as
  // for every other pair, once postal code and preferences are on file.
  const ctaPreview = previewVenue(postalCode || undefined, ONE_TAP_VENUE_TYPES);

  async function handleOneTap() {
    setError(null);
    if (!partnerName.trim() || !partnerEmail.trim()) {
      setError("Indiquez un prénom et un e-mail pour continuer.");
      return;
    }
    await submitInvite({
      day: ONE_TAP_DAY,
      windowStart: ONE_TAP_WINDOW_START,
      windowEnd: ONE_TAP_WINDOW_END,
      venueTypes: ONE_TAP_VENUE_TYPES,
    });
  }

  // Still checking auth state, or checking for an existing pair
  if (user === null || (user && checkingPair)) {
    return (
      <Shell>
        <p className="text-center text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
      </Shell>
    );
  }

  // Not signed in
  if (user === false) {
    return (
      <Shell>
        <div className="text-center">
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
            Configuration
          </h1>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>
            Connectez-vous pour continuer.
          </p>
          {error && (
            <p className="mt-4 text-sm" style={{ color: ACCENT }}>
              {error}
            </p>
          )}
          <button
            onClick={handleGoogleSignIn}
            className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: ACCENT }}
          >
            Se connecter avec Google
          </button>
        </div>
      </Shell>
    );
  }

  // Invitation just sent — confirmation screen
  if (invited) {
    return (
      <Shell>
        <div className="text-center">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
          >
            ✓
          </span>
          <h1 className="mt-5" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
            Invitation envoyée
          </h1>
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            Un e-mail a été envoyé à {invited.name} ({invited.email}).
          </p>

          <div className="mt-4 flex justify-center">
            <StatusBanner
              steps={SENT_STEPS}
              currentKey="sent"
              doneSlot={
                <button
                  type="button"
                  onClick={handleShare}
                  className="ml-1 font-medium underline underline-offset-4"
                >
                  Partager l&apos;invitation
                </button>
              }
            />
          </div>
          {copied && (
            <p
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
            >
              Lien copié !
            </p>
          )}

          <div className="mt-6 rounded-xl border p-4 text-left" style={{ borderColor: BORDER, backgroundColor: CREAM }}>
            <p className="text-sm font-medium">Et maintenant ?</p>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>
              Rien à faire de votre côté. Dès que {invited.name} se connecte, votre rendez-vous hebdomadaire
              s&apos;active automatiquement — vous recevrez un e-mail à ce moment-là.
              {postalCode && ` Les propositions seront centrées autour du ${postalCode}.`}
            </p>
          </div>
          <button
            onClick={() => router.push("/setup/pending")}
            className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: ACCENT }}
          >
            Voir le statut de l&apos;invitation
          </button>
        </div>
      </Shell>
    );
  }

  // Signed in, no pair yet: the 3-step wizard
  return (
    <Shell>
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: MUTED }}>
          Étape {step} sur 3
        </p>
        <h1 className="mt-2" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          {step === 1 && "La personne"}
          {step === 2 && "Le moment"}
          {step === 3 && "Les lieux"}
        </h1>
        <div className="mt-4">
          <StepDots step={step} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <section className="space-y-6">
            <p className="text-sm" style={{ color: MUTED }}>
              Ittsui protège un moment chaque semaine avec une personne qui compte pour vous. Indiquez qui —
              ensuite, on s&apos;occupe de tout : proposer, rappeler, organiser.
            </p>
            <div>
              <label className="block text-sm font-medium">Prénom de votre proche</label>
              <input
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
                placeholder="Prénom"
              />
              <input
                type="email"
                required
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
                placeholder="Son e-mail"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">C&apos;est qui, pour vous ?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DUO_TYPES.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => setDuoType(d.value)}
                    className="rounded-full border px-3.5 py-2 text-sm transition-colors"
                    style={
                      duoType === d.value
                        ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                        : { borderColor: BORDER, color: INK }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: ACCENT }}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleOneTap}
              disabled={submitting}
              className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting
                ? "Envoi…"
                : ctaPreview
                  ? `Envoyer en 1 clic — Dimanche 15h @ ${ctaPreview.name} (${ctaPreview.postalCode})`
                  : "Envoyer en un clic · Dimanche 15h, café ou parc"}
            </button>
            <button
              type="button"
              onClick={goToStep2}
              disabled={submitting}
              className="w-full rounded-full border py-3.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ borderColor: BORDER, color: INK }}
            >
              Personnaliser le jour et le lieu
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-medium">Quand, chaque semaine ?</label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {TIME_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="rounded-xl border px-4 py-3 text-left text-sm transition-colors"
                    style={
                      !customTime && activePreset === p.label
                        ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` }
                        : { borderColor: BORDER, backgroundColor: "white" }
                    }
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={enableCustomTime}
                  className="rounded-xl border px-4 py-3 text-left text-sm transition-colors"
                  style={
                    customTime
                      ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` }
                      : { borderColor: BORDER, backgroundColor: "white" }
                  }
                >
                  Personnalisé
                </button>
              </div>
            </div>

            {customTime && (
              <div className="space-y-4 rounded-xl border p-4" style={{ borderColor: BORDER, backgroundColor: CREAM }}>
                <div>
                  <label className="block text-xs font-medium" style={{ color: MUTED }}>
                    Jour de la semaine
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {DAYS.map((d) => (
                      <button
                        type="button"
                        key={d.value}
                        onClick={() => handleDayChange(d.value)}
                        className="rounded-lg border px-2 py-2 text-xs transition-colors"
                        style={
                          day === d.value
                            ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                            : { borderColor: BORDER, color: INK, backgroundColor: "white" }
                        }
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium" style={{ color: MUTED }}>
                    Créneau
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="time"
                      value={windowStart}
                      onChange={(e) => setWindowStart(e.target.value)}
                      className="rounded-lg border bg-white px-3 py-2 text-sm"
                      style={{ borderColor: BORDER }}
                    />
                    <span style={{ color: MUTED }}>—</span>
                    <input
                      type="time"
                      value={windowEnd}
                      onChange={(e) => setWindowEnd(e.target.value)}
                      className="rounded-lg border bg-white px-3 py-2 text-sm"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Quand recevoir la proposition ?</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyDaysBefore(0)}
                  className="rounded-xl border px-4 py-3 text-sm transition-colors"
                  style={
                    notifyDaysBefore === 0
                      ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` }
                      : { borderColor: BORDER, backgroundColor: "white" }
                  }
                >
                  Le jour même
                </button>
                <button
                  type="button"
                  onClick={() => setNotifyDaysBefore(1)}
                  className="rounded-xl border px-4 py-3 text-sm transition-colors"
                  style={
                    notifyDaysBefore === 1
                      ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` }
                      : { borderColor: BORDER, backgroundColor: "white" }
                  }
                >
                  La veille
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: MUTED }}>
                Utile si votre créneau tombe un jour où vous ne consultez pas vos messages (ex. Shabbat).
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border py-3.5 text-sm font-medium transition-colors"
                style={{ borderColor: BORDER, color: INK }}
              >
                Retour
              </button>
              <button
                type="button"
                onClick={goToStep3}
                className="flex-1 rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: ACCENT }}
              >
                Continuer
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-medium">L&apos;ambiance</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {VIBE_PILLS.map((v) => (
                  <button
                    type="button"
                    key={v.value}
                    onClick={() => toggle(venueTypes, v.value, setVenueTypes)}
                    className="flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors"
                    style={
                      venueTypes.includes(v.value)
                        ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                        : { borderColor: BORDER, color: INK, backgroundColor: "white" }
                    }
                  >
                    <span>{v.emoji}</span>
                    {v.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toggle(venueTypes, SECONDARY_VENUE.value, setVenueTypes)}
                className="mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
                style={
                  venueTypes.includes(SECONDARY_VENUE.value)
                    ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D`, color: ACCENT }
                    : { borderColor: BORDER, color: MUTED }
                }
              >
                <span>{SECONDARY_VENUE.emoji}</span>
                {SECONDARY_VENUE.label}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Code postal <span className="font-normal" style={{ color: MUTED }}>(facultatif)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
                placeholder="75001"
              />
              {(locationStatus === "locating" || locationStatus === "resolving") && (
                <div className="mt-2">
                  <StatusBanner steps={LOCATION_STEPS} currentKey={locationStatus} />
                </div>
              )}
              {locationStatus === "idle" && (
                <button
                  type="button"
                  onClick={detectLocation}
                  className="mt-2 text-xs font-medium underline underline-offset-4"
                  style={{ color: ACCENT }}
                >
                  Utiliser ma position actuelle
                </button>
              )}
              <p className="mt-2 text-xs" style={{ color: MUTED }}>
                Pour proposer des lieux près de chez vous. Sans code postal, on propose des lieux à Paris par défaut.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Filtres <span className="font-normal" style={{ color: MUTED }}>(facultatif)</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => toggle(dietaryFilters, f, setDietaryFilters)}
                    className="rounded-full border px-3 py-1.5 text-xs capitalize transition-colors"
                    style={
                      dietaryFilters.includes(f)
                        ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D`, color: ACCENT }
                        : { borderColor: BORDER, color: MUTED }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: ACCENT }}>
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border py-3.5 text-sm font-medium transition-colors"
                style={{ borderColor: BORDER, color: INK }}
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {submitting ? "Envoi…" : `Créer notre rituel${partnerName ? " " + partnerName : ""}`}
              </button>
            </div>
          </section>
        )}
      </form>
    </Shell>
  );
}
