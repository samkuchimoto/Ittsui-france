"use client";
// /app/invite/[pairId]/page.tsx
// What the partner lands on from the invite email. Two paths:
// - ?decline=1 in the URL -> declines without requiring login (GDPR: an
//   opt-out shouldn't cost the person an account creation).
// - otherwise -> Google sign-in, then /api/activate-pending-pair checks the
//   logged-in email matches the invited email and activates the pair.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { signInWithGoogle, watchAuthState } from "@/lib/firebase";
import type { User } from "firebase/auth";

type Status = "checking" | "ready" | "declining" | "declined" | "activating" | "error";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ pairId: string }>();
  const searchParams = useSearchParams();
  const isDecline = searchParams.get("decline") === "1";

  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<User | false | null>(null);
  const [slowConnection, setSlowConnection] = useState(false);

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
    return unsub;
  }, []);

  // The initial auth check can hang indefinitely on a network that blocks
  // or intercepts Google's sign-in traffic (seen on some public/institutional
  // wifi) — an infinite spinner gives no way out. Bounded wait, then a
  // visible retry instead of silence.
  useEffect(() => {
    if (user !== null) return; // already resolved, no need for the timer
    const timer = setTimeout(() => setSlowConnection(true), 8000);
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
      router.push("/dashboard");
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
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Échec de la connexion.");
    }
  }

  if (status === "checking" || status === "activating") {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">Chargement…</p>
        {slowConnection && status === "checking" && (
          <div className="mt-6">
            <p className="text-sm text-neutral-600">
              Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut
              qu'il bloque la connexion à Google — essayez avec les données mobiles.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
            >
              Réessayer
            </button>
          </div>
        )}
      </main>
    );
  }

  if (status === "declined") {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Invitation déclinée</h1>
        <p className="mt-3 text-sm text-neutral-600">Aucune donnée n'a été conservée. Rien d'autre à faire.</p>
      </main>
    );
  }

  if (isDecline) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Décliner l'invitation ?</h1>
        <p className="mt-3 text-sm text-neutral-600">Vous ne serez pas lié(e) et vos informations seront supprimées.</p>
        {errorMsg && <p className="mt-4 text-sm text-red-600">{errorMsg}</p>}
        <button
          onClick={handleDecline}
          className="mt-6 w-full rounded-lg border border-neutral-300 py-3 text-sm font-medium text-neutral-700"
        >
          Décliner
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Vous avez été invité(e) sur Ittsui</h1>
      <p className="mt-3 text-sm text-neutral-600">
        Connectez-vous avec le même e-mail que celui qui a reçu cette invitation pour activer le lien.
      </p>
      {errorMsg && (
        <p className="mt-4 text-sm text-red-600">
          {errorMsg}
          {errorMsg.includes("ne correspond pas") &&
            " Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu l'invitation."}
        </p>
      )}
      <button
        onClick={handleSignIn}
        className="mt-6 w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white"
      >
        {errorMsg ? "Se connecter avec un autre compte" : "Se connecter avec Google"}
      </button>
    </main>
  );
}
