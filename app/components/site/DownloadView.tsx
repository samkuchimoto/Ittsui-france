// /app/components/site/DownloadView.tsx
// /download, /en/download, /ja/download.
// Server Component — the QR code is deterministic (always encodes this same
// page's own URL) so it's generated once at request time server-side rather
// than shipping a QR-drawing library to the client. Platform-detected CTAs
// (Play Store / App Store / direct APK) live in DownloadClient.tsx, the one
// part that genuinely needs the browser's navigator.userAgent.

import { fraunces, workSans } from "@/app/fonts";
import QRCode from "qrcode";
import { INK, MUTED, BORDER } from "@/lib/theme";
import { pagePath, type Locale } from "@/lib/i18n";
import { plusOffer } from "@/lib/planConfig";
import DownloadClient from "@/app/download/DownloadClient";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { SubpageTop } from "@/app/components/site/SubpageTop";
import { SiteFooter } from "@/app/components/site/SiteFooter";
import { localeTypography } from "@/app/components/site/typography";

const COPY: Record<Locale, { title: string; intro: string; faqTitle: string; faq: [string, string][] }> = {
  fr: {
    title: "Télécharger Ittsui",
    intro:
      "Un rituel hebdomadaire pour préserver vos relations proches — disponible sur votre téléphone, ou directement dans votre navigateur.",
    faqTitle: "Questions fréquentes",
    faq: [
      [
        "Est-ce gratuit ?",
        "Oui, pour un rendez-vous par mois. Chaque nouveau compte commence avec 14 jours d'Ittsui Plus offerts, sans carte bancaire. Ensuite, Ittsui Plus coûte {price}/mois pour des rendez-vous chaque semaine, sans limite, et se résilie à tout moment.",
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
        "Yes, for one rendez-vous a month. Every new account starts with 14 days of Ittsui Plus, free, no card needed. After that, Ittsui Plus is {price}/month for rendez-vous every week, with no limit, and you can cancel anytime.",
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
        "はい、月1回のランデヴーまでは無料です。新規アカウントは、Ittsui Plusを14日間無料でお試しいただけます（カード不要）。その後は月額{price}で、毎週、回数の制限なくご利用いただけます。いつでも解約できます。",
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
  es: {
    title: "Descarga Ittsui",
    intro: "Un ritual semanal para cuidar tus relaciones más cercanas, en tu celular o directamente en el navegador.",
    faqTitle: "Preguntas frecuentes",
    faq: [
      [
        "¿Es gratis?",
        "Sí, para un encuentro al mes. Cada cuenta nueva empieza con 14 días de Ittsui Plus gratis, sin tarjeta. Después, Ittsui Plus cuesta {price} al mes para tener encuentros cada semana, sin límite, y puedes cancelar cuando quieras.",
      ],
      [
        "¿Mis datos se sincronizan entre la web y la app?",
        "Sí: la misma cuenta y el mismo backend de Firebase en ambos lados, sin datos separados que administrar.",
      ],
      [
        "¿Puedo desinstalar la app sin perder mis datos?",
        "Sí, tus datos están en tu cuenta, no en el dispositivo. Recuperas todo al volver a iniciar sesión, en la web o después de reinstalar la app.",
      ],
    ],
  },
  he: {
    title: "הורדת Ittsui",
    intro: "ריטואל שבועי לטיפוח הקשרים הכי קרובים שלכם, בטלפון או ישירות בדפדפן.",
    faqTitle: "שאלות נפוצות",
    faq: [
      [
        "זה בחינם?",
        "כן, למפגש אחד בחודש. כל חשבון חדש מתחיל עם 14 ימי Ittsui Plus בחינם, בלי כרטיס אשראי. אחר כך Ittsui Plus עולה {price} לחודש למפגשים בכל שבוע, בלי הגבלה, ואפשר לבטל מתי שרוצים.",
      ],
      [
        "הנתונים שלי מסונכרנים בין האתר לאפליקציה?",
        "כן: אותו חשבון ואותו שרת Firebase בשני הצדדים, בלי נתונים נפרדים לנהל.",
      ],
      [
        "אפשר להסיר את האפליקציה בלי לאבד את הנתונים?",
        "כן, הנתונים נשמרים בחשבון, לא במכשיר. הכול חוזר אחרי התחברות מחדש, באתר או אחרי התקנה מחדש של האפליקציה.",
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

        <div className="mt-16 border-t pt-8 text-start text-sm" style={{ borderColor: BORDER, color: MUTED }}>
          <h2 className="text-base" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: INK }}>
            {t.faqTitle}
          </h2>
          <dl className="mt-4 space-y-4">
            {t.faq.map(([question, answer]) => (
              <div key={question}>
                <dt className="font-medium" style={{ color: INK }}>
                  {question}
                </dt>
                <dd className="mt-1">{answer.replace("{price}", plusOffer(lang).label)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <SiteFooter page="download" lang={lang} links="legal" />
    </main>
  );
}
