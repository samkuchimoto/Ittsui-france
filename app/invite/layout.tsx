// /app/invite/layout.tsx — the page an invited partner opens reads the app
// language (ittsui_lang), falling back to the inviter's. It never asks
// for one first (see LangProvider.tsx).

import { AppLanguage } from "@/app/components/site/AppLanguage";

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <AppLanguage>{children}</AppLanguage>;
}
