// /app/supprimer-mon-compte/page.tsx — account deletion, in French.
// The page lives in app/components/site/DeleteAccountView.tsx (shared
// with /en/delete-account and /ja/delete-account); its header comment
// explains what Google Play requires of it.

import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { DeleteAccountView } from "@/app/components/site/DeleteAccountView";

export const metadata: Metadata = {
  title: "Supprimer mon compte — Ittsui",
  description: "Comment supprimer définitivement votre compte Ittsui et quelles données sont effacées ou conservées.",
  alternates: languageAlternates("deleteAccount", "fr"),
};

export default function SupprimerMonComptePage() {
  return <DeleteAccountView lang="fr" />;
}
