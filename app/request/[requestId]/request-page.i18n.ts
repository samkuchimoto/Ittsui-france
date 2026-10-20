// /app/request/[requestId]/request-page.i18n.ts — English and Japanese for
// the page a meeting request's recipient opens (see lib/translate.ts). The
// last keys are /api/meeting-requests' own error messages.

import type { Catalog } from "@/lib/translate";

export const REQUEST_PAGE: Catalog = {
  en: {
    Café: "Café",
    Restaurant: "Restaurant",
    Parc: "Park",
    Musée: "Museum",
    "Chez vous": "At home",
    "{date} à {time}": "{date} at {time}",
    "Une erreur est survenue.": "Something went wrong.",
    "Échec de la connexion.": "Sign-in failed.",
    "Rendez-vous confirmé via Ittsui.": "Rendez-vous confirmed through Ittsui.",
    "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles.":
      "This is taking longer than expected. Public or work wifi sometimes blocks the connection to Google: try mobile data.",
    Réessayer: "Try again",
    "Demande introuvable": "Request not found",
    "Ce lien n'est plus valide, ou n'a jamais existé.": "This link is no longer valid, or never existed.",
    "Rendez-vous confirmé": "Rendez-vous confirmed",
    "✓ Calé sur l'agenda": "✓ In the calendar",
    "⚠ Réservation requise": "⚠ Booking needed",
    "{venue} n'a pas été réservé pour vous — pensez à appeler ou réserver directement.":
      "{venue} hasn't been booked for you. Remember to call or book directly.",
    "Vous recevrez un e-mail de confirmation. L'autre personne a été notifiée.":
      "You'll get a confirmation email. The other person has been told.",
    "Ajouter à mon agenda": "Add to my calendar",
    "Aller au tableau de bord": "Go to the dashboard",
    "Proposer un rendez-vous à quelqu'un d'autre": "Propose a rendez-vous to someone else",
    "Demande déclinée": "Request declined",
    "Aucune donnée n'a été conservée. Rien d'autre à faire.": "No data was kept. Nothing else to do.",
    "{name} vous invite à un rendez-vous": "{name} is inviting you to a rendez-vous",
    "Vous avez reçu une demande de rendez-vous": "You've received a rendez-vous request",
    "Pas une appli de rencontre : quelqu'un que vous connaissez vous propose un lieu, une date et une heure via Ittsui, un outil de maintien relationnel.":
      "Not a dating app: someone you know is proposing a place, a date and a time through Ittsui, a tool for keeping in touch.",
    ". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu la demande.":
      ". You're signed in with the wrong Google account: sign in again with the one that received the request.",
    "Oui, je viens": "Yes, I'm coming",
    "Pas disponible": "Not available",
    "Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à l'accepter.":
      "One step to confirm: signing in with Google is all it takes to accept.",
    "Connexion...": "Signing in…",
    "Se connecter avec un autre compte": "Sign in with another account",
    "J'accepte": "I accept",
    "Via Google, juste pour vérifier que c'est bien vous.": "With Google, just to check it's really you.",
    "champs manquants": "Some details are missing",
    "demande introuvable": "Request not found",
    "connexion requise": "Sign-in required",
    "cette demande a déjà été traitée": "This request has already been answered",
    "cette demande a expiré": "This request has expired",
    "cette demande ne correspond pas à votre compte": "This request doesn't match your account",
  },
  ja: {
    Café: "カフェ",
    Restaurant: "レストラン",
    Parc: "公園",
    Musée: "美術館",
    "Chez vous": "自宅",
    "{date} à {time}": "{date} {time}",
    "Une erreur est survenue.": "エラーが発生しました。",
    "Échec de la connexion.": "ログインできませんでした。",
    "Rendez-vous confirmé via Ittsui.": "Ittsuiで確定した約束です。",
    "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles.":
      "思ったより時間がかかっています。公共や職場のWi-Fiでは、Googleへの接続がブロックされることがあります。モバイルデータでお試しください。",
    Réessayer: "もう一度試す",
    "Demande introuvable": "リクエストが見つかりません",
    "Ce lien n'est plus valide, ou n'a jamais existé.": "このリンクは無効になったか、存在しません。",
    "Rendez-vous confirmé": "約束が確定しました",
    "✓ Calé sur l'agenda": "✓ 予定に入りました",
    "⚠ Réservation requise": "⚠ 予約が必要です",
    "{venue} n'a pas été réservé pour vous — pensez à appeler ou réserver directement.":
      "{venue}の予約はまだです。直接電話するか、予約してください。",
    "Vous recevrez un e-mail de confirmation. L'autre personne a été notifiée.":
      "確認メールが届きます。相手にもお知らせしました。",
    "Ajouter à mon agenda": "カレンダーに追加",
    "Aller au tableau de bord": "ダッシュボードへ",
    "Proposer un rendez-vous à quelqu'un d'autre": "ほかの人に約束を提案する",
    "Demande déclinée": "リクエストを辞退しました",
    "Aucune donnée n'a été conservée. Rien d'autre à faire.": "データは保存されていません。ほかに必要な操作はありません。",
    "{name} vous invite à un rendez-vous": "{name}さんから約束のお誘いです",
    "Vous avez reçu une demande de rendez-vous": "約束のリクエストが届きました",
    "Pas une appli de rencontre : quelqu'un que vous connaissez vous propose un lieu, une date et une heure via Ittsui, un outil de maintien relationnel.":
      "出会い系アプリではありません。お知り合いの方が、つながりを保つためのツールIttsuiで、場所と日時を提案しています。",
    ". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu la demande.":
      "。別のGoogleアカウントでログインしています。リクエストを受け取ったアカウントでログインし直してください。",
    "Oui, je viens": "はい、行きます",
    "Pas disponible": "都合が合いません",
    "Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à l'accepter.":
      "確認はワンステップ：Googleでログインするだけで承諾できます。",
    "Connexion...": "ログイン中…",
    "Se connecter avec un autre compte": "別のアカウントでログイン",
    "J'accepte": "承諾する",
    "Via Google, juste pour vérifier que c'est bien vous.": "Googleでログインします。ご本人の確認のためだけです。",
    "champs manquants": "必要な情報が足りません",
    "demande introuvable": "リクエストが見つかりません",
    "connexion requise": "ログインが必要です",
    "cette demande a déjà été traitée": "このリクエストはすでに回答済みです",
    "cette demande a expiré": "このリクエストは期限切れです",
    "cette demande ne correspond pas à votre compte": "このリクエストは、お使いのアカウント宛てではありません",
  },
};
