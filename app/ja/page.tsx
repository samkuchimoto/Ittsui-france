// /app/ja/page.tsx — the homepage in Japanese (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "ja",
  "Ittsui · 大切な人と、週にひとつの約束を",
  "大切な人との週1回の約束を、場所と時間までIttsuiが提案します。メールの要約もできます。相手はアプリもアカウントも必要ありません。",
);

export default function HomeJa() {
  return <HomeView lang="ja" />;
}
