// /app/ja/terms/page.tsx — the terms of use in Japanese (see TermsView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { TermsView } from "@/app/components/site/TermsView";

export const metadata = translatedMetadata("terms", "ja", "利用規約 · Ittsui", "Ittsuiの利用ルールを、わかりやすく説明します。");

export default function TermsJa() {
  return <TermsView lang="ja" />;
}
