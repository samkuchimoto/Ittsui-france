"use client";
// /app/dashboard/page.tsx
// Shows this week's proposal (if any) and its status. Real-time via
// Firestore listeners, so both people see a lock/cancel the moment it happens.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, watchAuthState } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair, Week } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();

  // null = not checked yet, false = checked and not signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [pairChecked, setPairChecked] = useState(false);
  const [week, setWeek] = useState<Week | null>(null);
  const [responding, setResponding] = useState(false);

  // Watch auth state on mount
  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u ?? false);
    });
    return unsub;
  }, []);

  // Redirect to setup if not signed in
  useEffect(() => {
    if (user === false) {
      router.push("/setup");
    }
  }, [user, router]);

  // Find the pair this user belongs to
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPair({ id: snap.docs[0].id, ...snap.docs[0].data() } as Pair);
      } else {
        setPair(null);
      }
      setPairChecked(true);
    });
    return unsub;
  }, [user]);

  // Listen for the most recent week doc under that pair
  useEffect(() => {
    if (!pair) return;
    const q = query(
      collection(db, "pairs", pair.id, "weeks"),
      orderBy("weekOf", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setWeek({ id: snap.docs[0].id, ...snap.docs[0].data() } as Week);
      }
    });
    return unsub;
  }, [pair]);

  async function respond(response: "yes" | "no") {
    if (!pair || !week || !user) return;
    setResponding(true);
    try {
      await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId: pair.id,
          weekId: week.id,
          userId: user.uid,
          response,
        }),
      });
    } finally {
      setResponding(false);
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

  // Not signed in — redirect effect above will kick in, show nothing meaningful here
  if (user === false) {
    return null;
  }

  // Signed in, still checking for a pair
  if (!pairChecked) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement…</p>
      </main>
    );
  }

  if (!pair) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">
          Aucune personne liée pour le moment.
        </p>
      </main>
    );
  }

  const myId = user.uid;
  const myResponse = week && myId ? week.responses[myId] : null;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">Cette semaine</h1>

      {!week && (
        <p className="mt-6 text-sm text-neutral-500">
          Rien de proposé pour l'instant. Ça arrive automatiquement le jour convenu.
        </p>
      )}

      {week && (
        <div className="mt-6 rounded-xl border border-neutral-200 p-5">
          <p className="text-base text-neutral-900">{week.confirmationText}</p>

          <StatusBadge status={week.status} />

          {week.status === "proposed" && myResponse === null && (
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => respond("yes")}
                disabled={responding}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Oui
              </button>
              <button
                onClick={() => respond("no")}
                disabled={responding}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 disabled:opacity-50"
              >
                Non
              </button>
            </div>
          )}

          {week.status === "proposed" && myResponse !== null && (
            <p className="mt-4 text-sm text-neutral-500">
              En attente de l'autre personne…
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Week["status"] }) {
  const styles: Record<Week["status"], string> = {
    proposed: "bg-amber-50 text-amber-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  const labels: Record<Week["status"], string> = {
    proposed: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé",
  };
  return (
    <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}