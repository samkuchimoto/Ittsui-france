// /app/components/site/TermsView.tsx
// /conditions-utilisation, /en/terms, /ja/terms.
// Plain-language terms of use — like the privacy page, this describes
// what using Ittsui actually involves today, not a law firm's final
// text. Written because Google's own Unwanted Software Policy requires
// a Terms of Service/EULA link (confirmed 2026-08-24 by reading that
// policy directly, not assumed), and because none existed anywhere in
// this app despite /confidentialite and /mentions-legales already
// covering the two other legally-relevant angles (data practices,
// publisher identity). Have this reviewed by a real lawyer before
// treating it as final/binding — same caveat this codebase already
// applies to every other legal-adjacent page.
//
// 2026-10-20: "Ce qu'est Ittsui" now includes the email summary, and a
// section says what the summary is (a reading aid that can be wrong).

import Link from "next/link";
import { ACCENT } from "@/lib/theme";
import { DATE_LOCALE, pagePath, type Locale } from "@/lib/i18n";
import { PLAN_CURRENCIES, plusPriceLabel } from "@/lib/planConfig";
import { LegalShell, Item, legalLang } from "@/app/components/site/LegalShell";

const Mail = () => (
  <a href="mailto:contact@kuchimoto.com" style={{ color: ACCENT }}>
    contact@kuchimoto.com
  </a>
);

type Section = { title: string; body: React.ReactNode };

function sections(lang: Locale): { title: string; intro: string; items: Section[] } {
  // Plus in the other currencies, as checkout charges them (lib/planConfig.ts).
  const otherPrices = PLAN_CURRENCIES.filter((currency) => currency !== "EUR")
    .map((currency) => plusPriceLabel(currency, DATE_LOCALE[legalLang(lang)]))
    .join(", ");
  const privacy = (label: string) => (
    <Link href={pagePath("privacy", lang)} style={{ color: ACCENT }}>
      {label}
    </Link>
  );
  if (legalLang(lang) === "en") {
    return {
      title: "Terms of use",
      intro: "The rules for using Ittsui, in plain words. This describes what the app actually does today; it isn't a final legal document.",
      items: [
        {
          title: "What Ittsui is",
          body: "Ittsui is a tool to keep a regular rendez-vous with someone close (partner, friend, family member), to suggest a one-off rendez-vous to one of your contacts, and to sum up your emails. It isn't a messaging service, a social network or a dating app.",
        },
        {
          title: "Who can use Ittsui",
          body: "Ittsui is meant for adults and isn't designed for children. Unless a specific legal threshold is confirmed for your situation, we use a minimum age of 16 by default, in line with the GDPR threshold; to be confirmed if needed.",
        },
        {
          title: "Your account",
          body: (
            <>
              You sign in with your Google account, or with a passkey linked to an account already created through Google.
              You are responsible for the security of that account. If you think it has been compromised, write to us
              immediately at <Mail />.
            </>
          ),
        },
        {
          title: "Inviting someone and suggesting a rendez-vous",
          body: "Ittsui lets you send an invitation or a rendez-vous request by email to a person of your choice, even if they don't have an account yet. You agree to use this feature only for real people you know who would reasonably expect to receive this message from you: never for canvassing, harassment, or sending messages to people who don't want them. The invited person can decline without creating an account and have the data about them deleted immediately.",
        },
        {
          title: "The email summary",
          body: "It's a reading aid, not advice: the sorting is done by automatic rules and can be wrong. Always check an important email in your inbox, and never follow a payment or sign-in link without checking that it really comes from the organisation concerned.",
        },
        {
          title: "What we provide, and what we don't guarantee",
          body: `Ittsui is free for one rendez-vous a month. Every new account gets 14 days of Ittsui Plus, free, with no card. Ittsui Plus (unlimited rendez-vous) costs €4.99 a month (in another currency, the amount shown before payment: ${otherPrices}) with no commitment: the subscription renews every month and can be cancelled at any time from the dashboard, taking effect at the end of the month already paid. Ittsui suggests places and time slots as a guide; we don't guarantee the availability, accuracy or relevance of each suggestion, and we aren't responsible for what happens during a rendez-vous you arrange through the app.`,
        },
        { title: "Your data", body: <>How your personal data is handled is described in detail on the {privacy("Privacy")} page.</> },
        {
          title: "Suspending and deleting an account",
          body: "You can delete your account at any time from the dashboard. We may suspend or close an account used to harass, canvass, or contact people without their consent (see the section above).",
        },
        {
          title: "Changes",
          body: (
            <>
              These terms may change as Ittsui changes. The version online on this page is the one that applies. For any
              question, write to <Mail />.
            </>
          ),
        },
      ],
    };
  }
  if (lang === "ja") {
    return {
      title: "利用規約",
      intro: "Ittsuiの利用ルールを、わかりやすく説明します。これは今のアプリが実際にしていることの説明で、最終的な法的文書ではありません。",
      items: [
        {
          title: "Ittsuiとは",
          body: "Ittsuiは、大切な人（パートナー、友人、家族）との定期的な約束を続け、連絡先の誰かに1回だけの約束を提案し、メールを要約するためのツールです。メッセージアプリでも、SNSでも、出会い系アプリでもありません。",
        },
        {
          title: "利用できる人",
          body: "Ittsuiは大人向けのサービスで、子ども向けにはつくられていません。あなたの状況について特定の法的な年齢基準が確認されない限り、GDPRの基準に合わせて最低年齢を16歳としています（必要に応じて確認します）。",
        },
        {
          title: "アカウント",
          body: (
            <>
              Googleアカウント、またはGoogleで作成済みのアカウントに紐づいたパスキーでログインします。アカウントの安全はご自身で管理してください。不正に使われたと思われる場合は、すぐに
              <Mail /> までご連絡ください。
            </>
          ),
        },
        {
          title: "招待と約束の提案",
          body: "Ittsuiでは、まだアカウントを持っていない人も含め、あなたが選んだ相手に招待や約束のリクエストをメールで送れます。この機能は、あなたが実際に知っていて、あなたからのメッセージを受け取ることを当然に予想できる相手にだけ使うことに同意したものとします。勧誘、嫌がらせ、望まない人へのメッセージ送信には決して使わないでください。招待された人は、アカウントを作らずに辞退でき、自分に関するデータをすぐに削除してもらえます。",
        },
        {
          title: "メールの要約",
          body: "要約は読む手助けであり、助言ではありません。分類は自動のルールで行われるため、間違えることがあります。大事なメールは必ず受信トレイで確認し、支払いやログインのリンクは、本当にその組織からのものか確かめてから開いてください。",
        },
        {
          title: "提供するもの、保証しないもの",
          body: `Ittsuiは月1回のランデヴーまで無料です。新規アカウントには、Ittsui Plusの14日間無料お試しがつきます（カード不要）。Ittsui Plus（回数の制限なし）は月額4.99ユーロ（その他の通貨では、お支払い前に表示される金額：${otherPrices}）で、契約期間の縛りはありません。サブスクリプションは毎月更新され、ダッシュボードからいつでも解約でき、お支払い済みの月の終わりに終了します。Ittsuiが提案する場所や時間はあくまで目安です。それぞれの提案の空き状況、正確さ、適切さは保証できず、アプリで決めた約束の場で起きたことについて責任を負うことはできません。`,
        },
        { title: "あなたのデータ", body: <>個人データの取り扱いについては、{privacy("プライバシー")}のページで詳しく説明しています。</> },
        {
          title: "アカウントの停止と削除",
          body: "アカウントはダッシュボードからいつでも削除できます。嫌がらせや勧誘、同意のない相手への連絡に使われたアカウントは、停止または閉鎖することがあります（上の項目を参照）。",
        },
        {
          title: "変更",
          body: (
            <>
              この規約は、Ittsuiの変化に合わせて変わることがあります。このページに掲載されている版が有効です。ご質問は
              <Mail /> までどうぞ。
            </>
          ),
        },
      ],
    };
  }
  return {
    title: "Conditions d'utilisation",
    intro:
      "Les règles d'utilisation d'Ittsui, en clair. Ceci décrit ce que fait réellement l'application aujourd'hui — ce n'est pas un document juridique définitif.",
    items: [
      {
        title: "Ce qu'est Ittsui",
        body: "Ittsui est un outil pour maintenir un rendez-vous régulier avec une personne proche (partenaire, ami·e, membre de la famille), pour proposer ponctuellement un rendez-vous à l'un de vos contacts, et pour résumer vos e-mails. Ce n'est ni une messagerie, ni un réseau social, ni une application de rencontre.",
      },
      {
        title: "Qui peut utiliser Ittsui",
        body: "Ittsui est destiné à un usage adulte et n'est pas conçu pour les enfants. À défaut d'un seuil légal spécifique confirmé pour votre situation, nous retenons par défaut un âge minimum de 16 ans, cohérent avec le seuil du RGPD — à faire valider si besoin.",
      },
      {
        title: "Votre compte",
        body: (
          <>
            Vous vous connectez avec votre compte Google, ou avec une clé d&apos;accès (passkey) associée à un compte déjà
            créé via Google. Vous êtes responsable de la sécurité de ce compte. Si vous pensez qu&apos;il a été compromis,
            écrivez-nous immédiatement à <Mail />.
          </>
        ),
      },
      {
        title: "Inviter et proposer un rendez-vous à quelqu'un",
        body: "Ittsui vous permet d'envoyer une invitation ou une demande de rendez-vous par e-mail à une personne de votre choix, même si elle n'a pas encore de compte. Vous vous engagez à n'utiliser cette fonctionnalité que pour des personnes réelles que vous connaissez et qui s'attendent raisonnablement à recevoir ce message de votre part — jamais pour du démarchage, du harcèlement, ou l'envoi de messages à des personnes qui ne le souhaitent pas. La personne invitée peut décliner sans créer de compte, et voir la donnée la concernant supprimée immédiatement.",
      },
      {
        title: "Le résumé d'e-mails",
        body: "C'est une aide à la lecture, pas un conseil : le classement est fait par des règles automatiques et peut se tromper. Vérifiez toujours un e-mail important dans votre boîte de réception, et ne suivez jamais un lien de paiement ou de connexion sans avoir vérifié qu'il vient bien de l'organisme concerné.",
      },
      {
        title: "Ce que nous fournissons, et ce que nous ne garantissons pas",
        body: `Ittsui est gratuit pour un rendez-vous par mois. Chaque nouveau compte bénéficie de 14 jours d'Ittsui Plus offerts, sans carte bancaire. Ittsui Plus (rendez-vous sans limite) coûte 4,99 € par mois (dans une autre devise, le montant affiché avant le paiement : ${otherPrices}), sans engagement : l'abonnement se renouvelle chaque mois et se résilie à tout moment depuis le tableau de bord, avec effet à la fin du mois déjà payé. Ittsui propose des lieux et des créneaux à titre indicatif ; nous ne garantissons pas la disponibilité, l'exactitude ou la pertinence de chaque suggestion, et ne sommes pas responsables de ce qui se passe lors d'un rendez-vous que vous organisez via l'application.`,
      },
      {
        title: "Vos données",
        body: <>Le traitement de vos données personnelles est décrit en détail sur la page {privacy("Confidentialité")}.</>,
      },
      {
        title: "Suspension et suppression de compte",
        body: "Vous pouvez supprimer votre compte à tout moment depuis le tableau de bord. Nous pouvons suspendre ou clôturer un compte utilisé pour harceler, démarcher, ou contacter des personnes sans leur consentement — voir la section ci-dessus.",
      },
      {
        title: "Modifications",
        body: (
          <>
            Ces conditions peuvent évoluer à mesure qu&apos;Ittsui évolue. La version en ligne sur cette page fait foi. Pour
            toute question, écrivez à <Mail />.
          </>
        ),
      },
    ],
  };
}

export function TermsView({ lang }: { lang: Locale }) {
  const t = sections(lang);
  return (
    <LegalShell page="terms" lang={lang} title={t.title} intro={t.intro}>
      <div className="mt-8">
        {t.items.map((item) => (
          <Item key={item.title} title={item.title}>
            <p>{item.body}</p>
          </Item>
        ))}
      </div>
    </LegalShell>
  );
}
