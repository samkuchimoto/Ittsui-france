"use client";
// /app/invite/[pairId]/page.tsx
// What the partner lands on from the invite email. Two paths:
// - ?decline=1 in the URL -> declines without requiring login (GDPR: an
//   opt-out shouldn't cost the person an account creation).
// - otherwise -> a public preview shell (no auth required to view), then
//   Google sign-in only once "Je viens" is tapped, then
//   /api/activate-pending-pair checks the logged-in email matches the
//   invited email and activates the pair.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { signInWithGoogle, watchAuthState } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { dayLabel } from "@/lib/dayLabel";
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

type Status = "checking" | "ready" | "declining" | "declined" | "activating" | "activated" | "error";

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

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ pairId: string }>();
  const searchParams = useSearchParams();
  const isDecline = searchParams.get("decline") === "1";

  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<User | false | null>(null);
  const [slowConnection, setSlowConnection] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [activated, setActivated] = useState<{ partnerName: string | null; agreedDay: string; agreedWindowStart: string } | null>(
    null
  );

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
    return unsub;
  }, []);

  // Cockpit stage 2 ("Reçu") — fired independently of auth resolving, so
  // it's recorded the instant the link is opened, not only once someone
  // decides to sign in. Best-effort: never blocks or shows an error if it
  // fails, this is a status ping, not something the page's own flow
  // depends on.
  useEffect(() => {
    if (!params.pairId) return;
    fetch("/api/mark-invite-opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairId: params.pairId }),
    }).catch(() => {});
  }, [params.pairId]);

  // The initial auth check can hang indefinitely on a network that blocks
  // or intercepts Google's sign-in traffic (seen on some public/institutional
  // wifi) — an infinite spinner gives no way out. Bounded wait, then a
  // visible retry instead of silence.
  useEffect(() => {
    if (user !== null) return; // already resolved, no need for the timer
    const timer = setTimeout(() => setSlowConnection(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (user === null) return; // still checking auth
    if (isDecline) {
      setStatus("ready");
      return;
    }
    if (user) {
      activate(user);
    } else {
      setStatus("ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDecline]);

  async function activate(u: User) {
    setStatus("activating");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/activate-pending-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: params.pairId, userId: u.uid, userEmail: u.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setActivated({ partnerName: data.partnerName ?? null, agreedDay: data.agreedDay, agreedWindowStart: data.agreedWindowStart });
      setStatus("activated");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  async function handleDecline() {
    setStatus("declining");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/activate-pending-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: params.pairId, decline: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setStatus("declined");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  async function handleSignIn() {
    if (signingIn) return; // a second tap while the popup is open cancels and
    // reopens it, which looks like the account chooser inexplicably
    // reappearing (confirmed via real testing 2026-08-25)
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Échec de la connexion.");
    } finally {
      setSigningIn(false);
    }
  }

  if (status === "checking" || status === "activating") {
    return (
      <Shell>
        <p className="text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
        {slowConnection && status === "checking" && (
          <div className="mt-6">
            <p className="text-sm" style={{ color: MUTED }}>
              Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut
              qu&apos;il bloque la connexion à Google — essayez avec les données mobiles.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full border px-4 py-2 text-sm font-medium"
              style={{ borderColor: BORDER, color: INK }}
            >
              Réessayer
            </button>
          </div>
        )}
      </Shell>
    );
  }

  if (status === "activated" && activated) {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Vous êtes lié(e) à {activated.partnerName ?? "cette personne"}
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Rendez-vous chaque {dayLabel(activated.agreedDay)}, vers {activated.agreedWindowStart}
          . La première proposition arrive automatiquement, sans rien à faire d&apos;ici là.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 w-full rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Aller au tableau de bord
        </button>
        {/* Same reasoning as /request/[requestId]'s post-accept nudge:
            this person has just felt Ittsui's value from the receiving
            side (arguably more so here — a standing weekly bond, not a
            one-off) — the natural next step is trying the inviting side
            themselves, not a cold ask. */}
        <Link href="/setup" className="mt-4 block text-sm underline underline-offset-4" style={{ color: MUTED }}>
          Faire pareil avec quelqu&apos;un d&apos;autre
        </Link>
      </Shell>
    );
  }

  if (status === "declined") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Invitation déclinée
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Aucune donnée n&apos;a été conservée. Rien d&apos;autre à faire.
        </p>
      </Shell>
    );
  }

  if (isDecline) {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Décliner l&apos;invitation ?
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Vous ne serez pas lié(e) et vos informations seront supprimées.
        </p>
        {errorMsg && (
          <p className="mt-4 text-sm" style={{ color: ACCENT }}>
            {errorMsg}
          </p>
        )}
        <button
          onClick={handleDecline}
          className="mt-6 w-full rounded-full border py-3 text-sm font-medium"
          style={{ borderColor: BORDER, color: INK }}
        >
          Décliner
        </button>
      </Shell>
    );
  }

  // Public preview shell — visible with no auth required. Sign-in is only
  // triggered by the "Je viens" tap below, not by landing on this page.
  return (
    <Shell>
      <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
        Ittsui
      </Link>
      <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
        Vous avez été invité(e) sur Ittsui
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-sm" style={{ color: MUTED }}>
        Pas une appli de rencontre : un rendez-vous protégé, une fois par semaine, avec la personne qui vous a
        envoyé ce lien — une proposition, validable en un geste, sans agenda à gérer.
      </p>
      {/* Same fix as /request/[requestId]/page.tsx: doesn't assume an
          email exists to match against — a phone-only invite is accepted
          by any signed-in account (see /api/activate-pending-pair's
          invitedEmail-optional check), so "same e-mail" would be wrong and
          confusing here. The errorMsg branch below already gives the
          email-specific guidance, correctly, only when a real mismatch
          actually happens. */}
      <p className="mt-3 text-sm" style={{ color: MUTED }}>
        Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à activer le lien.
      </p>
      {errorMsg && (
        <p className="mt-4 text-sm" style={{ color: ACCENT }}>
          {errorMsg}
          {errorMsg.includes("ne correspond pas") &&
            " Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu l'invitation."}
        </p>
      )}
      <button
        onClick={handleSignIn}
        disabled={signingIn}
        className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
        style={{ backgroundColor: ACCENT }}
      >
        {signingIn ? "Connexion..." : errorMsg ? "Se connecter avec un autre compte" : "Je viens"}
      </button>
      {!errorMsg && (
        <p className="mt-3 text-xs" style={{ color: MUTED }}>
          Via Google, juste pour vérifier que c&apos;est bien vous.
        </p>
      )}
    </Shell>
  );
}
