// /app/ja/page.tsx — the homepage in Japanese (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "ja",
  "Ittsui · 提案はひとつ。決めるのは一度。大切な人との時間を、もっと",
  "大切な人との約束を、場所と時間までIttsuiが提案します。ワンタップで確定、相手はリンクから返事をするだけで、インストールは不要です。",
);

export default function HomeJa() {
  return <HomeView lang="ja" />;
}
