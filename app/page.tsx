// /app/page.tsx
// The French homepage. The page itself lives in
// app/components/site/HomeView.tsx, shared with /en and /ja — its header
// comment carries the design history (tester feedback, the sandbox, the
// 2026-10-20 switch from gestures to email summaries).

import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { HomeView } from "@/app/components/site/HomeView";

export const metadata: Metadata = {
  alternates: languageAlternates("home", "fr"),
};

export default function Home() {
  return <HomeView lang="fr" />;
}
