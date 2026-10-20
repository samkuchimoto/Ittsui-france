// /app/ja/about/page.tsx — 「Ittsuiが生まれた理由」 (see AboutView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { AboutView } from "@/app/components/site/AboutView";

export const metadata = translatedMetadata(
  "about",
  "ja",
  "Ittsuiが生まれた理由",
  "日本の農場で過ごした6か月、プラハのホステル、そして時間についてのひと言。Ittsuiの本当の始まりの話です。",
);

export default function AboutJa() {
  return <AboutView lang="ja" />;
}
