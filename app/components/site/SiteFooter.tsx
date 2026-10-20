// /app/components/site/SiteFooter.tsx
// The footer of the public pages, in each language. Pages that exist only
// in French (the partner directory, the legal notice) are marked as such
// in the other languages rather than silently dropping the reader into
// French.

import Link from "next/link";
import { MUTED } from "@/lib/theme";
import { pagePath, type Locale, type PublicPage } from "@/lib/i18n";
import { LangSwitch } from "@/app/components/site/LangSwitch";

const COPY: Record<
  Locale,
  { line: string; about: string; partners: string; privacy: string; terms: string; legal: string }
> = {
  fr: {
    line: "© 2026 Ittsui France. Conçu avec retenue.",
    about: "À propos",
    partners: "Partenaires",
    privacy: "Confidentialité",
    terms: "Conditions d'utilisation",
    legal: "Mentions légales",
  },
  en: {
    line: "© 2026 Ittsui France. Designed with restraint.",
    about: "About",
    partners: "Partners (in French)",
    privacy: "Privacy",
    terms: "Terms of use",
    legal: "Legal notice (in French)",
  },
  ja: {
    line: "© 2026 Ittsui France. 控えめに、丁寧につくっています。",
    about: "Ittsuiについて",
    partners: "パートナー（フランス語）",
    privacy: "プライバシー",
    terms: "利用規約",
    legal: "法的表示（フランス語）",
  },
};

export function SiteFooter({ page, lang, links = "full" }: { page: PublicPage; lang: Locale; links?: "full" | "legal" }) {
  const t = COPY[lang];
  return (
    <footer className="flex flex-col items-center gap-2 px-6 pb-10 text-center text-sm" style={{ color: `${MUTED}99` }}>
      <span>{t.line}</span>
      <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {links === "full" && (
          <>
            <Link href={pagePath("about", lang)} className="underline underline-offset-4">
              {t.about}
            </Link>
            <Link href="/partenaires" hrefLang="fr" className="underline underline-offset-4">
              {t.partners}
            </Link>
          </>
        )}
        <Link href={pagePath("privacy", lang)} className="underline underline-offset-4">
          {t.privacy}
        </Link>
        {links === "full" && (
          <Link href={pagePath("terms", lang)} className="underline underline-offset-4">
            {t.terms}
          </Link>
        )}
        <Link href="/mentions-legales" hrefLang="fr" className="underline underline-offset-4">
          {t.legal}
        </Link>
      </span>
      <LangSwitch page={page} lang={lang} color={MUTED} className="mt-2" />
    </footer>
  );
}
