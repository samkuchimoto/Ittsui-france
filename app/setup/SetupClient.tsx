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
//     - "Duo type" selector in Step 1 (ami / partenaire / famille) was
//       local-only UI state for copy/tone until the mascot system needed
//       to know which relationship a pair actually is (see
//       lib/mascots.config.ts) — now sent as `relationshipKind` and
//       persisted on the Pair document (lib/types.ts, invite-partner
//       route). Optional and additive: a pair created before this existed
//       simply has no value, and every reader treats that as "use the
//       default pair" rather than an error.
//     - Design tokens applied throughout (see lib/theme.ts), Fraunces
//       headlines, Work Sans body — matching app/page.tsx.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { Capacitor } from "@capacitor/core";
import { auth, db, signInWithGoogle, watchAuthState } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { VenueType, DietaryFilter, Pair } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { SlowLoadFallback } from "@/app/components/SlowLoadFallback";
import { mostRecentByCreatedAt } from "@/lib/sort";
import { signInWithPasskey } from "@/lib/passkeyClient";
import { TimeSelect } from "@/app/components/TimeSelect";
import { StatusBanner, type StatusStep } from "@/app/components/StatusBanner";
import { DiscoveryGrid, type DiscoveryTile } from "@/app/components/DiscoveryGrid";
import { MascotAvatar } from "@/app/components/MascotAvatar";
import { RELATIONSHIP_PAIR, MASCOT_PAIRS } from "@/lib/mascots.config";
import { useUserLocation } from "@/app/hooks/useUserLocation";
import { shareLink } from "@/lib/shareLink";
import { whatsappLinkForNumber, smsLinkForNumber } from "@/lib/phoneShareLinks";
import { pickNativeContact, type PickedContact } from "@/lib/nativeContacts";
import { PhoneContactPicker } from "@/app/components/PhoneContactPicker";
import { OriginStorySheet } from "@/app/components/OriginStorySheet";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";
import { VENUE_PHOTOS } from "@/lib/venuePhotos";
import { isValidEmail } from "@/lib/validation";
import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";

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

// Visual tile grid, real photography for all four now — image sources
// live in lib/venuePhotos.ts, shared with the request flow's own venue
// tiles so a photo swap can't drift out of sync between the two places a
// venue type is picked. Restaurant/Culture use general-mood Unsplash
// stock (verified reachable, real JPEGs, before wiring in) rather than
// the AI mood illustration path — these are licensed real photographs, a
// strictly better match for "high-resolution photo tile" than a
// generated illustration would be, and the AI path stays reserved for
// categories with neither a real photo nor a stock option.
const DISCOVERY_TILES: DiscoveryTile[] = [
  { value: "cafe", label: "Café", image: VENUE_PHOTOS.cafe },
  { value: "park", label: "Parc", image: VENUE_PHOTOS.park },
  { value: "restaurant", label: "Restaurant", image: VENUE_PHOTOS.restaurant },
  { value: "museum", label: "Culture", image: VENUE_PHOTOS.museum },
];
// "sam" typed into the name field shouldn't render lowercase in CTA copy
// downstream ("Créer notre rituel avec sam") — capitalizes each name part,
// splitting on spaces/hyphens so "jean-paul" and "marie claire" both come
// out right, not just single first names.
function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/([\s-])/)
    .map((part) => (part === " " || part === "-" || part === "" ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

// Native <input type="time"> renders in whatever format the OS/browser
// locale dictates (12h AM/PM on plenty of real devices) regardless of the
// page's own French UI — see app/components/TimeSelect.tsx (extracted
// there once the meeting-request form needed the same control).

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

const CADENCE_OPTIONS: { value: NonNullable<Pair["cadence"]>; label: string }[] = [
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
  { value: "yearly", label: "Chaque année" },
];

const CADENCE_ADVERB: Record<NonNullable<Pair["cadence"]>, string> = {
  weekly: "chaque semaine",
  monthly: "chaque mois",
  yearly: "chaque année",
};

const CADENCE_MOMENT_PHRASE: Record<NonNullable<Pair["cadence"]>, string> = {
  weekly: "notre moment de la semaine",
  monthly: "notre moment du mois",
  yearly: "notre moment de l'année",
};

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
  // Hides the small header mascot mark while the origin story sheet is
  // open — its own pair is already on screen, larger; showing both at
  // once duplicated the same graphic (confirmed live, and flagged
  // independently in the Gemini audit as "redundant branding").
  const [storySheetOpen, setStorySheetOpen] = useState(false);
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <OriginStorySheet onOpenChange={setStorySheetOpen} />
      <div className="mx-auto max-w-md px-6 py-14">
        {/* One-tap way back to the homepage from any step/state on this
            page — real feedback: there was no way out of some screens
            short of the browser's own back button. */}
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>
        {!storySheetOpen && <PageMascotHeader />}
        {children}
      </div>
    </main>
  );
}

export default function SetupClient() {
  const router = useRouter();

  // Auth state: null = not checked yet, false = checked and not signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [checkingPair, setCheckingPair] = useState(true);
  // 3-second escape hatch — same pattern as /invite and /dashboard, so a
  // load that genuinely runs long has a real way out instead of an
  // endlessly rotating "Un instant…" with no ceiling.
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    if (user !== null && !checkingPair) return;
    const timer = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(timer);
  }, [user, checkingPair]);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [partnerName, setPartnerName] = useState("");
  // Phone first, on purpose: real people know a friend's phone number,
  // not their email, especially away from a desk (2026-08-25 real-user
  // test — see /request/new's identical fields for the fuller reasoning).
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [duoType, setDuoType] = useState<DuoType | null>(null); // local UI only, not sent to API
  const [isNative, setIsNative] = useState(false);
  const [importingPartner, setImportingPartner] = useState(false);
  // Collapsed by default — see RequestFormClient.tsx's identical toggle for
  // the real Gen Z tester feedback ("avec l'email c'est pour faire quoi")
  // this responds to. Auto-revealed whenever a value already exists
  // (contact import), never hidden once shown.
  const [showPartnerEmail, setShowPartnerEmail] = useState(false);

  // Checked post-mount, not during render: Capacitor's platform check only
  // resolves correctly in the browser, so seeding it into render directly
  // would render "web" on the server and "native" on the client's first
  // paint — the same SSR/client mismatch already worked around in
  // /request/new and /contacts (see lib/nativeContacts.ts).
  useEffect(() => setIsNative(Capacitor.isNativePlatform()), []);

  // Not every relationship needs a weekly touchpoint — a monthly catch-up
  // fits extended family or a mentor better than the default weekly
  // rhythm, and the reverse (forcing weekly on someone who doesn't want
  // it) is a real reason people would avoid setting up a pair at all.
  // Reuses agreedDay/agreedWindowStart exactly as-is; weekly-propose's
  // isCadenceDue() just skips most weekly opportunities for the other two.
  const [cadence, setCadence] = useState<NonNullable<Pair["cadence"]>>("weekly");
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
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{
    name: string;
    hasEmail: boolean;
    phone: string;
    pairId: string;
    inviteUrl: string;
    cadence: NonNullable<Pair["cadence"]>;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Geolocation is deliberately NOT triggered on mount — it's requested
  // only from Step 3's own "Utiliser ma position actuelle" button, so a
  // permission prompt never appears before someone's even entered who
  // they're inviting.
  const { status: locationStatus, postalCode: detectedPostalCode, detect: detectLocation } = useUserLocation();

  // Pre-fills the manual field rather than replacing it — postalCode stays
  // a normal editable input either way, this just saves a typing step.
  useEffect(() => {
    if (detectedPostalCode) setPostalCode(detectedPostalCode);
  }, [detectedPostalCode]);

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
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
      try {
        // array-contains + orderBy on a different field is a composite
        // query Firestore needs an index for, which this project doesn't
        // have — sorted client-side (lib/sort.ts) instead, preserving the
        // exact same "most recent pair wins" behavior AGENTS.md's own
        // note on this query already explains the reasoning for.
        const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => d.data() as Pair);
        const pair = mostRecentByCreatedAt(docs);
        if (pair?.status === "active") {
          router.push("/dashboard");
          return;
        }
      } catch {
        // A real Firestore error must still resolve checkingPair rather
        // than leave the loading state spinning forever — falls through
        // to the normal wizard, same as "no existing pair found".
      }
      setCheckingPair(false);
    })();
  }, [user, router]);

  async function handleGoogleSignIn() {
    if (signingIn) return; // already in flight — a second tap while the popup is open
    // cancels the first one and reopens it, which looked like the account
    // chooser inexplicably reappearing (confirmed via real testing 2026-08-25)
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion.");
    } finally {
      setSigningIn(false);
    }
  }

  // Additional sign-in method, not a replacement — Google Sign-In above is
  // completely unchanged. onAuthStateChanged (already wired via
  // watchAuthState in the effect above) picks up the session the same way
  // regardless of which method produced it.
  async function handlePasskeySignIn() {
    setError(null);
    const result = await signInWithPasskey();
    if (!result.ok) setError(result.error);
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

  // Shared by handleImportPartner (OS single-pick dialog) and
  // PhoneContactPicker below (in-app browsable list, same one /request/new
  // and /contacts use) — "like I can WhatsApp people directly from my
  // phone contacts, I want to Ittsui people directly" applies here too,
  // this being the one recipient-picking screen in the app that had no
  // import option of any kind before.
  function applyPickedPartner(picked: PickedContact) {
    if (picked.name) setPartnerName(picked.name);
    const hasValidEmail = Boolean(picked.email && isValidEmail(picked.email));
    const hasPhone = Boolean(picked.phone);
    // Wholesale replace with what THIS contact actually has, but keep
    // BOTH when the contact has both — same fix as RequestFormClient.tsx
    // and ContactsClient.tsx's identical applyPickedContact functions.
    setPartnerEmail(hasValidEmail ? picked.email! : "");
    setPartnerPhone(hasPhone ? picked.phone! : "");
    if (!hasValidEmail && !hasPhone) {
      setError("Ce contact n'a ni e-mail ni numéro de téléphone enregistré.");
    }
  }

  async function handleImportPartner() {
    setError(null);
    setImportingPartner(true);
    try {
      const picked = await pickNativeContact();
      if (!picked) return;
      applyPickedPartner(picked);
    } finally {
      setImportingPartner(false);
    }
  }

  // Field-specific messages, not a combined "fill everything in" — and a
  // real format check, since goToStep2 is called from a plain button click
  // (not a form submit), so the input's own type="email" browser
  // validation never gets a submit event to trigger on.
  function goToStep2() {
    setError(null);
    if (!partnerName.trim()) {
      setError("Indiquez le prénom de votre proche.");
      return;
    }
    const hasPhone = partnerPhone.trim().length > 0;
    const hasEmail = partnerEmail.trim().length > 0;
    if (!hasPhone && !hasEmail) {
      setError("Indiquez son numéro de téléphone ou son e-mail.");
      return;
    }
    if (hasEmail && !isValidEmail(partnerEmail)) {
      setError("Cette adresse e-mail ne semble pas valide.");
      return;
    }
    setStep(2);
  }

  function goToStep3() {
    setStep(3);
  }

  async function submitInvite() {
    setError(null);

    if (!user) {
      setError("Vous devez être connecté(e).");
      return;
    }
    if (venueTypes.length === 0) {
      setError("Choisissez au moins un type de lieu.");
      return;
    }

    const hasPhone = partnerPhone.trim().length > 0;
    const hasEmail = partnerEmail.trim().length > 0;

    setSubmitting(true);
    try {
      const res = await fetch("/api/invite-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterUid: user.uid,
          inviterName: user.displayName ?? "Quelqu'un",
          partnerName,
          ...(hasEmail ? { partnerEmail } : {}),
          ...(hasPhone ? { partnerPhone } : {}),
          agreedDay: day,
          agreedWindowStart: windowStart,
          agreedWindowEnd: windowEnd,
          cadence,
          ...(duoType ? { relationshipKind: duoType } : {}),
          notifyDaysBefore,
          postalCode: postalCode || undefined,
          preferences: { venueTypes, dietaryFilters },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");

      setInvited({ name: partnerName, hasEmail, phone: partnerPhone, pairId: data.pairId, inviteUrl: data.inviteUrl, cadence });
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

  async function handleShare() {
    if (!invited) return;
    const result = await shareLink({
      title: "Ittsui - Notre moment",
      text: `Je t'ai préparé ${CADENCE_MOMENT_PHRASE[invited.cadence]} ! Rejoins-moi sur Ittsui :`,
      url: invited.inviteUrl,
    });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    // "failed" leaves the link visible on screen either way, for the
    // person to select and copy manually — nothing more to do silently.
  }

  // Still checking auth state, or checking for an existing pair
  if (user === null || (user && checkingPair)) {
    return (
      <Shell>
        <p className="text-center text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
        <SlowLoadFallback show={slowLoad} />
      </Shell>
    );
  }

  // Not signed in — every sign-out in the app (dashboard, contacts, etc.)
  // redirects here once `user` resolves to false, so this was a real
  // dead end: no logo, no link back to `/`, only a URL-bar edit could
  // get someone back to the marketing site. Found via real end-to-end
  // testing, not a hypothetical.
  if (user === false) {
    return (
      <Shell>
        <div className="text-center">
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
            Ittsui
          </Link>
          <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
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
            disabled={signingIn}
            className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {signingIn ? "Connexion..." : "Se connecter avec Google"}
          </button>
          <button
            onClick={handlePasskeySignIn}
            className="mt-3 w-full rounded-full border py-3.5 text-sm font-medium transition-colors"
            style={{ borderColor: BORDER, color: INK }}
          >
            Se connecter avec une clé d&apos;accès
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
            {invited.hasEmail ? "Invitation envoyée" : "Invitation prête"}
          </h1>
          {invited.hasEmail && (
            <>
              <p className="mt-3 text-sm" style={{ color: MUTED }}>
                Un e-mail a été envoyé à {invited.name}.
              </p>
              <div className="mt-4 flex justify-center">
                <StatusBanner
                  steps={SENT_STEPS}
                  currentKey="sent"
                  doneSlot={
                    <button type="button" onClick={handleShare} className="ml-1 font-medium underline underline-offset-4">
                      Partager l&apos;invitation
                    </button>
                  }
                />
              </div>
            </>
          )}
          {/* Phone-based instant share shown whenever a phone number was
              captured, EVEN when an email was also given — see the
              identical fix + rationale in /request/new/RequestFormClient.tsx
              (found via a live test where a partner with both an email and
              phone number never saw the WhatsApp/SMS buttons at all). */}
          {invited.phone.trim().length > 0 && (
            <>
              <p className={invited.hasEmail ? "mt-4 text-sm" : "mt-3 text-sm"} style={{ color: MUTED }}>
                {invited.hasEmail
                  ? "Pour que ça aille plus vite, vous pouvez aussi lui envoyer le lien tout de suite :"
                  : `Presque : ${invited.name} n'a pas d'e-mail enregistré, alors envoyez-lui ce lien vous-même — un tap suffit.`}
              </p>
              <div className="mt-4 space-y-2">
                {(() => {
                  const text = `${invited.name}, je t'ai préparé ${CADENCE_MOMENT_PHRASE[invited.cadence]} sur Ittsui : ${invited.inviteUrl}`;
                  const whatsappHref = whatsappLinkForNumber(invited.phone, text);
                  const smsHref = smsLinkForNumber(invited.phone, text);
                  return (
                    <>
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
                          style={{ backgroundColor: "#25D366" }}
                        >
                          Envoyer par WhatsApp
                        </a>
                      )}
                      {smsHref && (
                        <a
                          href={smsHref}
                          className="flex w-full items-center justify-center rounded-full border py-3.5 text-sm font-medium"
                          style={{ borderColor: BORDER, color: INK }}
                        >
                          Envoyer par SMS
                        </a>
                      )}
                    </>
                  );
                })()}
                {/* Snapchat named explicitly — see /request/new's identical
                    comment: 90% of French Gen Z uses it, but its deep links
                    are username- not phone-number-based, so it's reachable
                    here (native share -> pick Snapchat) rather than via its
                    own dedicated button the way WhatsApp/SMS have. */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full rounded-full border py-3 text-sm font-medium"
                  style={{ borderColor: BORDER, color: MUTED }}
                >
                  Snapchat, Messenger, ou une autre appli...
                </button>
              </div>
            </>
          )}
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
              Rien à faire de votre côté. Dès que {invited.name} se connecte, votre rituel{" "}
              {invited.cadence === "weekly" ? "hebdomadaire" : invited.cadence === "monthly" ? "mensuel" : "annuel"}{" "}
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
            {isNative && (
              <button
                type="button"
                onClick={handleImportPartner}
                disabled={importingPartner}
                className="w-full rounded-xl border bg-white py-3 text-sm font-medium disabled:opacity-60"
                style={{ borderColor: BORDER, color: INK }}
              >
                {importingPartner ? "Import..." : "Importer depuis mes contacts"}
              </button>
            )}
            {isNative && (
              <PhoneContactPicker
                onPick={applyPickedPartner}
                triggerClassName="w-full rounded-xl border bg-white py-3 text-sm font-medium disabled:opacity-60"
                triggerStyle={{ borderColor: BORDER, color: INK }}
              />
            )}
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
              {/* Phone first, on purpose: real people know a friend's
                  phone number, not their email, especially away from a
                  desk — see this file's own state comment. */}
              <input
                type="tel"
                value={partnerPhone}
                onChange={(e) => setPartnerPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                style={{ borderColor: BORDER }}
                placeholder="Son numéro de téléphone"
              />
              {showPartnerEmail || partnerEmail.trim().length > 0 ? (
                <>
                  <p className="mt-3 text-xs" style={{ color: MUTED }}>
                    Ou, si vous l&apos;avez, son e-mail :
                  </p>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                    style={{ borderColor: BORDER }}
                    placeholder="Son e-mail (optionnel)"
                  />
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPartnerEmail(true)}
                  className="mt-3 text-xs font-medium underline underline-offset-4"
                  style={{ color: MUTED }}
                >
                  + Ajouter aussi un e-mail
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">C&apos;est qui, pour vous ?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DUO_TYPES.map((d) => {
                  const [repCharacter] = MASCOT_PAIRS[RELATIONSHIP_PAIR[d.value]];
                  return (
                    <motion.button
                      type="button"
                      key={d.value}
                      onClick={() => setDuoType(d.value)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22 }}
                      className="flex items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3.5 text-sm"
                      style={
                        duoType === d.value
                          ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                          : { borderColor: BORDER, color: INK }
                      }
                    >
                      <MascotAvatar characterId={repCharacter} variant="bust" size={22} className="shrink-0" />
                      {d.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: ACCENT }}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={goToStep2}
              disabled={submitting}
              className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              Continuer vers le moment →
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-medium">À quelle fréquence ?</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {CADENCE_OPTIONS.map((c) => (
                  <motion.button
                    type="button"
                    key={c.value}
                    onClick={() => setCadence(c.value)}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="rounded-xl border px-2 py-2.5 text-xs font-medium sm:text-sm"
                    style={
                      cadence === c.value
                        ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                        : { borderColor: BORDER, color: INK, backgroundColor: "white" }
                    }
                  >
                    {c.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Quand, {CADENCE_ADVERB[cadence]} ?</label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {TIME_PRESETS.map((p) => (
                  <motion.button
                    type="button"
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="rounded-xl border px-4 py-3 text-left text-sm"
                    style={
                      !customTime && activePreset === p.label
                        ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` }
                        : { borderColor: BORDER, backgroundColor: "white" }
                    }
                  >
                    {p.label}
                  </motion.button>
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
                    <TimeSelect value={windowStart} onChange={setWindowStart} label="Début du créneau" />
                    <span style={{ color: MUTED }}>—</span>
                    <TimeSelect value={windowEnd} onChange={setWindowEnd} label="Fin du créneau" />
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
              <div className="mt-2">
                <DiscoveryGrid
                  tiles={DISCOVERY_TILES}
                  selected={venueTypes}
                  onToggle={(value) => toggle(venueTypes, value, setVenueTypes)}
                />
              </div>
              <motion.button
                type="button"
                onClick={() => toggle(venueTypes, SECONDARY_VENUE.value, setVenueTypes)}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                style={
                  venueTypes.includes(SECONDARY_VENUE.value)
                    ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D`, color: ACCENT }
                    : { borderColor: BORDER, color: MUTED }
                }
              >
                <span>{SECONDARY_VENUE.emoji}</span>
                {SECONDARY_VENUE.label}
              </motion.button>
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
              {/* denied/unavailable/error used to render nothing at all —
                  the "Utiliser ma position actuelle" link (idle-only, above)
                  just vanished with no explanation and no way to retry,
                  which is indistinguishable from "GPS doesn't work" from
                  the outside. useUserLocation.ts's retry lockout is fixed
                  too; this is the other half. */}
              {locationStatus === "denied" && (
                <p className="mt-2 text-xs" style={{ color: ACCENT }}>
                  Localisation refusée — autorisez-la dans les réglages de votre navigateur, ou continuez avec le
                  code postal.{" "}
                  <button type="button" onClick={detectLocation} className="underline underline-offset-4">
                    Réessayer
                  </button>
                </p>
              )}
              {locationStatus === "unavailable" && (
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  Localisation indisponible sur cet appareil — continuez avec le code postal.
                </p>
              )}
              {locationStatus === "error" && (
                <p className="mt-2 text-xs" style={{ color: ACCENT }}>
                  Impossible de déterminer votre position.{" "}
                  <button type="button" onClick={detectLocation} className="underline underline-offset-4">
                    Réessayer
                  </button>{" "}
                  ou continuez avec le code postal.
                </p>
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
                  <motion.button
                    type="button"
                    key={f}
                    onClick={() => toggle(dietaryFilters, f, setDietaryFilters)}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="rounded-full border px-3 py-1.5 text-xs capitalize"
                    style={
                      dietaryFilters.includes(f)
                        ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D`, color: ACCENT }
                        : { borderColor: BORDER, color: MUTED }
                    }
                  >
                    {f}
                  </motion.button>
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
                {submitting ? "Envoi…" : `Créer notre rituel${partnerName ? " avec " + capitalizeName(partnerName) : ""}`}
              </button>
            </div>
          </section>
        )}
      </form>
    </Shell>
  );
}
