"use client";
// /app/components/site/LangProvider.tsx
// The app's language, for every screen under it. The server layout reads
// the ittsui_lang cookie (see AppLanguage.tsx) so the first render is
// already in the right language — no French flash before an English app.
//
// The first time someone opens the app (no cookie yet), it asks: French,
// English or Japanese, one tap, then never again. Not on the pages an
// invitee lands on from a link (an invitation, a meeting request, a
// gesture): those are one-tap flows by design, and a language question
// in front of "Je viens" would cost exactly the friction the product
// exists to remove. Not on the email summary either, a tool reached from
// the public homepage with its own switch in view. Those get the small
// switch (AppLangSwitch) instead.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LANG_COOKIE, type Locale } from "@/lib/i18n";
import { makeT, type Catalog, type Translate } from "@/lib/translate";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { LanguagePicker } from "@/app/components/site/LanguagePicker";

type LangState = {
  lang: Locale;
  setLang: (lang: Locale) => void;
  /**
   * For the pages someone else's link opens: show them in the sender's
   * language, unless this visitor already picked one. Never saved.
   */
  suggestLang: (lang: Locale) => void;
};

const LangContext = createContext<LangState>({ lang: "fr", setLang: () => {}, suggestLang: () => {} });

export function rememberLang(lang: Locale) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** Pages never interrupted by the picker: links someone else sent, and the email summary. */
const NO_PICKER = /^\/(invite\/|geste\/(?!nouveau)|request\/(?!new)|partenaires|triage)/;

export function LangProvider({
  initialLang,
  chosen,
  children,
}: {
  initialLang: Locale;
  /** Whether the cookie was set, i.e. the person already picked a language. */
  chosen: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [lang, setLangState] = useState<Locale>(initialLang);
  const [asked, setAsked] = useState(chosen);

  const setLang = useCallback(
    (next: Locale) => {
      rememberLang(next);
      setLangState(next);
      setAsked(true);
      // Server-rendered parts of the page re-render in the new language.
      router.refresh();
    },
    [router],
  );

  const suggestLang = useCallback(
    (next: Locale) => {
      if (!asked) setLangState(next);
    },
    [asked],
  );

  const value = useMemo(() => ({ lang, setLang, suggestLang }), [lang, setLang, suggestLang]);
  const ask = !asked && !NO_PICKER.test(pathname);

  return (
    <LangContext.Provider value={value}>
      <DocumentLang lang={lang} />
      {children}
      {ask && <LanguagePicker onPick={setLang} />}
    </LangContext.Provider>
  );
}

export function useLang(): LangState {
  return useContext(LangContext);
}

/** `t()` for a screen's catalog, in the current language. */
export function useT(catalog: Catalog): Translate {
  const { lang } = useLang();
  return useMemo(() => makeT(lang, catalog), [lang, catalog]);
}
