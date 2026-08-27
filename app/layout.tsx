// /app/layout.tsx — root shell, PWA manifest link, base font/meta

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ShareTargetListener } from "@/app/components/ShareTargetListener";

// Real SEO gaps found live 2026-08-27 (no robots.txt/sitemap.xml at all
// — see app/robots.ts, app/sitemap.ts — plus no metadataBase and no
// Open Graph/Twitter metadata here). None of this makes an already-live
// site "not exist," despite what one Google AI Overview claimed when
// checked from a phone — the site itself returns real 200s and correct
// HTML for every real request; this is about being discoverable and
// looking right when shared, not about being down.
const SITE_URL = "https://www.ittsui.fr";
const DESCRIPTION = "Le rendez-vous de la semaine, sans y penser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Ittsui",
  description: DESCRIPTION,
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "Ittsui",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Ittsui",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/hero.jpg", width: 1536, height: 1024, alt: "Ittsui" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ittsui",
    description: DESCRIPTION,
    images: ["/hero.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#FFFDF9] antialiased">
        <ShareTargetListener />
        {children}
      </body>
    </html>
  );
}