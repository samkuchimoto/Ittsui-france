// /app/es/privacy/page.tsx — Mexican Spanish (see PrivacyView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { PrivacyView } from "@/app/components/site/PrivacyView";

export const metadata = translatedMetadata(
  "privacy",
  "es",
  "Privacidad · Ittsui",
  "Qué guarda Ittsui, en palabras sencillas, y por qué.",
);

export default function PrivacyEs() {
  return <PrivacyView lang="es" />;
}
