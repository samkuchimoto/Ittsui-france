// /app/en/page.tsx — the homepage in English (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "en",
  "Ittsui · One rendez-vous a week with the people who matter",
  "Ittsui picks the place and the time for a weekly rendez-vous with someone close, and sums up your emails. Your guest needs no app and no account.",
);

export default function HomeEn() {
  return <HomeView lang="en" />;
}
