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
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Pair } from "@/lib/types";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { CockpitStatus } from "@/app/components/CockpitStatus";
import { mostRecentByCreatedAt } from "@/lib/sort";
import { SlowLoadFallback } from "@/app/components/SlowLoadFallback";
import { shareLink } from "@/lib/shareLink";
import { whatsappLinkForNumber, smsLinkForNumber } from "@/lib/phoneShareLinks";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
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

// A phone-only invite has no server-side delivery at all — the whole
// point of this screen for that case is giving the inviter another
// chance to actually send the link, not just watch DeliveryStatus render
// nothing (its own guard above already stays silent when there's no email
// to report on, which is correct for THAT component, but leaves a real
// gap here without something to replace it). Shown whenever a phone
// number exists, EVEN alongside an email — same fix + rationale as
// RequestFormClient.tsx and SetupClient.tsx: email delivery isn't
// instant, and a live test found this exact case (both email and phone
// given) silently dropped the WhatsApp/SMS option everywhere it appeared.
// "notre moment de la semaine" was accurate for every pair before
// Pair.cadence existed — same fix as SetupClient.tsx's identical phrase.
const CADENCE_MOMENT_PHRASE: Record<NonNullable<Pair["cadence"]>, string> = {
  weekly: "notre moment de la semaine",
  monthly: "notre moment du mois",
  yearly: "notre moment de l'année",
};

function SharePhoneInvite({ pair }: { pair: Pair }) {
  if (!pair.invitedPhone) return null;
  // Short form (/m/p/... redirects to /invite/... — see next.config.js).
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/m/p/${pair.id}`;
  const text = `${pair.partnerName}, je t'ai préparé ${CADENCE_MOMENT_PHRASE[pair.cadence ?? "weekly"]} sur Ittsui : ${inviteUrl}`;
  const whatsappHref = whatsappLinkForNumber(pair.invitedPhone, text);
  const smsHref = smsLinkForNumber(pair.invitedPhone, text);

  async function handleOtherApp() {
    await shareLink({ title: "Ittsui", text, url: inviteUrl });
  }

  return (
    <div className="mt-4 space-y-2 text-left">
      <p className="text-xs" style={{ color: MUTED }}>
        {pair.invitedEmail
          ? "Pour que ça aille plus vite, vous pouvez aussi lui envoyer le lien tout de suite :"
          : "Cette invitation n'a pas d'e-mail — envoyez-lui le lien vous-même si ce n'est pas déjà fait."}
      </p>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          Envoyer par WhatsApp
        </a>
      )}
      {smsHref && (
        <a
          href={smsHref}
          className="flex w-full items-center justify-center rounded-full border py-3 text-sm font-medium"
          style={{ borderColor: BORDER, color: INK }}
        >
          Envoyer par SMS
        </a>
      )}
      {/* Snapchat named explicitly — see /request/new's identical comment:
          90% of French Gen Z uses it, but its deep links are username- not
          phone-number-based, so it's reachable here (native share -> pick
          Snapchat) rather than via its own dedicated button. */}
      <button
        type="button"
        onClick={handleOtherApp}
        className="w-full rounded-full border py-2.5 text-sm font-medium"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        Snapchat, Messenger, ou une autre appli...
      </button>
    </div>
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

  // Not signed in — this page previously had no redirect at all for this
  // case, meaning it would show the loading spinner forever rather than
  // send someone anywhere. Genuinely found while adding the timeout
  // fallback below, not something already handled elsewhere in this file.
  useEffect(() => {
    if (user === false) {
      router.push("/setup");
    }
  }, [user, router]);

  // 3-second escape hatch — same pattern as /invite, /dashboard, /setup.
  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (user !== null && checked) return;
    const timer = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(timer);
  }, [user, checked]);

  // array-contains + orderBy on a different field is a composite query
  // Firestore needs an index for, which this project doesn't have —
  // sorted client-side instead (see lib/sort.ts), same fix as
  // DashboardClient.tsx's identical query shape.
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pair);
        const p = mostRecentByCreatedAt(docs);
        if (!p) {
          router.push("/setup");
          return;
        }
        setPair(p);
        setChecked(true);
        if (p.status === "active") router.push("/dashboard");
      },
      () => {
        // Resolve rather than hang on a real Firestore error — send back
        // to /setup, the same as "no pair found at all".
        router.push("/setup");
      }
    );
    return unsub;
  }, [user, router]);

  // Read-only history: past invitations this user sent that are no longer
  // live (declined/expired/cancelled), so "invitation déjà envoyée" isn't
  // a dead end with no way to see what you already tried. Doesn't include
  // received invitations — those aren't queryable client-side today (an
  // invitee isn't in userIds, and thus can't read the pending pair doc,
  // until they accept via the emailed link), which is a real gap, not
  // something faked here. Same composite-index avoidance as above — sorts
  // and caps client-side instead of orderBy()+limit(10) in the query.
  useEffect(() => {
    if (!user || !pair) return;
    const q = query(collection(db, "pairs"), where("userIds", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const others = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Pair)
        .filter((p) => p.id !== pair.id && (p.status === "declined" || p.status === "expired" || p.status === "cancelled"))
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
        .slice(0, 10);
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

  // Not signed in — the redirect effect above handles navigation
  if (user === false) {
    return null;
  }

  if (user === null || !checked || !pair) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
        <SlowLoadFallback show={slowLoad} />
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
      <div className="mt-4 flex justify-center">
        <CockpitStatus pair={pair} />
      </div>
      <DeliveryStatus pair={pair} />
      <SharePhoneInvite pair={pair} />
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
