"use client";
// /app/setup/pending/PendingClient.tsx
// Shown to the inviter after they send an invite. Live-listens on their
// pair doc so the screen updates the moment the partner logs in (active),
// declines, or the invite expires -- no polling, no refresh needed.
//
// Split out of page.tsx so page.tsx can stay a Server Component that
// exports `dynamic = "force-dynamic"` — see page.tsx's header comment.
//
// Fixed: the pairs query now orders by createdAt descending and takes only
// the most recent one. Previously it took snap.docs[0] with no ordering,
// which let an old stale pair (from earlier testing) surface instead of
// the current one -- that was the cause of an old partner name reappearing
// even after starting a fresh invite.
//
// Brought onto the same design system as the rest of the app (Fraunces/
// Work Sans, INK/MUTED/ACCENT/BORDER) and now shows whether the invite
// email actually sent (pair.partnerEmailSent), not just that it was
// attempted — the visible delivery record this screen never had before.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import { auth, db, watchAuthState, signOutUser } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FBF9F5] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-14 text-center">{children}</div>
    </main>
  );
}

function DeliveryStatus({ pair }: { pair: Pair }) {
  if (typeof pair.partnerEmailSent !== "boolean") return null;
  const time = pair.inviteSentAt
    ? new Date(pair.inviteSentAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <p className="mt-3 text-xs" style={{ color: pair.partnerEmailSent ? MUTED : ACCENT }}>
      {pair.partnerEmailSent ? "✓ E-mail envoyé" : "⚠ Échec d'envoi de l'e-mail"}
      {time && ` · ${time}`}
    </p>
  );
}

export default function PendingClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | false | null>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [checked, setChecked] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pastInvites, setPastInvites] = useState<Pair[]>([]);

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

  // Read-only history: past invitations this user sent that are no longer
  // live (declined/expired/cancelled), so "invitation déjà envoyée" isn't
  // a dead end with no way to see what you already tried. Doesn't include
  // received invitations — those aren't queryable client-side today (an
  // invitee isn't in userIds, and thus can't read the pending pair doc,
  // until they accept via the emailed link), which is a real gap, not
  // something faked here.
  useEffect(() => {
    if (!user || !pair) return;
    const q = query(
      collection(db, "pairs"),
      where("userIds", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      const others = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Pair)
        .filter((p) => p.id !== pair.id && (p.status === "declined" || p.status === "expired" || p.status === "cancelled"));
      setPastInvites(others);
    });
    return unsub;
  }, [user, pair]);

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
      <Shell>
        <p className="text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
      </Shell>
    );
  }

  if (pair.status === "declined") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Invitation déclinée
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          {pair.partnerName} n&apos;a pas souhaité être lié(e). Vous pouvez inviter quelqu&apos;un d&apos;autre.
        </p>
        <button
          onClick={() => router.push("/setup")}
          className="mt-6 w-full rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Nouvelle invitation
        </button>
        <button onClick={handleSignOut} className="mt-4 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Se déconnecter
        </button>
        <InvitationHistory items={pastInvites} />
      </Shell>
    );
  }

  if (pair.status === "cancelled") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Invitation annulée
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Cette invitation a été remplacée par une plus récente. Vous pouvez en envoyer une nouvelle.
        </p>
        <button
          onClick={() => router.push("/setup")}
          className="mt-6 w-full rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Nouvelle invitation
        </button>
        <button onClick={handleSignOut} className="mt-4 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Se déconnecter
        </button>
        <InvitationHistory items={pastInvites} />
      </Shell>
    );
  }

  if (pair.status === "expired") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Invitation expirée
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          {pair.partnerName} n&apos;a pas répondu à temps. Vous pouvez réessayer.
        </p>
        <button
          onClick={() => router.push("/setup")}
          className="mt-6 w-full rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Nouvelle invitation
        </button>
        <button onClick={handleSignOut} className="mt-4 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Se déconnecter
        </button>
        <InvitationHistory items={pastInvites} />
      </Shell>
    );
  }

  // status === "pending"
  return (
    <Shell>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>En attente</h1>
      <p className="mt-3 text-sm" style={{ color: MUTED }}>
        {pair.partnerName} n&apos;a pas encore rejoint Ittsui. Cette page se met à jour automatiquement dès que
        c&apos;est fait.
      </p>
      <DeliveryStatus pair={pair} />
      {cancelError && (
        <p className="mt-4 text-sm" style={{ color: ACCENT }}>
          {cancelError}
        </p>
      )}
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="mt-8 w-full rounded-full border py-3 text-sm font-medium disabled:opacity-50"
        style={{ borderColor: BORDER, color: INK }}
      >
        {cancelling ? "Annulation..." : "Annuler l'invitation"}
      </button>
      <button onClick={handleSignOut} className="mt-4 text-xs underline underline-offset-4" style={{ color: MUTED }}>
        Se déconnecter
      </button>
      <InvitationHistory items={pastInvites} />
    </Shell>
  );
}

const HISTORY_LABELS: Record<string, string> = {
  declined: "Déclinée",
  expired: "Expirée",
  cancelled: "Annulée",
};

function InvitationHistory({ items }: { items: Pair[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-10 border-t pt-6 text-left" style={{ borderColor: BORDER }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
        Invitations précédentes
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm" style={{ color: MUTED }}>
            <span>{p.partnerName}</span>
            <span className="text-xs" style={{ color: `${MUTED}99` }}>
              {HISTORY_LABELS[p.status] ?? p.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
