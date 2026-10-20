// /app/dashboard/layout.tsx — the dashboard (and its archive) read the app
// language (ittsui_lang), and ask for it the first time the app opens.

import { AppLanguage } from "@/app/components/site/AppLanguage";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppLanguage>{children}</AppLanguage>;
}
