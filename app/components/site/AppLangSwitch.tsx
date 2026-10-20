"use client";
// /app/components/site/AppLangSwitch.tsx
// FR | EN | 日本語 inside the app, where the language lives in the
// ittsui_lang cookie rather than the URL: a tap re-renders the screen in
// place (LangProvider.setLang) instead of navigating anywhere.

import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n";
import { MUTED } from "@/lib/theme";
import { useLang } from "@/app/components/site/LangProvider";

const NAV_LABEL: Record<Locale, string> = { fr: "Langue", en: "Language", ja: "言語" };

export function AppLangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <nav aria-label={NAV_LABEL[lang]} className={`flex items-center gap-1.5 text-xs ${className}`} style={{ color: MUTED }}>
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden="true" style={{ opacity: 0.45 }}>
              |
            </span>
          )}
          {l === lang ? (
            <span aria-current="true" className="font-semibold">
              {LOCALE_LABEL[l]}
            </span>
          ) : (
            <button type="button" lang={l} onClick={() => setLang(l)} className="underline-offset-4 hover:underline">
              {LOCALE_LABEL[l]}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
