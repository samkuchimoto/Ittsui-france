// /app/invite/[pairId]/invite.i18n.ts — English and Japanese for the page
// an invited partner opens (see lib/translate.ts). The last keys are
// /api/activate-pending-pair's own error messages.

import type { Catalog } from "@/lib/translate";

export const INVITE: Catalog = {
  en: {
    "Une erreur est survenue.": "Something went wrong.",
    "Échec de la connexion.": "Sign-in failed.",
    "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles.":
      "This is taking longer than expected. Public or work wifi sometimes blocks the connection to Google: try mobile data.",
    Réessayer: "Try again",
    "Vous êtes lié(e) à {name}": "You're now linked with {name}",
    "Vous êtes lié(e) à cette personne": "You're now linked with this person",
    "Rendez-vous chaque {day}, vers {time}. La première proposition arrive automatiquement, sans rien à faire d'ici là.":
      "A rendez-vous every {day}, around {time}. The first proposal arrives on its own, with nothing to do until then.",
    "Aller au tableau de bord": "Go to the dashboard",
    "Faire pareil avec quelqu'un d'autre": "Do the same with someone else",
    "Invitation déclinée": "Invitation declined",
    "Aucune donnée n'a été conservée. Rien d'autre à faire.": "No data was kept. Nothing else to do.",
    "Décliner l'invitation ?": "Decline the invitation?",
    "Vous ne serez pas lié(e) et vos informations seront supprimées.":
      "You won't be linked, and your details will be deleted.",
    Décliner: "Decline",
    "Vous avez été invité(e) sur Ittsui": "You've been invited to Ittsui",
    "Pas une appli de rencontre : un rendez-vous protégé, une fois par semaine, avec la personne qui vous a envoyé ce lien — une proposition, validable en un geste, sans agenda à gérer.":
      "Not a dating app: a protected rendez-vous, once a week, with the person who sent you this link. One proposal, confirmed in one tap, no calendar to manage.",
    "Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à activer le lien.":
      "One step to confirm: signing in with Google is all it takes to activate the link.",
    ". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu l'invitation.":
      ". You're signed in with the wrong Google account: sign in again with the one that received the invitation.",
    "Connexion...": "Signing in…",
    "Se connecter avec un autre compte": "Sign in with another account",
    "Je viens": "I'm in",
    "Via Google, juste pour vérifier que c'est bien vous.": "With Google, just to check it's really you.",
    "champs manquants": "Some details are missing",
    "invitation introuvable": "Invitation not found",
    "cette invitation n'est plus valide — une invitation plus récente a peut-être été envoyée":
      "This invitation is no longer valid. A newer one may have been sent",
    "invitation déjà traitée": "This invitation has already been answered",
    "invitation expirée": "This invitation has expired",
    "cette invitation ne correspond pas à votre compte": "This invitation doesn't match your account",
  },
  ja: {
    "Une erreur est survenue.": "エラーが発生しました。",
    "Échec de la connexion.": "ログインできませんでした。",
    "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles.":
      "思ったより時間がかかっています。公共や職場のWi-Fiでは、Googleへの接続がブロックされることがあります。モバイルデータでお試しください。",
    Réessayer: "もう一度試す",
    "Vous êtes lié(e) à {name}": "{name}さんとつながりました",
    "Vous êtes lié(e) à cette personne": "相手の方とつながりました",
    "Rendez-vous chaque {day}, vers {time}. La première proposition arrive automatiquement, sans rien à faire d'ici là.":
      "毎週{day}、{time}ごろに約束。最初の提案は自動で届くので、それまで何もする必要はありません。",
    "Aller au tableau de bord": "ダッシュボードへ",
    "Faire pareil avec quelqu'un d'autre": "ほかの人とも同じようにつながる",
    "Invitation déclinée": "招待を辞退しました",
    "Aucune donnée n'a été conservée. Rien d'autre à faire.": "データは保存されていません。ほかに必要な操作はありません。",
    "Décliner l'invitation ?": "招待を辞退しますか？",
    "Vous ne serez pas lié(e) et vos informations seront supprimées.": "つながりは作られず、あなたの情報は削除されます。",
    Décliner: "辞退する",
    "Vous avez été invité(e) sur Ittsui": "Ittsuiに招待されました",
    "Pas une appli de rencontre : un rendez-vous protégé, une fois par semaine, avec la personne qui vous a envoyé ce lien — une proposition, validable en un geste, sans agenda à gérer.":
      "出会い系アプリではありません。このリンクを送ってくれた方と、週に一度の約束を守るためのものです。提案はひとつ、ワンタップで確定、予定の調整は不要です。",
    "Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à activer le lien.":
      "確認はワンステップ：Googleでログインするだけで、つながりが有効になります。",
    ". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu l'invitation.":
      "。別のGoogleアカウントでログインしています。招待を受け取ったアカウントでログインし直してください。",
    "Connexion...": "ログイン中…",
    "Se connecter avec un autre compte": "別のアカウントでログイン",
    "Je viens": "参加する",
    "Via Google, juste pour vérifier que c'est bien vous.": "Googleでログインします。ご本人の確認のためだけです。",
    "champs manquants": "必要な情報が足りません",
    "invitation introuvable": "招待が見つかりません",
    "cette invitation n'est plus valide — une invitation plus récente a peut-être été envoyée":
      "この招待は無効になりました。新しい招待が送られている可能性があります",
    "invitation déjà traitée": "この招待はすでに回答済みです",
    "invitation expirée": "招待の期限が切れています",
    "cette invitation ne correspond pas à votre compte": "この招待は、お使いのアカウント宛てではありません",
  },
};
