// /app/components/site/PrivacyView.tsx
// /confidentialite, /en/privacy, /ja/privacy.
// A plain-language description of what Ittsui actually stores and why —
// not a legal certification of compliance (that's a determination for
// counsel, not something to assert from a webpage). Written to match what
// the code in this repo actually does today, not aspirational claims.
//
// 2026-10-20: two sections added, in every language. "Résumé d'e-mails"
// for /triage. "Assistance par IA" because the page never said that the
// confirmation text and "Décrire en une phrase" go to Mistral AI (Groq as
// the fallback): see lib/confirmationText.ts and lib/parseMeetingRequest.ts.
// fal.ai (app/api/ai-venue-mood) isn't named: it is dormant (no
// FAL_API_KEY in production) and only ever receives a venue category.
// Also 2026-10-20: who is responsible (the publisher in /mentions-legales),
// which the page never said.

import { ACCENT } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";
import { LegalShell, Item } from "@/app/components/site/LegalShell";

const Mail = () => (
  <a href="mailto:contact@kuchimoto.com" style={{ color: ACCENT }}>
    contact@kuchimoto.com
  </a>
);

type Section = { title: string; body: React.ReactNode };

const COPY: Record<Locale, { title: string; intro: string; sections: Section[] }> = {
  fr: {
    title: "Confidentialité",
    intro:
      "Ce qu'Ittsui enregistre, en clair, et pourquoi. Ceci décrit ce que fait réellement l'application aujourd'hui — ce n'est pas un document juridique.",
    sections: [
      {
        title: "Responsable du traitement",
        body: (
          <>
            Samuel Louissaint, personne physique, 13 rue André Chénier, porte 506, 92260 Fontenay-aux-Roses, France.
            Pour toute question sur vos données : <Mail />.
          </>
        ),
      },
      {
        title: "Connexion",
        body: "Vous vous connectez avec votre compte Google (via Firebase Authentication). Ittsui reçoit votre nom, votre e-mail et votre photo de profil Google — rien d'autre n'est demandé pour se connecter.",
      },
      {
        title: "Abonnement et parrainage",
        body: "Votre essai, votre plan et, si vous passez à Plus, votre abonnement sont gérés par Ittsui et Stripe (le paiement) ; Ittsui ne voit jamais votre carte. Si vous arrivez par le lien d'invitation d'un proche, son code est gardé 30 jours dans un cookie (ittsui_ref), uniquement pour vous offrir à tous les deux le mois de Plus promis.",
      },
      {
        title: "Votre rituel",
        body: "Le prénom de votre proche, son e-mail, le jour et le créneau convenus, vos préférences de lieux et, si vous le renseignez, votre code postal sont stockés pour générer la proposition hebdomadaire. Rien de tout cela n'est utilisé à d'autres fins.",
      },
      {
        title: "Vos contacts et vos demandes de rendez-vous",
        body: "Vous pouvez enregistrer une liste de contacts (nom et e-mail) pour leur envoyer une demande de rendez-vous ponctuelle — un lieu, une adresse, une date et une heure — indépendante du rituel hebdomadaire. Ce n'est pas une messagerie : Ittsui ne stocke aucun échange entre vous, juste le contact que vous avez choisi d'ajouter et le contenu de la demande elle-même (lieu, date, heure, statut accepté/décliné). Un contact reçoit un e-mail uniquement quand vous lui envoyez une demande.",
      },
      {
        title: "Localisation et suggestions de lieux",
        body: (
          <>
            Vous pouvez taper votre code postal vous-même, ou autoriser (facultatif — votre navigateur vous le demande
            explicitement, et rien ne se passe si vous refusez) Ittsui à le détecter automatiquement. Dans ce cas, votre
            position n&apos;est utilisée qu&apos;une fois, dans votre navigateur, pour obtenir votre code postal auprès du
            service officiel de l&apos;État français (api-adresse.data.gouv.fr) — vos coordonnées GPS elles-mêmes ne sont
            jamais envoyées à Ittsui ni stockées ; seul le code postal qui en résulte l&apos;est, exactement comme si vous
            l&apos;aviez tapé.
            <br />
            <br />
            Pour proposer un lieu réel près d&apos;un code postal (dans le formulaire de demande de rendez-vous), votre
            navigateur convertit ce code postal en coordonnées approximatives via ce même service de l&apos;État français,
            puis interroge Photon (photon.komoot.io, un moteur de recherche libre fondé sur les données OpenStreetMap,
            exploité par Komoot en Allemagne) pour trouver des cafés, restaurants, parcs ou musées à proximité. Quand vous
            tapez le nom d&apos;un lieu, ce texte est lui aussi envoyé à Photon pour retrouver le lieu et son adresse. Ni
            le code postal, ni ces coordonnées, ni ce texte ne sont envoyés à Ittsui ni stockés par Ittsui — l&apos;échange
            se fait uniquement entre votre navigateur et ces deux services.
          </>
        ),
      },
      {
        title: "Résumé d'e-mails",
        body: "Quand vous utilisez le résumé d'e-mails, le texte que vous collez et les captures d'écran que vous ajoutez sont lus dans votre navigateur et n'en sortent pas : rien n'est envoyé à Ittsui, rien n'est stocké. Pour lire une capture, votre navigateur télécharge le programme de reconnaissance de texte (Tesseract) et ses fichiers de langue depuis cdn.jsdelivr.net, un réseau public de distribution de fichiers ; votre image, elle, ne quitte pas votre appareil. Si vous choisissez de proposer un rendez-vous repéré dans un e-mail, seul le texte de cet e-mail est repris dans le formulaire de demande, où vous le relisez avant tout envoi.",
      },
      {
        title: "Notifications",
        body: "Si vous les activez, un jeton de notification push (via Firebase Cloud Messaging) ou votre e-mail (via Resend) est utilisé pour vous prévenir d'une proposition ou d'une confirmation. Rien d'autre ne vous est envoyé.",
      },
      {
        title: "Assistance par IA",
        body: "Pour rédiger le message qui confirme un rendez-vous, Ittsui envoie au service d'IA Mistral AI (France) le nom du lieu, le jour, l'heure et le prénom de votre proche ; si Mistral ne répond pas, la même demande part chez Groq (États-Unis). Il en va de même pour le texte que vous tapez quand vous demandez de l'aide pour remplir un formulaire (« Décrire en une phrase », une idée de geste). Ces services traitent la demande pour y répondre ; Ittsui ne leur transmet pas d'autre donnée vous concernant.",
      },
      {
        title: "Ce qu'Ittsui ne fait pas",
        body: "Pas de revente de données, pas de publicité ciblée, pas de traqueurs tiers. Le code de cette application ne contient aucune intégration de ce type.",
      },
      {
        title: "Suppression",
        body: (
          <>
            Décliner une invitation retire votre e-mail — la seule donnée que cette invitation contenait vous concernant,
            puisque vous ne vous étiez jamais connecté(e). Supprimer votre compte (menu du tableau de bord) efface votre
            compte et vos données immédiatement ; si vous étiez lié(e) à quelqu&apos;un, le lien est annulé et cette
            personne est prévenue, mais ses propres données à elle ne sont pas effacées par votre demande —
            l&apos;effacement d&apos;un compte ne donne pas le droit de supprimer les données de quelqu&apos;un d&apos;autre.
            Pour toute autre demande, écrivez à <Mail />.
          </>
        ),
      },
    ],
  },
  en: {
    title: "Privacy",
    intro:
      "What Ittsui records, in plain words, and why. This describes what the app actually does today; it isn't a legal document.",
    sections: [
      {
        title: "Data controller",
        body: (
          <>
            Samuel Louissaint, an individual, 13 rue André Chénier, porte 506, 92260 Fontenay-aux-Roses, France. For
            any question about your data: <Mail />.
          </>
        ),
      },
      {
        title: "Signing in",
        body: "You sign in with your Google account (through Firebase Authentication). Ittsui receives your name, your email address and your Google profile photo; nothing else is asked for to sign in.",
      },
      {
        title: "Subscription and invites",
        body: "Your trial, your plan and, if you go Plus, your subscription are handled by Ittsui and Stripe (payment); Ittsui never sees your card. If you arrive through someone's invite link, their code is kept for 30 days in a cookie (ittsui_ref), only so you both get the month of Plus it promises.",
      },
      {
        title: "Your ritual",
        body: "Your close one's first name and email address, the agreed day and time slot, your venue preferences and, if you enter it, your postcode are stored to generate the weekly proposal. None of it is used for anything else.",
      },
      {
        title: "Your contacts and rendez-vous requests",
        body: "You can keep a list of contacts (name and email address) to send them a one-off rendez-vous request (a place, an address, a date and a time), separate from the weekly ritual. It isn't a messaging service: Ittsui stores no conversation between you, only the contact you chose to add and the request itself (place, date, time, accepted or declined). A contact receives an email only when you send them a request.",
      },
      {
        title: "Location and place suggestions",
        body: (
          <>
            You can type your postcode yourself, or allow Ittsui to detect it (optional: your browser asks you explicitly,
            and nothing happens if you refuse). In that case your position is used only once, in your browser, to get your
            postcode from the French government&apos;s official service (api-adresse.data.gouv.fr). Your GPS coordinates
            themselves are never sent to Ittsui or stored; only the resulting postcode is, exactly as if you had typed it.
            <br />
            <br />
            To suggest a real place near a postcode (in the rendez-vous request form), your browser converts that postcode
            into approximate coordinates through the same government service, then queries Photon (photon.komoot.io, an
            open search engine based on OpenStreetMap data, run by Komoot in Germany) to find cafés, restaurants, parks or
            museums nearby. When you type the name of a place, that text is also sent to Photon to find the place and its
            address. Neither the postcode, nor these coordinates, nor this text are sent to or stored by Ittsui: the
            exchange happens only between your browser and these two services.
          </>
        ),
      },
      {
        title: "Email summary",
        body: "When you use the email summary, the text you paste and the screenshots you add are read in your browser and never leave it: nothing is sent to Ittsui, nothing is stored. To read a screenshot, your browser downloads the text-recognition program (Tesseract) and its language files from cdn.jsdelivr.net, a public file-distribution network; your image itself stays on your device. If you choose to propose a rendez-vous found in an email, only that email's text is copied into the request form, where you review it before anything is sent.",
      },
      {
        title: "Notifications",
        body: "If you turn them on, a push notification token (through Firebase Cloud Messaging) or your email address (through Resend) is used to let you know about a proposal or a confirmation. Nothing else is sent to you.",
      },
      {
        title: "AI assistance",
        body: "To write the message that confirms a rendez-vous, Ittsui sends the AI service Mistral AI (France) the place, the day, the time and your close one's first name; if Mistral doesn't answer, the same request goes to Groq (United States). The same applies to the text you type when you ask for help filling in a form (“Describe it in one sentence”, a gesture idea). These services process the request to answer it; Ittsui sends them no other data about you.",
      },
      {
        title: "What Ittsui doesn't do",
        body: "No selling of data, no targeted advertising, no third-party trackers. The code of this app contains no integration of that kind.",
      },
      {
        title: "Deletion",
        body: (
          <>
            Declining an invitation removes your email address, the only data about you that the invitation held, since
            you had never signed in. Deleting your account (dashboard menu) erases your account and your data immediately;
            if you were linked to someone, the link is cancelled and that person is told, but their own data isn&apos;t
            erased by your request: deleting one account doesn&apos;t give the right to delete someone else&apos;s data.
            For any other request, write to <Mail />.
          </>
        ),
      },
    ],
  },
  ja: {
    title: "プライバシー",
    intro:
      "Ittsuiが何を記録し、なぜそうするのかを、わかりやすく説明します。これは今のアプリが実際にしていることの説明で、法的な文書ではありません。",
    sections: [
      {
        title: "個人情報の管理者",
        body: (
          <>
            Samuel Louissaint（個人）、13 rue André Chénier, porte 506, 92260 Fontenay-aux-Roses, France。データに関するお問い合わせ：
            <Mail />
          </>
        ),
      },
      {
        title: "ログイン",
        body: "Googleアカウントでログインします（Firebase Authentication経由）。Ittsuiが受け取るのは、お名前、メールアドレス、Googleのプロフィール写真だけです。ログインのためにそれ以外の情報を求めることはありません。",
      },
      {
        title: "サブスクリプションと招待",
        body: "お試し期間、プラン、Plusのサブスクリプションは、IttsuiとStripe（決済）が管理します。Ittsuiがカード情報を見ることはありません。大切な人の招待リンクからいらした場合は、約束の1か月分のPlusをおふたりにお届けするためだけに、その招待コードを30日間Cookie（ittsui_ref）に保存します。",
      },
      {
        title: "あなたの習慣",
        body: "毎週の提案をつくるために、大切な人の名前とメールアドレス、決めた曜日と時間帯、場所の好み、そして入力された場合は郵便番号を保存します。これらをほかの目的に使うことはありません。",
      },
      {
        title: "連絡先と約束のリクエスト",
        body: "連絡先（名前とメールアドレス）のリストを保存し、毎週の習慣とは別に、1回だけの約束のリクエスト（場所、住所、日付、時間）を送ることができます。メッセージアプリではありません。Ittsuiはあなたたちのやり取りを一切保存せず、保存するのは、あなたが追加した連絡先と、リクエストの内容（場所、日付、時間、承諾・辞退の状態）だけです。連絡先にメールが届くのは、あなたがリクエストを送ったときだけです。",
      },
      {
        title: "位置情報と場所の提案",
        body: (
          <>
            郵便番号はご自身で入力するか、Ittsuiによる自動検出を許可できます（任意です。ブラウザが明確に許可を求め、拒否しても何も起きません）。その場合、位置情報はブラウザの中で一度だけ使われ、フランス政府の公式サービス（api-adresse.data.gouv.fr）から郵便番号を取得します。GPSの座標そのものがIttsuiに送られたり保存されたりすることはなく、保存されるのは、ご自身で入力した場合と同じく、得られた郵便番号だけです。
            <br />
            <br />
            （約束のリクエスト画面で）郵便番号の近くにある実在の場所を提案するため、ブラウザは同じ政府のサービスで郵便番号をおおよその座標に変換し、Photon（photon.komoot.io。OpenStreetMapのデータを使ったオープンな検索エンジンで、ドイツのKomootが運営）に近くのカフェ、レストラン、公園、美術館を問い合わせます。場所の名前を入力すると、その文字列も場所と住所を探すためにPhotonに送られます。郵便番号、座標、入力した文字列のいずれも、Ittsuiに送られたり保存されたりすることはありません。やり取りは、あなたのブラウザとこの2つのサービスの間だけで行われます。
          </>
        ),
      },
      {
        title: "メールの要約",
        body: "メールの要約を使うとき、貼り付けたテキストや追加したスクリーンショットはブラウザの中で読み取られ、外に出ることはありません。Ittsuiには何も送られず、何も保存されません。スクリーンショットを読み取るために、ブラウザは文字認識プログラム（Tesseract）とその言語ファイルを、公開のファイル配信ネットワークであるcdn.jsdelivr.netからダウンロードします。画像そのものは端末から出ません。メールで見つかった約束を提案することを選んだ場合、そのメールの文面だけがリクエスト画面にコピーされ、送信する前にあなたが確認できます。",
      },
      {
        title: "通知",
        body: "通知をオンにすると、提案や確定をお知らせするために、プッシュ通知用のトークン（Firebase Cloud Messaging経由）またはメールアドレス（Resend経由）が使われます。それ以外のものが送られることはありません。",
      },
      {
        title: "AIによるサポート",
        body: "約束を確定するメッセージを作成するため、IttsuiはAIサービスのMistral AI（フランス）に、場所、曜日、時間、大切な人の名前を送ります。Mistralが応答しない場合は、同じ依頼がGroq（アメリカ）に送られます。入力の手助けを求めたときに入力したテキスト（「ひとことで説明」、贈りもののアイデア）も同様です。これらのサービスは依頼に答えるために処理を行うだけで、Ittsuiがあなたに関するほかのデータを送ることはありません。",
      },
      {
        title: "Ittsuiがしないこと",
        body: "データの販売、ターゲティング広告、第三者のトラッカーはありません。このアプリのコードには、そうした仕組みは一切含まれていません。",
      },
      {
        title: "削除",
        body: (
          <>
            招待を辞退すると、あなたのメールアドレスが削除されます。ログインしたことがない以上、それがその招待に含まれていた、あなたに関する唯一のデータです。アカウントを削除すると（ダッシュボードのメニューから）、アカウントとデータはすぐに消去されます。誰かとつながっていた場合、そのつながりは解除されて相手に通知されますが、相手自身のデータはあなたの依頼では消去されません。自分のアカウントを削除しても、他人のデータを削除する権利は生じないからです。その他のご依頼は、
            <Mail /> までご連絡ください。
          </>
        ),
      },
    ],
  },
};

export function PrivacyView({ lang }: { lang: Locale }) {
  const t = COPY[lang];
  return (
    <LegalShell page="privacy" lang={lang} title={t.title} intro={t.intro}>
      <div className="mt-8">
        {t.sections.map((section) => (
          <Item key={section.title} title={section.title} as="p">
            {section.body}
          </Item>
        ))}
      </div>
    </LegalShell>
  );
}
