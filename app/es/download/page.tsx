// /app/es/download/page.tsx — Mexican Spanish (see DownloadView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DownloadView } from "@/app/components/site/DownloadView";

export const metadata = translatedMetadata(
  "download",
  "es",
  "Descarga Ittsui",
  "Instala Ittsui en tu teléfono o sigue directamente en tu navegador.",
);

export default function DownloadEs() {
  return <DownloadView lang="es" />;
}
