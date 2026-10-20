// /app/confidentialite/page.tsx — the privacy page, in French.
// The page lives in app/components/site/PrivacyView.tsx, shared with
// /en/privacy and /ja/privacy.

import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { PrivacyView } from "@/app/components/site/PrivacyView";

export const metadata: Metadata = {
  alternates: languageAlternates("privacy", "fr"),
};

export default function ConfidentialitePage() {
  return <PrivacyView lang="fr" />;
}
