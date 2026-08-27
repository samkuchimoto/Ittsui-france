// /app/download/page.tsx
// Server Component — the QR code is deterministic (always encodes this same
// page's own URL) so it's generated once at request time server-side rather
// than shipping a QR-drawing library to the client. Platform-detected CTAs
// (Play Store / App Store / direct APK) live in DownloadClient.tsx, the one
// part that genuinely needs the browser's navigator.userAgent.

import { Fraunces, Work_Sans } from "next/font/google";
import Link from "next/link";
import QRCode from "qrcode";
import { INK, MUTED, BORDER } from "@/lib/theme";
import DownloadClient from "./DownloadClient";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";

export const metadata = {
  title: "Télécharger Ittsui",
  description: "Installez Ittsui sur votre téléphone, ou continuez directement sur le web.",
};

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export default async function DownloadPage() {
  const qrSvg = await QRCode.toString("https://www.ittsui.fr/download", {
    type: "svg",
    margin: 1,
    color: { dark: INK, light: "#FFFDF900" },
  });

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
        <Link href="/" className="self-start text-sm" style={{ color: MUTED }}>
          ← Retour
        </Link>

        <PageMascotHeader />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2rem" }}>
          Télécharger Ittsui
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Un rituel hebdomadaire pour préserver vos relations proches — disponible sur votre
          téléphone, ou directement dans votre navigateur.
        </p>

        <DownloadClient qrSvg={qrSvg} />

        <div className="mt-16 border-t pt-8 text-left text-sm" style={{ borderColor: BORDER, color: MUTED }}>
          <h2 className="text-base" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: INK }}>
            Questions fréquentes
          </h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="font-medium" style={{ color: INK }}>
                Est-ce gratuit&nbsp;?
              </dt>
              <dd className="mt-1">
                Oui, le rituel de base reste gratuit pour toujours. Ittsui Plus (suggestions
                enrichies, options supplémentaires) arrive bientôt.
              </dd>
            </div>
            <div>
              <dt className="font-medium" style={{ color: INK }}>
                Mes données sont-elles synchronisées entre le web et l&apos;application&nbsp;?
              </dt>
              <dd className="mt-1">
                Oui — même compte, même backend Firebase des deux côtés, aucune donnée séparée à
                gérer.
              </dd>
            </div>
            <div>
              <dt className="font-medium" style={{ color: INK }}>
                Puis-je désinstaller l&apos;application sans perdre mes données&nbsp;?
              </dt>
              <dd className="mt-1">
                Oui, vos données restent sur votre compte, pas sur l&apos;appareil — vous
                retrouvez tout en vous reconnectant, sur le web ou en réinstallant
                l&apos;application.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <footer className="flex flex-col items-center gap-2 px-6 pb-10 text-center text-sm" style={{ color: `${MUTED}99` }}>
        <span>© 2026 Ittsui France. Conçu avec retenue.</span>
        <span className="flex items-center gap-3">
          <Link href="/confidentialite" className="underline underline-offset-4">
            Confidentialité
          </Link>
          <Link href="/mentions-legales" className="underline underline-offset-4">
            Mentions légales
          </Link>
        </span>
      </footer>
    </main>
  );
}
