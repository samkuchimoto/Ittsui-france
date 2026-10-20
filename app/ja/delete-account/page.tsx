// /app/ja/delete-account/page.tsx — account deletion in Japanese (see DeleteAccountView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DeleteAccountView } from "@/app/components/site/DeleteAccountView";

export const metadata = translatedMetadata(
  "deleteAccount",
  "ja",
  "アカウントを削除する · Ittsui",
  "Ittsuiのアカウントを完全に削除する方法と、消去されるデータ・残るデータについて。",
);

export default function DeleteAccountJa() {
  return <DeleteAccountView lang="ja" />;
}
