// /app/components/site/typography.ts
// Fraunces and the system body stack have no Japanese glyphs, and without
// a stated fallback each browser picks its own per script, often a gothic
// for the headlines. Japanese pages name a mincho for display type and a
// gothic for body text explicitly. System fonts only, on purpose: a
// Japanese webfont is megabytes split across hundreds of files, a poor
// trade for a handful of marketing pages.

import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";

const JA_BODY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, "Noto Sans JP", "Noto Sans CJK JP", sans-serif';
const JA_DISPLAY = '"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", "Noto Serif CJK JP", serif';

/** Extra <main> styles for a language; `displayFamily` is Fraunces' next/font family. */
export function localeTypography(lang: Locale, displayFamily: string): CSSProperties | undefined {
  if (lang !== "ja") return undefined;
  return { fontFamily: JA_BODY, ["--font-display" as string]: `${displayFamily}, ${JA_DISPLAY}` } as CSSProperties;
}
