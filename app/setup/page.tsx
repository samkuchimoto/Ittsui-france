"use client";
// /app/setup/page.tsx
// One-time setup: link the other person by email, agree on a recurring day
// + window, and set the preference profile. Never shown again after this.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, signInWithGoogle, watchAuthState } from "@/lib/firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
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

  const [partnerEmail, setPartnerEmail] = useState("");
  const [day, setDay] = useState<Pair["agreedDay"]>("sun");
  const [windowStart, setWindowStart] = useState("15:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [venueTypes, setVenueTypes] = useState<VenueType[]>(["cafe"]);
  const [dietaryFilters, setDietaryFilters] = useState<DietaryFilter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Watch auth state on mount
  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u ?? false);
    });
    return unsub;
  }, []);

  // Once we know who's signed in, check if they already have a pair.
  // If so, skip setup entirely and go straight to the dashboard.
  useEffect(() => {
    if (!user) {
      setCheckingPair(false);
      return;
    }
    (async () => {
      const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        router.push("/dashboard");
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
      const lookupRes = await fetch("/api/find-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: partnerEmail }),
      });

      if (!lookupRes.ok) {
        const data = await lookupRes.json().catch(() => null);
        throw new Error(data?.error ?? "Partenaire introuvable — vérifiez l'e-mail.");
      }
      const { userId: partnerId } = await lookupRes.json();

      const pairRef = doc(collection(db, "pairs"));
      await setDoc(pairRef, {
        userIds: [user.uid, partnerId],
        agreedDay: day,
        agreedWindowStart: windowStart,
        agreedWindowEnd: windowEnd,
        preferences: { venueTypes, dietaryFilters },
        subscriptionStatus: "trialing",
        createdAt: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  // Still checking auth state
  if (user === null) {
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
        <p className="mt-2 text-sm text-neutral-500">
          Connectez-vous pour continuer.
        </p>
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

  // Signed in, but still checking whether they already have a pair
  if (checkingPair) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement…</p>
      </main>
    );
  }

  // Signed in, no pair yet: show the form
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">Configuration</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Une seule fois. Rien de tout ceci ne sera redemandé.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section>
          <label className="block text-sm font-medium text-neutral-800">
            E-mail de la personne à lier
          </label>
          <input
            type="email"
            required
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="prenom@exemple.fr"
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
          {submitting ? "Enregistrement…" : "Valider"}
        </button>
      </form>
    </main>
  );
}