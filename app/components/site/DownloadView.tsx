// /app/components/site/DownloadView.tsx
// /download, /en/download, /ja/download.
// Server Component — the QR code is deterministic (always encodes this same
// page's own URL) so it's generated once at request time server-side rather
// than shipping a QR-drawing library to the client. Platform-detected CTAs
// (Play Store / App Store / direct APK) live in DownloadClient.tsx, the one
// part that genuinely needs the browser's navigator.userAgent.

import { Fraunces, Work_Sans } from "next/font/google";
import QRCode from "qrcode";
import { INK, MUTED, BORDER } from "@/lib/theme";
import { pagePath, type Locale } from "@/lib/i18n";
import DownloadClient from "@/app/download/DownloadClient";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { SubpageTop } from "@/app/components/site/SubpageTop";
import { SiteFooter } from "@/app/components/site/SiteFooter";
import { localeTypography } from "@/app/components/site/typography";

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

const COPY: Record<Locale, { title: string; intro: string; faqTitle: string; faq: [string, string][] }> = {
  fr: {
    title: "Télécharger Ittsui",
    intro:
      "Un rituel hebdomadaire pour préserver vos relations proches — disponible sur votre téléphone, ou directement dans votre navigateur.",
    faqTitle: "Questions fréquentes",
    faq: [
      [
        "Est-ce gratuit ?",
        "Oui, le rituel de base reste gratuit pour toujours. Ittsui Plus (suggestions enrichies, options supplémentaires) arrive bientôt, à partir de 1 €/mois — le prix d'un café pour ne pas perdre le lien avec les gens qui comptent.",
      ],
      [
        "Mes données sont-elles synchronisées entre le web et l'application ?",
        "Oui — même compte, même backend Firebase des deux côtés, aucune donnée séparée à gérer.",
      ],
      [
        "Puis-je désinstaller l'application sans perdre mes données ?",
        "Oui, vos données restent sur votre compte, pas sur l'appareil — vous retrouvez tout en vous reconnectant, sur le web ou en réinstallant l'application.",
      ],
    ],
  },
  en: {
    title: "Download Ittsui",
    intro: "A weekly ritual to look after your closest relationships, on your phone or right in your browser.",
    faqTitle: "Frequently asked questions",
    faq: [
      [
        "Is it free?",
        "Yes, the basic ritual stays free forever. Ittsui Plus (richer suggestions, extra options) is coming soon, from €1/month: the price of a coffee so you don't lose touch with the people who matter.",
      ],
      [
        "Is my data synced between the web and the app?",
        "Yes: same account, same Firebase backend on both sides, no separate data to manage.",
      ],
      [
        "Can I uninstall the app without losing my data?",
        "Yes, your data stays on your account, not on the device. You get everything back by signing in again, on the web or after reinstalling the app.",
      ],
    ],
  },
  ja: {
    title: "Ittsuiをダウンロード",
    intro: "大切な人との関係を守る、週に一度の習慣。スマートフォンでも、ブラウザからでも使えます。",
    faqTitle: "よくある質問",
    faq: [
      [
        "無料ですか？",
        "はい。基本の機能はずっと無料です。Ittsui Plus（より充実した提案や追加オプション）は月額1ユーロから、近日提供予定です。コーヒー1杯の値段で、大切な人とのつながりを守れます。",
      ],
      [
        "Webとアプリでデータは同期されますか？",
        "はい。同じアカウント、同じFirebaseのバックエンドを使っているので、別々に管理するデータはありません。",
      ],
      [
        "データを失わずにアプリをアンインストールできますか？",
        "はい。データは端末ではなくアカウントに保存されています。Webでログインし直すか、アプリを再インストールすれば、すべて元どおりです。",
      ],
    ],
  },
};

export async function DownloadView({ lang }: { lang: Locale }) {
  const t = COPY[lang];
  const qrSvg = await QRCode.toString(`https://www.ittsui.fr${pagePath("download", lang)}`, {
    type: "svg",
    margin: 1,
    color: { dark: INK, light: "#FFFDF900" },
  });

  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <DocumentLang lang={lang} />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
        <SubpageTop page="download" lang={lang} className="self-stretch" />

        <PageMascotHeader lang={lang} />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2rem" }}>
          {t.title}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: MUTED }}>
          {t.intro}
        </p>

        <DownloadClient qrSvg={qrSvg} lang={lang} />

        <div className="mt-16 border-t pt-8 text-left text-sm" style={{ borderColor: BORDER, color: MUTED }}>
          <h2 className="text-base" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: INK }}>
            {t.faqTitle}
          </h2>
          <dl className="mt-4 space-y-4">
            {t.faq.map(([question, answer]) => (
              <div key={question}>
                <dt className="font-medium" style={{ color: INK }}>
                  {question}
                </dt>
                <dd className="mt-1">{answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <SiteFooter page="download" lang={lang} links="legal" />
    </main>
  );
}
