"use client";
// /app/setup/pending/page.tsx
// Shown to the inviter after they send an invite. Live-listens on their
// pair doc so the screen updates the moment the partner logs in (active),
// declines, or the invite expires -- no polling, no refresh needed.
//
// Fixed: the pairs query now orders by createdAt descending and takes only
// the most recent one. Previously it took snap.docs[0] with no ordering,
// which let an old stale pair (from earlier testing) surface instead of
// the current one -- that was the cause of an old partner name reappearing
// even after starting a fresh invite.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, watchAuthState, signOutUser } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair } from "@/lib/types";

export default function PendingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | false | null>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [checked, setChecked] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "pairs"),
      where("userIds", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        router.push("/setup");
        return;
      }
      const p = { id: snap.docs[0].id, ...snap.docs[0].data() } as Pair;
      setPair(p);
      setChecked(true);
      if (p.status === "active") router.push("/dashboard");
    });
    return unsub;
  }, [user, router]);

  async function handleSignOut() {
    await signOutUser();
    router.push("/setup");
  }

  async function handleCancel() {
    if (!pair || !user) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/cancel-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: pair.id, userId: user.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      router.push("/setup");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setCancelling(false);
    }
  }

  if (user === null || user === false || !checked || !pair) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement...</p>
      </main>
    );
  }

  if (pair.status === "declined") {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Invitation déclinée</h1>
        <p className="mt-3 text-sm text-neutral-600">
          {pair.partnerName} n'a pas souhaité être lié(e). Vous pouvez inviter quelqu'un d'autre.
        </p>
        <button
          onClick={() => router.push("/setup")}
          className="mt-6 w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white"
        >
          Nouvelle invitation
        </button>
        <button
          onClick={handleSignOut}
          className="mt-4 text-xs text-neutral-400 underline underline-offset-4"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  if (pair.status === "expired") {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Invitation expirée</h1>
        <p className="mt-3 text-sm text-neutral-600">
          {pair.partnerName} n'a pas répondu à temps. Vous pouvez réessayer.
        </p>
        <button
          onClick={() => router.push("/setup")}
          className="mt-6 w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white"
        >
          Nouvelle invitation
        </button>
        <button
          onClick={handleSignOut}
          className="mt-4 text-xs text-neutral-400 underline underline-offset-4"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  // status === "pending"
  return (
    <main className="mx-auto max-w-md px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">En attente</h1>
      <p className="mt-3 text-sm text-neutral-600">
        {pair.partnerName} n'a pas encore rejoint Ittsui. Cette page se met à jour automatiquement dès que c'est fait.
      </p>
      {cancelError && <p className="mt-4 text-sm text-red-600">{cancelError}</p>}
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="mt-8 w-full rounded-lg border border-neutral-300 py-3 text-sm font-medium text-neutral-700 disabled:opacity-50"
      >
        {cancelling ? "Annulation..." : "Annuler l'invitation"}
      </button>
      <button
        onClick={handleSignOut}
        className="mt-4 text-xs text-neutral-400 underline underline-offset-4"
      >
        Se déconnecter
      </button>
    </main>
  );
}