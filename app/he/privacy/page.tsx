// /app/he/privacy/page.tsx — Hebrew (see PrivacyView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { PrivacyView } from "@/app/components/site/PrivacyView";

export const metadata = translatedMetadata(
  "privacy",
  "he",
  "פרטיות · Ittsui",
  "מה Ittsui שומרת, במילים פשוטות, ולמה.",
);

export default function PrivacyHe() {
  return <PrivacyView lang="he" />;
}
