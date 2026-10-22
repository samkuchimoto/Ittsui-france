// /app/he/delete-account/page.tsx — Hebrew (see DeleteAccountView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { DeleteAccountView } from "@/app/components/site/DeleteAccountView";

export const metadata = translatedMetadata(
  "deleteAccount",
  "he",
  "מחיקת החשבון שלי · Ittsui",
  "איך למחוק לצמיתות את חשבון Ittsui שלך, ואילו נתונים נמחקים או נשמרים.",
);

export default function DeleteAccountHe() {
  return <DeleteAccountView lang="he" />;
}
