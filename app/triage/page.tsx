// /app/triage/page.tsx — "Résumez vos e-mails", the second half of Ittsui.
// Server wrapper: fonts and metadata here, the tool in TriageClient.tsx.
// The page's language comes from the ittsui_lang cookie (layout.tsx), like
// the rest of the app, so its title does too.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { fraunces, workSans } from "@/app/fonts";
import { LANG_COOKIE, isLocale, type Locale } from "@/lib/i18n";
import TriageClient from "./TriageClient";

const META: Record<Locale, { title: string; description: string }> = {
  fr: {
    title: "Résumez vos e-mails · Ittsui",
    description:
      "Collez votre boîte de réception ou une capture : priorités, dates limites et rendez-vous à caler, dans votre navigateur, sans rien envoyer.",
  },
  en: {
    title: "Sum up your emails · Ittsui",
    description: "Paste your inbox or a screenshot: priorities, deadlines and meetings to set up, in your browser, without sending anything.",
  },
  ja: {
    title: "メールを要約する · Ittsui",
    description: "受信トレイの内容かスクリーンショットを貼り付けるだけ。優先事項、期限、調整したい約束を、何も送信せずにブラウザの中で。",
  },
};

export function generateMetadata(): Metadata {
  const value = cookies().get(LANG_COOKIE)?.value;
  return META[isLocale(value) ? value : "fr"];
}

export default function TriagePage() {
  return <TriageClient fontClass={`${fraunces.variable} ${workSans.variable}`} displayFamily={fraunces.style.fontFamily} />;
}
