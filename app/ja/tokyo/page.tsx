// /app/ja/tokyo/page.tsx — Ittsui in Tokyo, in Japanese (see CityLanding.tsx).

import { CityLanding, cityLandingMetadata } from "@/app/components/site/CityLanding";

export const metadata = cityLandingMetadata("tokyo", "ja");

export default function TokyoPage() {
  return <CityLanding cityId="tokyo" lang="ja" />;
}
