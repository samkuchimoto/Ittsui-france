// /app/triage/layout.tsx — the email summary reads the app language (ittsui_lang).

import { AppLanguage } from "@/app/components/site/AppLanguage";

export default function TriageLayout({ children }: { children: React.ReactNode }) {
  return <AppLanguage>{children}</AppLanguage>;
}
