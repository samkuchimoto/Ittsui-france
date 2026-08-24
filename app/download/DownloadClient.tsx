"use client";

// /app/download/DownloadClient.tsx
// Platform detection is inherently client-only (navigator.userAgent), so
// this is the one part of /download that can't be a Server Component —
// everything else (QR code, footer, static copy) stays server-rendered in
// page.tsx. The page never forces an app install: "Continuer sur le web"
// is always present and always works today, regardless of platform or
// store status — see AGENTS.md's invitation-flow principle that nothing
// should ever require installing the app first.

import { useEffect, useState } from "react";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { ANDROID_STORE_URL, IOS_STORE_URL, ANDROID_APK_DIRECT_URL } from "@/lib/config/store";

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base text-white transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: ACCENT }}
    >
      {children}
    </a>
  );
}

function ComingSoon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex cursor-default items-center justify-center gap-2 rounded-full border px-8 py-4 text-base"
      style={{ borderColor: BORDER, color: MUTED }}
    >
      {children}
    </span>
  );
}

export default function DownloadClient({ qrSvg }: { qrSvg: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // Before the client detects a platform (first paint, or JS disabled), and
  // on desktop, show every option rather than guess — no layout-shifting
  // placeholder, and nobody is blocked from the info they came for. Only
  // hide a platform's CTA when the other mobile platform was confirmed.
  const showAndroid = platform !== "ios";
  const showIos = platform !== "android";
  const showDesktopHint = platform === "desktop";

  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      {showDesktopHint && (
        <>
          <p className="text-center text-[15px]" style={{ color: MUTED }}>
            Pour une expérience optimale, utilisez Ittsui sur votre téléphone. Scannez le code
            ci-dessous, ou choisissez votre plateforme :
          </p>
          <div className="w-40" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        {showAndroid &&
          (ANDROID_STORE_URL ? (
            <PrimaryButton href={ANDROID_STORE_URL}>Télécharger sur Google Play</PrimaryButton>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ComingSoon>Android — bientôt disponible</ComingSoon>
              <a href={ANDROID_APK_DIRECT_URL} className="text-xs underline underline-offset-4" style={{ color: MUTED }}>
                Télécharger l&apos;APK directement (version de test)
              </a>
            </div>
          ))}

        {showIos &&
          (IOS_STORE_URL ? (
            <PrimaryButton href={IOS_STORE_URL}>Disponible sur l&apos;App Store</PrimaryButton>
          ) : (
            <ComingSoon>iPhone — bientôt disponible</ComingSoon>
          ))}
      </div>

      {!ANDROID_STORE_URL && showAndroid && (
        <p className="max-w-md text-center text-xs leading-relaxed" style={{ color: MUTED }}>
          L&apos;APK direct est une installation manuelle, en dehors du Google Play Store — Android
          demandera d&apos;autoriser &laquo;&nbsp;sources inconnues&nbsp;&raquo; pour ce fichier. Une
          fois publiée sur le Play Store, cette option disparaîtra au profit du bouton
          ci-dessus.
          <br />
          <br />
          Google Play Protect peut afficher &laquo;&nbsp;Application bloquée&nbsp;&raquo; sans option
          pour continuer — normal pour toute app installée hors Play Store avant que Google ne la
          reconnaisse. Dans l&apos;app Play Store : icône de profil (en haut à droite) → Play Protect →
          Paramètres → désactivez &laquo;&nbsp;Analyser les applications avec Play Protect&nbsp;&raquo;,
          installez, puis réactivez si vous le souhaitez.
        </p>
      )}

      <Link href="/setup" className="text-sm underline underline-offset-4" style={{ color: INK }}>
        Continuer sur le web →
      </Link>
    </div>
  );
}
