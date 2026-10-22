// /app/es/about/page.tsx — Mexican Spanish (see AboutView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { AboutView } from "@/app/components/site/AboutView";

export const metadata = translatedMetadata(
  "about",
  "es",
  "Por qué existe Ittsui",
  "La historia real detrás de Ittsui: seis meses en granjas de Japón, un hostal en Praga y una frase sobre el tiempo.",
);

export default function AboutEs() {
  return <AboutView lang="es" />;
}
