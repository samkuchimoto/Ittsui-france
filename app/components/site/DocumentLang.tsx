"use client";
// /app/components/site/DocumentLang.tsx
// The root layout renders <html lang="fr"> for every page, and moving the
// whole app under per-language root layouts would mean relocating every
// route, auth flow included, for three marketing pages. Instead each
// translated page marks its own <main lang="…">, and this sets the
// document language to match while the page is shown, putting "fr" back
// when it unmounts so a client-side hop into the (French) app doesn't
// leave the document claiming to be English.

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export function DocumentLang({ lang }: { lang: Locale }) {
  useEffect(() => {
    if (lang === "fr") return;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = "fr";
    };
  }, [lang]);
  return null;
}
