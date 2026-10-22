// /app/es/page.tsx — Mexican Spanish (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "es",
  "Ittsui · Una cita a la semana con quienes importan",
  "Ittsui elige el lugar y la hora de una cita con alguien cercano. Tu invitado no necesita app ni cuenta.",
);

export default function HomeEs() {
  return <HomeView lang="es" />;
}
