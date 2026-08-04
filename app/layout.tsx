// /app/layout.tsx — root shell, PWA manifest link, base font/meta

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ittsui",
  description: "Le rendez-vous de la semaine, sans y penser.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}
