// /app/he/download/page.tsx — Hebrew (see DownloadView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DownloadView } from "@/app/components/site/DownloadView";

export const metadata = translatedMetadata(
  "download",
  "he",
  "הורדת Ittsui",
  "התקינו את Ittsui בטלפון, או המשיכו ישר בדפדפן.",
);

export default function DownloadHe() {
  return <DownloadView lang="he" />;
}
