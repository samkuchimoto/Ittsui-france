"use client";
// /app/components/site/NativeLanguagePicker.tsx
// The Android/iOS app is a wrapper that opens https://ittsui.fr (see
// capacitor.config.ts), so the first screen of the app IS the homepage.
// Inside the app, and only the first time (no language chosen yet), it
// starts with the language question; on the web the switch in the header
// and footer does that job, without a modal in front of a marketing page.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { LANG_COOKIE, pagePath, type Locale } from "@/lib/i18n";
import { rememberLang } from "@/app/components/site/LangProvider";
import { LanguagePicker } from "@/app/components/site/LanguagePicker";

export function NativeLanguagePicker({ lang }: { lang: Locale }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);

  // After mount: the platform check and the cookie only exist in the browser.
  useEffect(() => {
    const chosen = document.cookie.split(/;\s*/).some((cookie) => cookie.startsWith(`${LANG_COOKIE}=`));
    setAsk(Capacitor.isNativePlatform() && !chosen);
  }, []);

  if (!ask) return null;
  return (
    <LanguagePicker
      onPick={(picked) => {
        rememberLang(picked);
        setAsk(false);
        if (picked !== lang) router.push(pagePath("home", picked));
      }}
    />
  );
}
