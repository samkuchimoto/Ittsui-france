"use client";
// /app/setup/page.tsx
// One-time setup: name + email the person to link, agree on a recurring day
// + window, set the preference profile, then send them an invite.
// The pair activates later when they log in with Google (see
// /app/invite/[pairId]/page.tsx + /api/activate-pending-pair).

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, signInWithGoogle, watchAuthState } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { VenueType, DietaryFilter, Pair } from "@/lib/types";

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

const DIETARY_OPTIONS: DietaryFilter[] = ["casher", "halal", "vegetarien", "bio", "antillais"];

export default function SetupPage() {
  const router = useRouter();

  // Auth state: null = not checked yet, false = checked and not signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [checkingPair, setCheckingPair] = useState(true);

  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [day, setDay] = useState<Pair["agreedDay"]>("sun");
  const [windowStart, setWindowStart] = useState("15:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [venueTypes, setVenueTypes] = useState<VenueType[]>(["cafe"]);
  const [dietaryFilters, setDietaryFilters] = useState<DietaryFilter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ name: string; email: string } | null>(null);

  // Watch auth state on mount
  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u ?? false);
    });
    return unsub;
  }, []);

  // Once we know who's signed in, check if they already have a pair
  // (pending or active). If so, skip setup entirely.
  useEffect(() => {
    if (!user) {
      setCheckingPair(false);
      return;
    }
    (async () => {
      const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const pair = snap.docs[0].data() as Pair;
        router.push(pair.status === "active" ? "/dashboard" : "/setup/pending");
        return;
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

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Vous devez être connecté(e).");
      return;
    }
    if (venueTypes.length === 0) {
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
          agreedDay: day,
          agreedWindowStart: windowStart,
          agreedWindowEnd: windowEnd,
          preferences: { venueTypes, dietaryFilters },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");

      setInvited({ name: partnerName, email: partnerEmail });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  // Still checking auth state, or checking for an existing pair
  if (user === null || (user && checkingPair)) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement…</p>
      </main>
    );
  }

  // Not signed in
  if (user === false) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Configuration</h1>
        <p className="mt-2 text-sm text-neutral-500">Connectez-vous pour continuer.</p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleGoogleSignIn}
          className="mt-6 w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white"
        >
          Se connecter avec Google
        </button>
      </main>
    );
  }

  // Invitation just sent — confirmation screen
  if (invited) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Invitation envoyée</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Un e-mail a été envoyé à {invited.name} ({invited.email}). Dès qu'ils se connectent, votre rendez-vous
          hebdomadaire s'active.
        </p>
      </main>
    );
  }

  // Signed in, no pair yet: show the form
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">Configuration</h1>
      <p className="mt-1 text-sm text-neutral-500">Une seule fois. Rien de tout ceci ne sera redemandé.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section>
          <label className="block text-sm font-medium text-neutral-800">
            Qui voulez-vous lier ?
          </label>
          <input
            type="text"
            required
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Prénom"
          />
          <input
            type="email"
            required
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Son e-mail"
          />
        </section>

        <section>
          <label className="block text-sm font-medium text-neutral-800">Jour de la semaine</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DAYS.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => handleDayChange(d.value)}
                className={`rounded-lg border px-2 py-2 text-sm ${
                  day === d.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-neutral-800">Créneau</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="time"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <span className="text-neutral-400">—</span>
            <input
              type="time"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-neutral-800">Type de lieu</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {VENUE_TYPES.map((v) => (
              <button
                type="button"
                key={v.value}
                onClick={() => toggle(venueTypes, v.value, setVenueTypes)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  venueTypes.includes(v.value)
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-neutral-800">
            Filtre alimentaire / culturel <span className="text-neutral-400">(facultatif)</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => toggle(dietaryFilters, f, setDietaryFilters)}
                className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
                  dietaryFilters.includes(f)
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Envoyer l'invitation"}
        </button>
      </form>
    </main>
  );
}
