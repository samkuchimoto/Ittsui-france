// /app/es/page.tsx — Mexican Spanish (see HomeView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata = translatedMetadata(
  "home",
  "es",
  "Ittsui · Una propuesta. Una decisión. Más tiempo con la gente que importa",
  "Ittsui elige el lugar y la hora para un encuentro con alguien cercano. Confirmas con un toque; tu invitado responde desde un enlace, sin instalar nada.",
);

export default function HomeEs() {
  return <HomeView lang="es" />;
}
