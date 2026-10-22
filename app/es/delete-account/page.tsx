// /app/es/delete-account/page.tsx — Mexican Spanish (see DeleteAccountView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DeleteAccountView } from "@/app/components/site/DeleteAccountView";

export const metadata = translatedMetadata(
  "deleteAccount",
  "es",
  "Eliminar mi cuenta · Ittsui",
  "Cómo eliminar tu cuenta de Ittsui para siempre, y qué datos se borran o se conservan.",
);

export default function DeleteAccountEs() {
  return <DeleteAccountView lang="es" />;
}
