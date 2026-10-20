// /app/conditions-utilisation/page.tsx — the terms of use, in French.
// The page lives in app/components/site/TermsView.tsx, shared with
// /en/terms and /ja/terms.

import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { TermsView } from "@/app/components/site/TermsView";

export const metadata: Metadata = {
  alternates: languageAlternates("terms", "fr"),
};

export default function ConditionsUtilisationPage() {
  return <TermsView lang="fr" />;
}
