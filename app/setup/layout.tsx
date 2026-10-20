// /app/setup/layout.tsx — setup and its pending screen read the app
// language (ittsui_lang), and ask for it the first time the app opens.

import { AppLanguage } from "@/app/components/site/AppLanguage";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <AppLanguage>{children}</AppLanguage>;
}
