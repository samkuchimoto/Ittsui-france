// /app/ja/privacy/page.tsx — the privacy page in Japanese (see PrivacyView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { PrivacyView } from "@/app/components/site/PrivacyView";

export const metadata = translatedMetadata(
  "privacy",
  "ja",
  "プライバシー · Ittsui",
  "Ittsuiが何を記録し、なぜそうするのかを、わかりやすく説明します。",
);

export default function PrivacyJa() {
  return <PrivacyView lang="ja" />;
}
