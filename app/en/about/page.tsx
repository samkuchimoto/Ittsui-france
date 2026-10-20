// /app/en/about/page.tsx — "Why Ittsui exists" (see AboutView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { AboutView } from "@/app/components/site/AboutView";

export const metadata = translatedMetadata(
  "about",
  "en",
  "Why Ittsui exists",
  "The real story behind Ittsui: six months on Japanese farms, a hostel in Prague, and one sentence about time.",
);

export default function AboutEn() {
  return <AboutView lang="en" />;
}
