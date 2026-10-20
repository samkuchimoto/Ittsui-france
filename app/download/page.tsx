// /app/download/page.tsx — "Télécharger Ittsui", in French.
// The page lives in app/components/site/DownloadView.tsx, shared with
// /en/download and /ja/download.

import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { DownloadView } from "@/app/components/site/DownloadView";

export const metadata: Metadata = {
  title: "Télécharger Ittsui",
  description: "Installez Ittsui sur votre téléphone, ou continuez directement sur le web.",
  alternates: languageAlternates("download", "fr"),
};

export default function DownloadPage() {
  return <DownloadView lang="fr" />;
}
