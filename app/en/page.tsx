// /app/en/page.tsx — the homepage in English (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "en",
  "Ittsui · One proposal. One decision. More time with the people who matter",
  "Ittsui picks the place and the time for a rendez-vous with someone close. You confirm in one tap; your guest answers from a link, with nothing to install.",
);

export default function HomeEn() {
  return <HomeView lang="en" />;
}
