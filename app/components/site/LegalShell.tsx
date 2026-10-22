// /app/components/site/LegalShell.tsx
// The frame shared by the privacy, terms and account-deletion pages in
// each language: back link and language switch, title, intro, and — in
// English and Japanese — the note that the French text is the one that
// applies (these are translations for the reader's convenience). Spanish
// and Hebrew readers get the English text (legalLang), marked as such and
// kept left-to-right inside the Hebrew page.

import { fraunces, workSans } from "@/app/fonts";
import { INK, MUTED, BORDER } from "@/lib/theme";
import type { Locale, PublicPage } from "@/lib/i18n";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { SubpageTop } from "@/app/components/site/SubpageTop";
import { localeTypography } from "@/app/components/site/typography";

const TRANSLATION_NOTE: Record<Locale, string | null> = {
  fr: null,
  en: "This English version is provided for convenience. If it differs from the French version, the French version applies.",
  ja: "この日本語版は参考のための翻訳です。フランス語版と内容が異なる場合は、フランス語版が優先されます。",
  es: "Esta página aún no está traducida al español: se muestra en inglés. Si difiere de la versión en francés, prevalece la versión en francés.",
  he: "הדף הזה עדיין לא תורגם לעברית ומוצג באנגלית. אם יש הבדל בינו לבין הגרסה הצרפתית, הגרסה הצרפתית קובעת.",
};

/** The language a legal page's text is in: not translated into Spanish or Hebrew yet, so English there. */
export function legalLang(lang: Locale): "fr" | "en" | "ja" {
  return lang === "es" || lang === "he" ? "en" : lang;
}

export function LegalShell({
  page,
  lang,
  title,
  intro,
  children,
}: {
  page: PublicPage;
  lang: Locale;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  const note = TRANSLATION_NOTE[lang];
  const inEnglish = legalLang(lang) !== lang;
  const english = inEnglish ? ({ lang: "en", dir: "ltr" } as const) : {};
  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <DocumentLang lang={lang} />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <SubpageTop page={page} lang={lang} />

        <div {...english}>
          <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2rem" }}>
            {title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
            {intro}
          </p>
        </div>
        {note && (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
            {note}
          </p>
        )}

        <div {...english}>{children}</div>
      </div>
    </main>
  );
}

/** One section. The privacy page's sections are a single paragraph (`p`), the others hold lists. */
export function Item({ title, children, as: Body = "div" }: { title: string; children: React.ReactNode; as?: "p" | "div" }) {
  return (
    <div className="border-t py-6" style={{ borderColor: BORDER }}>
      <h2 className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {title}
      </h2>
      <Body className="mt-2 text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {children}
      </Body>
    </div>
  );
}
