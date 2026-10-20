// /lib/i18n.ts
// The public site in three languages: French at the root (every existing
// URL unchanged), English under /en, Japanese under /ja.
//
// Public pages (home, about, download, privacy, terms, account deletion)
// carry their language in the URL. The app (setup, dashboard, requests,
// invitations, triage) reads the ittsui_lang cookie instead, asks once
// when it isn't set, and writes what it sends to other people
// (invitations, requests, emails) in the sender's language.
//
// The legal notice (/mentions-legales) is a French-law document (LCEN)
// and stays French; the other languages link to it as such.

import type { Metadata } from "next";

export type Locale = "fr" | "en" | "ja";

export const LOCALES: Locale[] = ["fr", "en", "ja"];

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en" || value === "ja";
}

/** A stored or received language, French when there's none (older records). */
export function langOf(value: unknown): Locale {
  return isLocale(value) ? value : "fr";
}

/**
 * The language someone chose, remembered for a year. The public pages
 * carry their language in the URL; the app (setup, dashboard, requests,
 * invitations, triage) reads this cookie instead, and asks once when it
 * isn't set. middleware.ts also uses it to send a returning visitor from
 * "/" to /en or /ja.
 */
export const LANG_COOKIE = "ittsui_lang";

/**
 * An app link from an English or Japanese page: ?lang= tells middleware
 * to remember that language, so someone who read the English page and
 * tapped "Get started" lands in an English app without being asked.
 */
export function withLang(href: string, lang: Locale): string {
  if (lang === "fr") return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`;
}

/** For Intl date and number formatting. */
export const DATE_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", ja: "ja-JP" };

/** The switch's labels: FR | EN | 日本語. */
export const LOCALE_LABEL: Record<Locale, string> = { fr: "FR", en: "EN", ja: "日本語" };

const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_GB", ja: "ja_JP" };

const PATHS = {
  home: { fr: "/", en: "/en", ja: "/ja" },
  about: { fr: "/a-propos", en: "/en/about", ja: "/ja/about" },
  download: { fr: "/download", en: "/en/download", ja: "/ja/download" },
  privacy: { fr: "/confidentialite", en: "/en/privacy", ja: "/ja/privacy" },
  terms: { fr: "/conditions-utilisation", en: "/en/terms", ja: "/ja/terms" },
  deleteAccount: { fr: "/supprimer-mon-compte", en: "/en/delete-account", ja: "/ja/delete-account" },
} satisfies Record<string, Record<Locale, string>>;

export type PublicPage = keyof typeof PATHS;

export const PUBLIC_PAGES = Object.keys(PATHS) as PublicPage[];

export function pagePath(page: PublicPage, lang: Locale): string {
  return PATHS[page][lang];
}

/** hreflang links between the three versions of a page; French is the default. */
export function languageAlternates(page: PublicPage, lang: Locale): Metadata["alternates"] {
  const paths = PATHS[page];
  return {
    canonical: paths[lang],
    languages: { fr: paths.fr, en: paths.en, ja: paths.ja, "x-default": paths.fr },
  };
}

/**
 * Full metadata for an English or Japanese page. Open Graph is restated
 * in full because Next merges metadata per top-level key: setting
 * `openGraph` here replaces the root layout's, image included.
 */
export function translatedMetadata(page: PublicPage, lang: Locale, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: languageAlternates(page, lang),
    openGraph: {
      title,
      description,
      url: pagePath(page, lang),
      siteName: "Ittsui",
      locale: OG_LOCALE[lang],
      type: "website",
      images: [{ url: "/hero.jpg", width: 1536, height: 1024, alt: "Ittsui" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/hero.jpg"] },
  };
}
