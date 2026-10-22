// /app/he/terms/page.tsx — Hebrew (see TermsView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { TermsView } from "@/app/components/site/TermsView";

export const metadata = translatedMetadata(
  "terms",
  "he",
  "תנאי שימוש · Ittsui",
  "הכללים לשימוש ב-Ittsui, במילים פשוטות.",
);

export default function TermsHe() {
  return <TermsView lang="he" />;
}
