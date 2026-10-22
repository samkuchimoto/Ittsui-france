// /app/he/about/page.tsx — Hebrew (see AboutView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { AboutView } from "@/app/components/site/AboutView";

export const metadata = translatedMetadata(
  "about",
  "he",
  "למה Ittsui קיימת",
  "הסיפור האמיתי מאחורי Ittsui: חצי שנה בחוות ביפן, אכסניה בפראג ומשפט אחד על זמן.",
);

export default function AboutHe() {
  return <AboutView lang="he" />;
}
