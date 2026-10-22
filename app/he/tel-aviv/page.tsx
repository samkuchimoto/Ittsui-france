// /app/he/tel-aviv/page.tsx — Ittsui in Tel Aviv, in Hebrew first, right
// to left (see CityLanding.tsx).

import { CityLanding, cityLandingMetadata } from "@/app/components/site/CityLanding";

export const metadata = cityLandingMetadata("tel-aviv", "he");

export default function TelAvivPage() {
  return <CityLanding cityId="tel-aviv" lang="he" />;
}
