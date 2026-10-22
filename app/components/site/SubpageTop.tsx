// /app/components/site/SubpageTop.tsx
// The row at the top of every public sub-page: back to the homepage in
// the same language on the left, the language switch on the right.

import Link from "next/link";
import { MUTED } from "@/lib/theme";
import { pagePath, type Locale, type PublicPage } from "@/lib/i18n";
import { LangSwitch } from "@/app/components/site/LangSwitch";

const BACK: Record<Locale, string> = { fr: "← Retour", en: "← Back", ja: "← 戻る", es: "← Volver", he: "→ חזרה" };

export function SubpageTop({ page, lang, className = "" }: { page: PublicPage; lang: Locale; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <Link href={pagePath("home", lang)} className="text-sm" style={{ color: MUTED }}>
        {BACK[lang]}
      </Link>
      <LangSwitch page={page} lang={lang} color={MUTED} />
    </div>
  );
}
