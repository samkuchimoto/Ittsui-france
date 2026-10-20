// /app/contacts/layout.tsx — the address book reads the app language
// (ittsui_lang), and asks for it the first time the app opens.

import { AppLanguage } from "@/app/components/site/AppLanguage";

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <AppLanguage>{children}</AppLanguage>;
}
