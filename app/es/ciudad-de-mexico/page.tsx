// /app/es/ciudad-de-mexico/page.tsx — Ittsui in Mexico City, in Mexican
// Spanish first (see CityLanding.tsx).

import { CityLanding, cityLandingMetadata } from "@/app/components/site/CityLanding";

export const metadata = cityLandingMetadata("mexico-city", "es");

export default function CiudadDeMexicoPage() {
  return <CityLanding cityId="mexico-city" lang="es" />;
}
