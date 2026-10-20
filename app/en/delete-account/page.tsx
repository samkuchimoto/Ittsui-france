// /app/en/delete-account/page.tsx — account deletion in English (see DeleteAccountView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DeleteAccountView } from "@/app/components/site/DeleteAccountView";

export const metadata = translatedMetadata(
  "deleteAccount",
  "en",
  "Delete my account · Ittsui",
  "How to permanently delete your Ittsui account, and which data is erased or kept.",
);

export default function DeleteAccountEn() {
  return <DeleteAccountView lang="en" />;
}
