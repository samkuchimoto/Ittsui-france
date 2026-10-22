// /app/es/terms/page.tsx — Mexican Spanish (see TermsView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { TermsView } from "@/app/components/site/TermsView";

export const metadata = translatedMetadata(
  "terms",
  "es",
  "Condiciones de uso · Ittsui",
  "Las reglas para usar Ittsui, en palabras sencillas.",
);

export default function TermsEs() {
  return <TermsView lang="es" />;
}
