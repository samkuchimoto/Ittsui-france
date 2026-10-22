// /app/he/page.tsx — Hebrew (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "he",
  "Ittsui · פגישה אחת בשבוע עם האנשים שחשובים לך",
  "Ittsui בוחרת מקום ושעה למפגש עם מישהו קרוב. האורח שלך לא צריך אפליקציה או חשבון.",
);

export default function HomeHe() {
  return <HomeView lang="he" />;
}
