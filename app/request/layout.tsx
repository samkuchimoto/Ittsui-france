// /app/request/layout.tsx — the request form and the page a recipient opens
// both read the app language (ittsui_lang). The form asks for it the first
// time the app opens; a recipient page never does (see LangProvider.tsx).

import { AppLanguage } from "@/app/components/site/AppLanguage";

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return <AppLanguage>{children}</AppLanguage>;
}
