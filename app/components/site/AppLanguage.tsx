// /app/components/site/AppLanguage.tsx
// Server half of LangProvider: reads the ittsui_lang cookie so the app's
// first render is already in the chosen language. Used by the small
// layout.tsx of each app section (setup, dashboard, requests…). Those
// pages are force-dynamic already, so reading a cookie costs nothing.

import { cookies } from "next/headers";
import { LANG_COOKIE, isLocale } from "@/lib/i18n";
import { LangProvider } from "@/app/components/site/LangProvider";

export function AppLanguage({ children }: { children: React.ReactNode }) {
  const value = cookies().get(LANG_COOKIE)?.value;
  const chosen = isLocale(value);
  return (
    <LangProvider initialLang={chosen ? value : "fr"} chosen={chosen}>
      {children}
    </LangProvider>
  );
}
