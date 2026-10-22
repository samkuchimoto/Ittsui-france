// /app/paris/page.tsx — Ittsui in Paris, in French (see CityLanding.tsx).

import { CityLanding, cityLandingMetadata } from "@/app/components/site/CityLanding";

export const metadata = cityLandingMetadata("paris", "fr");

export default function ParisPage() {
  return <CityLanding cityId="paris" lang="fr" />;
}
