// /app/en/download/page.tsx — "Download Ittsui" (see DownloadView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DownloadView } from "@/app/components/site/DownloadView";

export const metadata = translatedMetadata(
  "download",
  "en",
  "Download Ittsui",
  "Install Ittsui on your phone, or carry on right in your browser.",
);

export default function DownloadEn() {
  return <DownloadView lang="en" />;
}
