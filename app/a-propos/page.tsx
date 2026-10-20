// /app/a-propos/page.tsx — "Pourquoi Ittsui existe", in French.
// The page lives in app/components/site/AboutView.tsx, shared with
// /en/about and /ja/about.

import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { AboutView } from "@/app/components/site/AboutView";

export const metadata: Metadata = {
  alternates: languageAlternates("about", "fr"),
};

export default function AProposPage() {
  return <AboutView lang="fr" />;
}
