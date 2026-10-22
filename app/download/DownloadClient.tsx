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
import { withLang, type Locale } from "@/lib/i18n";

type Platform = "android" | "ios" | "desktop";

const COPY: Record<
  Locale,
  {
    desktop: string;
    googlePlay: string;
    androidSoon: string;
    apk: string;
    appStore: string;
    iosSoon: string;
    apkNote: string;
    playProtect: string;
    web: string;
  }
> = {
  fr: {
    desktop:
      "Pour une expérience optimale, utilisez Ittsui sur votre téléphone. Scannez le code ci-dessous, ou choisissez votre plateforme :",
    googlePlay: "Télécharger sur Google Play",
    androidSoon: "Android — bientôt disponible",
    apk: "Télécharger l'APK directement (version de test)",
    appStore: "Disponible sur l'App Store",
    iosSoon: "iPhone — bientôt disponible",
    apkNote:
      "L'APK direct est une installation manuelle, en dehors du Google Play Store — Android demandera d'autoriser « sources inconnues » pour ce fichier. Une fois publiée sur le Play Store, cette option disparaîtra au profit du bouton ci-dessus.",
    playProtect:
      "Google Play Protect peut afficher « Application bloquée » sans option pour continuer — normal pour toute app installée hors Play Store avant que Google ne la reconnaisse. Dans l'app Play Store : icône de profil (en haut à droite) → Play Protect → Paramètres → désactivez « Analyser les applications avec Play Protect », installez, puis réactivez si vous le souhaitez.",
    web: "Continuer sur le web →",
  },
  en: {
    desktop: "Ittsui works best on your phone. Scan the code below, or pick your platform:",
    googlePlay: "Get it on Google Play",
    androidSoon: "Android: coming soon",
    apk: "Download the APK directly (test version)",
    appStore: "Download on the App Store",
    iosSoon: "iPhone: coming soon",
    apkNote:
      "The direct APK is a manual install, outside the Google Play Store: Android will ask you to allow “unknown sources” for this file. Once the app is published on the Play Store, this option will give way to the button above.",
    playProtect:
      "Google Play Protect may show “App blocked” with no way to continue. That's normal for any app installed outside the Play Store before Google recognises it. In the Play Store app: profile icon (top right) → Play Protect → Settings → turn off “Scan apps with Play Protect”, install, then turn it back on if you like.",
    web: "Continue on the web →",
  },
  ja: {
    desktop: "Ittsuiはスマートフォンでのご利用がおすすめです。下のコードを読み取るか、お使いの端末を選んでください。",
    googlePlay: "Google Playでダウンロード",
    androidSoon: "Android版：近日公開",
    apk: "APKを直接ダウンロード（テスト版）",
    appStore: "App Storeでダウンロード",
    iosSoon: "iPhone版：近日公開",
    apkNote:
      "APKの直接インストールは、Google Playストアを通さない手動インストールです。Androidから、このファイルについて「提供元不明のアプリ」の許可を求められます。Playストアで公開されたあとは、この方法は上のボタンに置き換わります。",
    playProtect:
      "Google Playプロテクトが「アプリがブロックされました」と表示し、先に進めないことがあります。Googleに認識される前のPlayストア外のアプリでは普通のことです。Playストアアプリで、プロフィールアイコン（右上）→ Playプロテクト → 設定 →「Playプロテクトでアプリをスキャン」をオフにしてインストールし、必要ならあとでオンに戻してください。",
    web: "Webで続ける →",
  },
  es: {
    desktop: "Ittsui funciona mejor en tu teléfono. Escanea el código o elige tu plataforma:",
    googlePlay: "Disponible en Google Play",
    androidSoon: "Android: muy pronto",
    apk: "Descargar el APK directamente (versión de prueba)",
    appStore: "Descargar en el App Store",
    iosSoon: "iPhone: muy pronto",
    apkNote:
      "El APK directo se instala a mano, fuera de Google Play: Android te pedirá permitir “orígenes desconocidos” para este archivo. Cuando la app esté publicada en Google Play, esta opción dejará su lugar al botón de arriba.",
    playProtect:
      "Google Play Protect puede mostrar “App bloqueada” sin opción para continuar. Es normal con cualquier app instalada fuera de Google Play antes de que Google la reconozca. En la app de Play Store: ícono de perfil (arriba a la derecha) → Play Protect → Configuración → desactiva “Analizar apps con Play Protect”, instala y vuelve a activarlo si quieres.",
    web: "Seguir en la web →",
  },
  he: {
    desktop: "Ittsui עובדת הכי טוב בטלפון. סרקו את הקוד או בחרו את הפלטפורמה שלכם:",
    googlePlay: "להורדה ב-Google Play",
    androidSoon: "אנדרואיד: בקרוב",
    apk: "הורדת קובץ ה-APK ישירות (גרסת ניסיון)",
    appStore: "להורדה ב-App Store",
    iosSoon: "אייפון: בקרוב",
    apkNote:
      "קובץ ה-APK הישיר מותקן ידנית, מחוץ ל-Google Play: אנדרואיד יבקש לאשר ״מקורות לא ידועים״ עבור הקובץ. כשהאפליקציה תפורסם ב-Google Play, האפשרות הזו תפנה את מקומה לכפתור שלמעלה.",
    playProtect:
      "Google Play Protect עשוי להציג ״האפליקציה נחסמה״ בלי אפשרות להמשיך. זה רגיל לכל אפליקציה שמותקנת מחוץ ל-Google Play לפני ש-Google מזהה אותה. באפליקציית Play Store: סמל הפרופיל ← Play Protect ← הגדרות ← כבו את ״סריקת אפליקציות עם Play Protect״, התקינו, ואז הפעילו שוב אם תרצו.",
    web: "להמשיך באתר ←",
  },
};

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

export default function DownloadClient({ qrSvg, lang = "fr" }: { qrSvg: string; lang?: Locale }) {
  const t = COPY[lang];
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
            {t.desktop}
          </p>
          <div className="w-40" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        {showAndroid &&
          (ANDROID_STORE_URL ? (
            <PrimaryButton href={ANDROID_STORE_URL}>{t.googlePlay}</PrimaryButton>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ComingSoon>{t.androidSoon}</ComingSoon>
              <a href={ANDROID_APK_DIRECT_URL} className="text-xs underline underline-offset-4" style={{ color: MUTED }}>
                {t.apk}
              </a>
            </div>
          ))}

        {showIos &&
          (IOS_STORE_URL ? (
            <PrimaryButton href={IOS_STORE_URL}>{t.appStore}</PrimaryButton>
          ) : (
            <ComingSoon>{t.iosSoon}</ComingSoon>
          ))}
      </div>

      {!ANDROID_STORE_URL && showAndroid && (
        <p className="max-w-md text-center text-xs leading-relaxed" style={{ color: MUTED }}>
          {t.apkNote}
          <br />
          <br />
          {t.playProtect}
        </p>
      )}

      <Link href={withLang("/setup", lang)} className="text-sm underline underline-offset-4" style={{ color: INK }}>
        {t.web}
      </Link>
    </div>
  );
}
