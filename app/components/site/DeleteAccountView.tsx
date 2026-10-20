// /app/components/site/DeleteAccountView.tsx
// /supprimer-mon-compte, /en/delete-account, /ja/delete-account.
// The public account-deletion page, linked from the Google Play store
// listing (Data safety -> "Delete account URL").
//
// Google requires this page to do three specific things, and each section
// below exists to satisfy one of them:
//   1. refer to the app and developer name shown on the store listing
//   2. prominently feature the steps to request deletion
//   3. specify which data is deleted, which is kept, and any retention
//
// Everything here is written from what app/api/user/delete/route.ts
// actually does — not from what a deletion flow is usually assumed to do.
// If that route changes, this page has to change with it (in all three
// languages), because a store listing that describes deletion
// inaccurately is worse than none.
//
// Deliberately reachable without signing in: a Play Store visitor who has
// not installed the app still has to be able to read it.

import Link from "next/link";
import { INK, MUTED, ACCENT } from "@/lib/theme";
import { pagePath, type Locale } from "@/lib/i18n";
import { LegalShell, Item } from "@/app/components/site/LegalShell";

const strong = (text: string) => <strong style={{ color: INK }}>{text}</strong>;
const dashboard = (
  <Link href="/dashboard" className="underline underline-offset-4">
    ittsui.fr/dashboard
  </Link>
);
const mail = (subject: string) => (
  <a href={`mailto:hello@ittsui.fr?subject=${encodeURIComponent(subject)}`} className="underline underline-offset-4" style={{ color: ACCENT }}>
    hello@ittsui.fr
  </a>
);

type Copy = {
  title: string;
  intro: React.ReactNode;
  stepsTitle: string;
  steps: React.ReactNode[];
  noAccessTitle: string;
  noAccess: React.ReactNode;
  deletedTitle: string;
  deleted: string[];
  keptTitle: string;
  kept: string[];
  retentionTitle: string;
  retention: string;
  mobileTitle: string;
  mobile: string;
  seeAlso: (link: React.ReactNode) => React.ReactNode;
  privacyLabel: string;
};

const COPY: Record<Locale, Copy> = {
  fr: {
    title: "Supprimer mon compte",
    intro: (
      <>
        Cette page concerne l&apos;application {strong("Ittsui")}, éditée par {strong("Ittsui France")}. Elle explique comment
        supprimer définitivement votre compte et ce qu&apos;il advient de vos données.
      </>
    ),
    stepsTitle: "Les étapes, depuis l'application",
    steps: [
      "Ouvrez Ittsui et connectez-vous avec votre compte Google.",
      <>Allez sur votre tableau de bord ({dashboard}).</>,
      <>Descendez en bas de la page et touchez {strong("« Supprimer mon compte »")}.</>,
      "Confirmez. La suppression est immédiate et irréversible.",
    ],
    noAccessTitle: "Si vous n'avez plus accès à l'application",
    noAccess: (
      <>
        Écrivez à {mail("Suppression de mon compte")} depuis l&apos;adresse e-mail associée à votre compte. Votre demande
        est traitée sous 30 jours.
      </>
    ),
    deletedTitle: "Ce qui est supprimé définitivement",
    deleted: [
      "Votre compte et votre identifiant de connexion Google associé à Ittsui.",
      "Votre profil : nom, adresse e-mail, photo de profil Google, code postal, préférences de lieux, jetons de notification.",
      "Votre liste de contacts enregistrés dans Ittsui.",
      "Les rituels où vous étiez seul(e) — par exemple une invitation que personne n'a acceptée — sont effacés entièrement.",
    ],
    keptTitle: "Ce qui est conservé, et pourquoi",
    kept: [
      "Si vous partagiez un rituel avec quelqu'un, ce rituel n'est pas effacé : il passe en statut « annulé », ce qui arrête définitivement toute proposition future. L'autre personne en est informée.",
      "La raison est simple : le droit à l'effacement porte sur vos données personnelles, pas sur l'historique de la relation de l'autre personne, qui lui appartient aussi. Une fois votre profil supprimé, votre identifiant ne subsiste dans ce rituel que sous la forme d'une référence technique inerte, sans nom, sans e-mail et sans photo — il ne permet plus de vous identifier.",
      "Les rendez-vous passés de ce rituel (lieu, date, réponse) sont conservés pour cette même personne. Ils ne contiennent aucune donnée permettant de vous identifier.",
    ],
    retentionTitle: "Délai de conservation",
    retention:
      "La suppression est immédiate, sans période de rétention et sans possibilité de récupération. Des sauvegardes techniques chiffrées peuvent subsister au maximum 30 jours chez notre hébergeur avant rotation automatique ; elles ne sont jamais consultées ni réutilisées.",
    mobileTitle: "Et l'application mobile ?",
    mobile: "Supprimer l'application de votre téléphone ne supprime pas votre compte. Suivez les étapes ci-dessus avant de la désinstaller.",
    seeAlso: (link) => <>Voir aussi notre {link}.</>,
    privacyLabel: "politique de confidentialité",
  },
  en: {
    title: "Delete my account",
    intro: (
      <>
        This page is about the {strong("Ittsui")} app, published by {strong("Ittsui France")}. It explains how to delete your
        account permanently and what happens to your data.
      </>
    ),
    stepsTitle: "The steps, from the app",
    steps: [
      "Open Ittsui and sign in with your Google account.",
      <>Go to your dashboard ({dashboard}).</>,
      <>Scroll to the bottom of the page and tap {strong("“Delete my account”")}.</>,
      "Confirm. Deletion is immediate and can't be undone.",
    ],
    noAccessTitle: "If you no longer have access to the app",
    noAccess: (
      <>
        Write to {mail("Deletion of my account")} from the email address linked to your account. Your request is handled
        within 30 days.
      </>
    ),
    deletedTitle: "What is permanently deleted",
    deleted: [
      "Your account and the Google sign-in identifier linked to Ittsui.",
      "Your profile: name, email address, Google profile photo, postcode, venue preferences, notification tokens.",
      "Your list of contacts saved in Ittsui.",
      "Rituals where you were on your own (for example an invitation nobody accepted) are erased completely.",
    ],
    keptTitle: "What is kept, and why",
    kept: [
      "If you shared a ritual with someone, that ritual isn't erased: it's set to “cancelled”, which permanently stops any future proposal. The other person is told.",
      "The reason is simple: the right to erasure covers your personal data, not the other person's history of the relationship, which also belongs to them. Once your profile is deleted, your identifier remains in that ritual only as an inert technical reference, with no name, no email and no photo: it can no longer identify you.",
      "Past rendez-vous of that ritual (place, date, answer) are kept for that same person. They contain no data that can identify you.",
    ],
    retentionTitle: "Retention period",
    retention:
      "Deletion is immediate, with no retention period and no way to recover anything. Encrypted technical backups may remain for up to 30 days with our host before automatic rotation; they are never accessed or reused.",
    mobileTitle: "And the mobile app?",
    mobile: "Removing the app from your phone doesn't delete your account. Follow the steps above before uninstalling it.",
    seeAlso: (link) => <>See also our {link}.</>,
    privacyLabel: "privacy policy",
  },
  ja: {
    title: "アカウントを削除する",
    intro: (
      <>
        このページは、{strong("Ittsui France")}が提供するアプリ{strong("「Ittsui」")}についての説明です。アカウントを完全に削除する方法と、データがどうなるかを説明します。
      </>
    ),
    stepsTitle: "アプリからの手順",
    steps: [
      "Ittsuiを開き、Googleアカウントでログインします。",
      <>ダッシュボード（{dashboard}）を開きます。</>,
      <>ページの一番下までスクロールし、{strong("「アカウントを削除」")}をタップします。</>,
      "確認します。削除はすぐに行われ、取り消すことはできません。",
    ],
    noAccessTitle: "アプリにアクセスできない場合",
    noAccess: <>アカウントに登録しているメールアドレスから {mail("アカウント削除のお願い")} までご連絡ください。30日以内に対応します。</>,
    deletedTitle: "完全に削除されるもの",
    deleted: [
      "あなたのアカウントと、Ittsuiに紐づいたGoogleのログイン識別子。",
      "あなたのプロフィール：名前、メールアドレス、Googleのプロフィール写真、郵便番号、場所の好み、通知用トークン。",
      "Ittsuiに保存した連絡先のリスト。",
      "あなたひとりだけの習慣（たとえば、誰も承諾しなかった招待）は、すべて消去されます。",
    ],
    keptTitle: "残るもの、その理由",
    kept: [
      "誰かと習慣を共有していた場合、その習慣は消去されず「キャンセル」の状態になり、今後の提案は完全に止まります。相手には通知が届きます。",
      "理由は簡単です。削除の権利の対象はあなたの個人データであって、相手のものでもある関係の履歴ではないからです。プロフィールを削除すると、あなたの識別子はその習慣の中に、名前もメールアドレスも写真もない、使われない技術的な参照としてのみ残り、あなたを特定することはできなくなります。",
      "その習慣の過去の約束（場所、日付、返事）は、相手のために残ります。あなたを特定できるデータは含まれていません。",
    ],
    retentionTitle: "保存期間",
    retention:
      "削除はすぐに行われ、保存期間も復元の手段もありません。暗号化された技術的なバックアップが、自動で入れ替わるまで最大30日間ホスティング事業者のもとに残ることがありますが、閲覧されたり再利用されたりすることはありません。",
    mobileTitle: "モバイルアプリは？",
    mobile: "スマートフォンからアプリを削除しても、アカウントは削除されません。アンインストールする前に、上の手順に従ってください。",
    seeAlso: (link) => <>あわせて{link}もご覧ください。</>,
    privacyLabel: "プライバシーポリシー",
  },
};

export function DeleteAccountView({ lang }: { lang: Locale }) {
  const t = COPY[lang];
  return (
    <LegalShell page="deleteAccount" lang={lang} title={t.title} intro={t.intro}>
      <div className="mt-8">
        <Item title={t.stepsTitle}>
          <ol className="ml-4 list-decimal space-y-1.5">
            {t.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Item>

        <Item title={t.noAccessTitle}>{t.noAccess}</Item>

        <Item title={t.deletedTitle}>
          <ul className="ml-4 list-disc space-y-1.5">
            {t.deleted.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Item>

        <Item title={t.keptTitle}>
          {t.kept.map((paragraph, i) => (
            <p key={paragraph.slice(0, 24)} className={i > 0 ? "mt-3" : undefined}>
              {paragraph}
            </p>
          ))}
        </Item>

        <Item title={t.retentionTitle}>{t.retention}</Item>

        <Item title={t.mobileTitle}>{t.mobile}</Item>
      </div>

      <p className="mt-10 text-sm" style={{ color: MUTED }}>
        {t.seeAlso(
          <Link href={pagePath("privacy", lang)} className="underline underline-offset-4">
            {t.privacyLabel}
          </Link>,
        )}
      </p>
    </LegalShell>
  );
}
