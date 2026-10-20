// /lib/translate.ts
// Translation for the app screens, gettext-style: the French text in the
// code IS the key, and each screen keeps its English and Japanese in a
// catalog next to it (e.g. app/setup/setup.i18n.ts). French renders the
// key itself, so the French app reads exactly as it did; a key missing
// from a catalog falls back to French rather than to a blank.
// `npm run check:i18n` lists every t("…") without a translation.
//
//   const t = useT(SETUP);
//   t("Avec qui ?")                      -> "Who with?" in English
//   t("Bonjour {name}", { name })         -> placeholders work in every language

import type { Locale } from "@/lib/i18n";

export type Catalog = { en: Record<string, string>; ja: Record<string, string> };

export type Translate = (text: string, vars?: Record<string, string | number>) => string;

/** One catalog from several, for a screen that reuses another screen's strings. */
export function mergeCatalogs(...catalogs: Catalog[]): Catalog {
  return {
    en: Object.assign({}, ...catalogs.map((catalog) => catalog.en)),
    ja: Object.assign({}, ...catalogs.map((catalog) => catalog.ja)),
  };
}

export function makeT(lang: Locale, catalog: Catalog): Translate {
  return (text, vars) => {
    const template = lang === "fr" ? text : (catalog[lang][text] ?? text);
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
  };
}
