// /app/components/SignInGate.tsx
// Sign in first, before using the app (Samuel, 2026-10-22: every user's
// email from the start). Shown by the screens a signed-out visitor can
// reach directly (/request/new, /triage), with the same two methods as
// /setup: Google, or a passkey made earlier. The first sign-in starts the
// 14-day Plus trial (lib/firebase.ts calls /api/plan). Recipient pages
// (/request/[id], /invite/[id]) stay open: a guest needs no account.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { signInWithGoogle } from "@/lib/firebase";
import { signInWithPasskey } from "@/lib/passkeyClient";
import { ACCENT, BORDER, INK, MUTED } from "@/lib/theme";
import { pagePath } from "@/lib/i18n";
import { useLang, useT } from "@/app/components/site/LangProvider";
import { localeTypography } from "@/app/components/site/typography";
import { PLAN } from "./plan.i18n";

// Same configuration as the other app screens, so the font files are shared.
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

/** `before` runs right before Google's popup opens (e.g. to save a draft). */
export function SignInGate({ before }: { before?: () => void }) {
  const { lang } = useLang();
  const t = useT(PLAN);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    // A second tap while the popup is open cancels and reopens it.
    if (signingIn) return;
    setError(null);
    before?.();
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Échec de la connexion."));
    } finally {
      setSigningIn(false);
    }
  }

  async function passkey() {
    setError(null);
    before?.();
    const result = await signInWithPasskey();
    if (!result.ok) setError(t(result.error));
  }

  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <div className="mx-auto max-w-md px-6 py-14 text-center">
        <Link href={pagePath("home", lang)} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
          Ittsui
        </Link>
        <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          {t("Bienvenue sur Ittsui")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          {t("Connectez-vous pour commencer : 14 jours de Plus offerts, sans carte bancaire.")}
        </p>
        {error && (
          <p className="mt-4 text-sm" style={{ color: ACCENT }}>
            {error}
          </p>
        )}
        <button
          onClick={google}
          disabled={signingIn}
          className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {signingIn ? t("Connexion...") : t("Se connecter avec Google")}
        </button>
        <button onClick={passkey} className="mt-3 w-full rounded-full border py-3.5 text-sm font-medium transition-colors" style={{ borderColor: BORDER, color: INK }}>
          {t("Se connecter avec une clé d'accès")}
        </button>
      </div>
    </main>
  );
}
