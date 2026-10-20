"use client";
// /app/components/site/LangSwitch.tsx
// FR | EN | 日本語, linking to the same page in each language. Clicking a
// language also remembers it (the ittsui_lang cookie), so the app and the
// next visit to "/" follow the choice — see middleware.ts.

import Link from "next/link";
import { LOCALES, LOCALE_LABEL, pagePath, type Locale, type PublicPage } from "@/lib/i18n";
import { rememberLang } from "@/app/components/site/LangProvider";

const NAV_LABEL: Record<Locale, string> = { fr: "Langue", en: "Language", ja: "言語" };

export function LangSwitch({
  page,
  lang,
  color,
  className = "",
  textClass = "text-xs",
}: {
  page: PublicPage;
  lang: Locale;
  /** Text colour: the header passes a light tone over the hero footage. */
  color: string;
  className?: string;
  /** Text size; the phone header uses a larger one, easier to tap. */
  textClass?: string;
}) {
  return (
    <nav aria-label={NAV_LABEL[lang]} className={`flex items-center gap-1.5 ${textClass} ${className}`} style={{ color }}>
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
            <Link
              href={pagePath(page, l)}
              hrefLang={l}
              lang={l}
              onClick={() => rememberLang(l)}
              className="underline-offset-4 hover:underline"
            >
              {LOCALE_LABEL[l]}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
