// /app/en/privacy/page.tsx — the privacy page in English (see PrivacyView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { PrivacyView } from "@/app/components/site/PrivacyView";

export const metadata = translatedMetadata("privacy", "en", "Privacy · Ittsui", "What Ittsui records, in plain words, and why.");

export default function PrivacyEn() {
  return <PrivacyView lang="en" />;
}
