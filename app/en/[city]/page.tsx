// /app/en/[city]/page.tsx — Ittsui in each of the eight cities, in English
// (/en/paris … /en/mexico-city, see CityLanding.tsx). Any other slug is a 404.

import { notFound } from "next/navigation";
import { CITY_IDS, isCityId } from "@/lib/cities";
import { CityLanding, cityLandingMetadata } from "@/app/components/site/CityLanding";

export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_IDS.map((city) => ({ city }));
}

export function generateMetadata({ params }: { params: { city: string } }) {
  return isCityId(params.city) ? cityLandingMetadata(params.city, "en") : {};
}

export default function CityPageEn({ params }: { params: { city: string } }) {
  if (!isCityId(params.city)) notFound();
  return <CityLanding cityId={params.city} lang="en" />;
}
