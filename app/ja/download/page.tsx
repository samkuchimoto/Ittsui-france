// /app/ja/download/page.tsx — 「Ittsuiをダウンロード」 (see DownloadView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DownloadView } from "@/app/components/site/DownloadView";

export const metadata = translatedMetadata(
  "download",
  "ja",
  "Ittsuiをダウンロード",
  "Ittsuiをスマートフォンにインストールするか、そのままブラウザで使えます。",
);

export default function DownloadJa() {
  return <DownloadView lang="ja" />;
}
