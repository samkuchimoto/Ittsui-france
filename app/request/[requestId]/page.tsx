"use client";
// /app/request/[requestId]/page.tsx
// What the recipient lands on from the meeting-request email. Mirrors
// /app/invite/[pairId]/page.tsx's exact pattern: a public preview shell
// (no auth required to view venue/date/time), Google sign-in only once
// "J'accepte" is tapped, then /api/meeting-requests/respond checks the
// logged-in email matches the invited email and accepts. Decline never
// requires login (GDPR: an opt-out shouldn't cost someone an account).

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import { signInWithGoogle, watchAuthState } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { DiscoveryTileButton } from "@/app/components/DiscoveryGrid";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import type { VenueType } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

const VENUE_TYPE_LABEL: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  park: "Parc",
  museum: "Musée",
  home: "Chez vous",
};

interface AcceptedDetails {
  venueName: string;
  venueAddress: string;
  venueType: VenueType | null;
  date: string;
  time: string;
}

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

type Status = "checking" | "ready" | "declining" | "declined" | "accepting" | "accepted" | "error";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`} style={{ color: INK }}>
      <div className="mx-auto max-w-md px-6 py-14 text-center">{children}</div>
    </main>
  );
}

export default function RequestResponsePage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();

  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<User | false | null>(null);
  const [slowConnection, setSlowConnection] = useState(false);
  const [accepted, setAccepted] = useState<AcceptedDetails | null>(null);

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
    return unsub;
  }, []);

  useEffect(() => {
    if (user !== null) return;
    const timer = setTimeout(() => setSlowConnection(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  // Auto-accept as soon as a signed-in user is known — mirrors
  // /invite/[pairId]/page.tsx exactly, and deliberately doesn't gate on
  // "did the person just tap the button": on mobile web, signInWithGoogle()
  // does a full-page signInWithRedirect (see lib/firebase.ts), which wipes
  // all React state on the way back — a click-tracking flag here would
  // reset to false on that return and this would never fire, leaving the
  // page stuck on its loading state forever. The /api/meeting-requests/respond
  // email check already guards against activating for the wrong account.
  useEffect(() => {
    if (user === null) return;
    if (user) {
      accept(user);
    } else {
      setStatus("ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function accept(u: User) {
    setStatus("accepting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meeting-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: params.requestId, userId: u.uid, userEmail: u.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setAccepted({
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        venueType: data.venueType ?? null,
        date: data.date,
        time: data.time,
      });
      setStatus("accepted");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  async function handleDecline() {
    setStatus("declining");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meeting-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: params.requestId, decline: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setStatus("declined");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  async function handleAcceptTap() {
    setErrorMsg(null);
    if (user) {
      accept(user);
      return;
    }
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Échec de la connexion.");
    }
  }

  if (status === "checking" || status === "accepting") {
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

  if (status === "accepted") {
    return (
      <Shell>
        {accepted?.venueType && (
          <div className="mx-auto mb-5 h-32 w-32 overflow-hidden rounded-2xl">
            <DiscoveryTileButton
              tile={{ value: accepted.venueType, label: VENUE_TYPE_LABEL[accepted.venueType] ?? "" }}
              active={false}
              onClick={() => {}}
            />
          </div>
        )}
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Rendez-vous confirmé
        </h1>
        {accepted && (
          <p className="mt-2 text-sm font-medium">
            {accepted.venueName} · {accepted.date} à {accepted.time}
          </p>
        )}
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Vous recevrez un e-mail de confirmation. L&apos;autre personne a été notifiée.
        </p>
        {accepted && (
          <a
            href={googleCalendarLink({
              title: `${accepted.venueName} — Ittsui`,
              details: "Rendez-vous confirmé via Ittsui.",
              venueAddress: accepted.venueAddress,
              date: accepted.date,
              time: accepted.time,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-sm underline underline-offset-4"
            style={{ color: ACCENT }}
          >
            Ajouter à Google Agenda
          </a>
        )}
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 w-full rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Aller au tableau de bord
        </button>
      </Shell>
    );
  }

  if (status === "declined") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          Demande déclinée
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Aucune donnée n&apos;a été conservée. Rien d&apos;autre à faire.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>Ittsui</span>
      <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
        Vous avez reçu une demande de rendez-vous
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-sm" style={{ color: MUTED }}>
        Un seul geste pour confirmer : connectez-vous avec le même e-mail que celui qui a reçu cette demande, ça
        suffit à l&apos;accepter.
      </p>
      {errorMsg && (
        <p className="mt-4 text-sm" style={{ color: ACCENT }}>
          {errorMsg}
          {errorMsg.includes("ne correspond pas") &&
            " Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu la demande."}
        </p>
      )}
      <button
        onClick={handleAcceptTap}
        className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
        style={{ backgroundColor: ACCENT }}
      >
        {errorMsg ? "Se connecter avec un autre compte" : "J'accepte"}
      </button>
      {!errorMsg && (
        <>
          <p className="mt-3 text-xs" style={{ color: MUTED }}>
            Via Google, juste pour vérifier que c&apos;est bien vous.
          </p>
          <button
            onClick={handleDecline}
            className="mt-4 w-full rounded-full border py-3 text-sm font-medium"
            style={{ borderColor: BORDER, color: INK }}
          >
            Décliner
          </button>
        </>
      )}
    </Shell>
  );
}
