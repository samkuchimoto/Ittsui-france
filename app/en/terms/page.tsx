// /app/en/terms/page.tsx — the terms of use in English (see TermsView.tsx).

import { translatedMetadata } from "@/lib/i18n";
import { TermsView } from "@/app/components/site/TermsView";

export const metadata = translatedMetadata("terms", "en", "Terms of use · Ittsui", "The rules for using Ittsui, in plain words.");

export default function TermsEn() {
  return <TermsView lang="en" />;
}
