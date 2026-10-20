// /lib/triage/samples.ts
// "Essayer avec un exemple" on /triage: fifteen raw inbox rows per
// language, as Gmail gives them when rows are copied (sender, "subject -
// snippet", date, separated by tabs). Fictional senders, so someone who
// keeps their own inbox private still sees what the summary does — and a
// personal inbox rather than an office one, because that is whose inbox
// Ittsui reads: two people proposing to meet, a bank, a landlord, a
// doctor, a school, and the usual noise.

import type { Lang } from "@/lib/triage/engine";

const FR = [
  "Camille\tOn se voit cette semaine ? - Ça fait trop longtemps ! Un café jeudi soir vers Bastille, ça te dit ?\t10:42",
  "Banque Horizon\tPrélèvement rejeté - Votre prélèvement du 18 octobre a été rejeté pour solde insuffisant. Merci de régulariser avant le 25 octobre.\t09:15",
  "Banque Horizon\tVotre code de connexion : 482913 - Ce code expire dans 10 minutes. Ne le communiquez à personne.\t09:02",
  "Cabinet Dr Martin\tRappel : rendez-vous le 28 octobre à 9h30 - Merci de confirmer votre présence ou d'annuler au moins 24 h avant.\t08:51",
  "Agence Immo Lumière\tDocuments à fournir pour votre dossier - Merci de nous transmettre vos trois derniers bulletins de salaire avant le 31 octobre.\t08:30",
  "Réseau Pro\tAlex, vous apparaissez dans 12 recherches cette semaine - Découvrez qui a consulté votre profil et développez votre réseau.\t08:00",
  "Messagerie Pro\tAlerte de sécurité : nouvelle connexion sur Windows - Si c'était vous, aucune action n'est requise.\t07:40",
  "Mode & Co\t-40 % sur toute la collection, dernier jour ! - Profitez des soldes avant minuit. Se désabonner\t06:12",
  "Assurance Atlas\tVotre attestation d'assurance habitation expire le 31 octobre - Pensez à la renouveler pour votre propriétaire.\t18 oct.",
  "Mamie\tDéjeuner dimanche ? - Coucou ! Tu viens déjeuner dimanche midi ? Dis-moi si ça t'arrange.\t18 oct.",
  "Service Cloud\tMise à jour de nos conditions d'utilisation - Les nouvelles conditions entrent en vigueur le 1er décembre.\t16 oct.",
  "Atelier Bois & Co\tCommande n° 10482 confirmée - Merci pour votre commande, la livraison est prévue jeudi.\t16 oct.",
  "École Jules Ferry\tRéunion parents-professeurs - La réunion aura lieu mardi 4 novembre à 18 h. Merci de confirmer votre présence.\t15 oct.",
  "La Lettre Culture\tNewsletter : les 5 expos à voir ce mois-ci - Au sommaire : photographie, design et art contemporain. Se désinscrire\t15 oct.",
  "Emplois Plus\t15 nouvelles offres d'emploi : Développeur React - Postulez dès aujourd'hui aux offres qui correspondent à votre profil.\t15 oct.",
];

const EN = [
  "Jamie\tCoffee this week? - It's been ages! Are you free on Thursday evening for a coffee near Bastille?\t10:42",
  "Horizon Bank\tDirect debit declined - Your direct debit of 18 October was declined due to insufficient funds. Please settle it before 25 October.\t09:15",
  "Horizon Bank\tYour sign-in code: 482913 - This code expires in 10 minutes. Never share it with anyone.\t09:02",
  "Dr Martin's Practice\tReminder: appointment on 28 October at 9:30 - Please confirm or cancel at least 24 hours before.\t08:51",
  "Lumière Lettings\tDocuments needed for your application - Please send us your last three payslips before 31 October.\t08:30",
  "Pro Network\tAlex, you appeared in 12 searches this week - See who viewed your profile and grow your network.\t08:00",
  "Mail Service\tSecurity alert: new sign-in on Windows - If this was you, no action is needed.\t07:40",
  "Style & Co\t40% off everything, last day! - The sale ends at midnight. Unsubscribe\t06:12",
  "Atlas Insurance\tYour home insurance certificate expires on 31 October - Remember to renew it for your landlord.\t18 Oct",
  "Grandma\tSunday lunch? - Hello love! Will you come for lunch on Sunday? Let me know if that works for you.\t18 Oct",
  "Cloud Service\tUpdate to our terms of service - The new terms take effect on 1 December.\t16 Oct",
  "Woodshop & Co\tOrder #10482 confirmed - Thank you for your order, delivery is expected on Thursday.\t16 Oct",
  "Greenwood School\tParent-teacher meeting - The meeting will take place on Tuesday 4 November at 6 pm. Please confirm you can attend.\t15 Oct",
  "Culture Letter\tNewsletter: 5 exhibitions to see this month - In this issue: photography, design and contemporary art. Unsubscribe\t15 Oct",
  "Jobs Plus\t15 new job offers: React developer - Apply today to the offers that match your profile.\t15 Oct",
];

const JA = [
  "美咲\t今週、会えない？ - 久しぶり！木曜の夜、オペラのあたりでお茶しませんか？\t10:42",
  "ホライズン銀行\t口座振替ができませんでした - 10月18日の口座振替は残高不足のためできませんでした。10月25日までにお支払いください。\t09:15",
  "ホライズン銀行\tログイン認証コード：482913 - このコードは10分で無効になります。誰にも教えないでください。\t09:02",
  "マルタン医院\t予約のリマインダー：10月28日 9:30 - ご来院の確認、または24時間前までのキャンセルをお願いします。\t08:51",
  "ルミエール不動産\t入居審査の書類のお願い - 直近3か月分の給与明細を10月31日までにご提出ください。\t08:30",
  "プロネットワーク\tアレックスさん、今週12回検索に表示されました - あなたのプロフィールを見た人をチェックしましょう。\t08:00",
  "メールサービス\tセキュリティ通知：Windowsで新しいログイン - ご本人による操作であれば、対応は不要です。\t07:40",
  "スタイル&Co\t全品40%オフ、本日最終日！ - セールは今夜0時まで。配信停止はこちら\t06:12",
  "アトラス保険\t火災保険の証明書の有効期限：10月31日 - 大家さんのために、更新をお忘れなく。\t10月18日",
  "おばあちゃん\t日曜日、お昼ごはんに来ない？ - 日曜のお昼、うちで一緒に食べましょう。都合を教えてね。\t10月18日",
  "クラウドサービス\t利用規約改定のお知らせ - 新しい規約は12月1日から適用されます。\t10月16日",
  "木工房&Co\tご注文（10482）を承りました - ご注文ありがとうございます。お届けは木曜日の予定です。\t10月16日",
  "グリーンウッド学院\t保護者面談のご案内 - 11月4日（火）18時から行います。出欠をご連絡ください。\t10月15日",
  "カルチャーレター\tメルマガ：今月見るべき展覧会5選 - 今号の内容：写真、デザイン、現代アート。配信停止\t10月15日",
  "ジョブズプラス\t新着求人15件：Reactエンジニア - あなたのプロフィールに合う求人に、今すぐ応募しましょう。\t10月15日",
];

export const SAMPLE_INBOX: Record<Lang, string> = { fr: FR.join("\n"), en: EN.join("\n"), ja: JA.join("\n") };
