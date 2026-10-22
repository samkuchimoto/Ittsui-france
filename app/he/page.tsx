// /app/he/page.tsx — Hebrew (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "he",
  "Ittsui · הצעה אחת. החלטה אחת. יותר זמן עם האנשים שחשובים לכם",
  "Ittsui בוחרת מקום ושעה למפגש עם מישהו קרוב. מאשרים בנגיעה אחת, ומי שמוזמן עונה מקישור, בלי להתקין כלום.",
);

export default function HomeHe() {
  return <HomeView lang="he" />;
}
