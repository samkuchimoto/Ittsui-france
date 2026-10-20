// /lib/emails.i18n.ts — English and Japanese for what the server sends:
// invitation and request emails, confirmations, the weekly notification
// subject (see lib/translate.ts). Each message goes out in the language of
// the person who started it (Pair.lang, MeetingRequest.lang); French, and
// anything sent before those fields existed, reads exactly as it did.
// Values in {link}/{end} are HTML built by the route itself.

import type { Catalog } from "@/lib/translate";

export const EMAILS: Catalog = {
  en: {
    // invite-partner
    hebdomadaire: "weekly",
    mensuel: "monthly",
    annuel: "yearly",
    "{inviter} vous invite sur Ittsui": "{inviter} is inviting you to Ittsui",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous sur Ittsui.":
      "{inviter} has suggested keeping a {adj} rendez-vous with you on Ittsui.",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous.":
      "{inviter} has suggested keeping a {adj} rendez-vous with you.",
    "Pour l'activer, connectez-vous ici : {url}": "To activate it, sign in here: {url}",
    "Si vous ne souhaitez pas être lié, ignorez ce message ou déclinez ici : {url}":
      "If you'd rather not be linked, ignore this email or decline here: {url}",
    "Cette invitation expire dans {n} jours.": "This invitation expires in {n} days.",
    "Activer l&rsquo;invitation": "Activate the invitation",
    "Si vous ne souhaitez pas être lié(e), {link}déclinez ici{end}.":
      "If you'd rather not be linked, {link}decline here{end}.",
    "Invitation envoyée à {name}": "Invitation sent to {name}",
    "Votre invitation à {name} ({email}) a été envoyée. Vous serez notifié(e) dès que la connexion est active.":
      "Your invitation to {name} ({email}) has been sent. We'll let you know as soon as the link is active.",
    "Votre invitation à {name} est prête — envoyez-lui le lien vous-même par SMS ou WhatsApp depuis l'écran de suivi. Vous serez notifié(e) dès que la connexion est active.":
      "Your invitation to {name} is ready: send them the link yourself by text or WhatsApp from the tracking screen. We'll let you know as soon as the link is active.",
    // activate-pending-pair
    "{name} a décliné l'invitation.": "{name} declined the invitation.",
    "La personne invitée a décliné l'invitation.": "The person you invited declined the invitation.",
    "{name} a rejoint Ittsui. Le lien est actif.": "{name} has joined Ittsui. The link is active.",
    "Votre invité(e) a rejoint Ittsui. Le lien est actif.": "The person you invited has joined Ittsui. The link is active.",
    "Mise à jour de votre invitation": "An update on your invitation",
    // meeting-requests/create
    "Quelqu'un sur Ittsui": "Someone on Ittsui",
    "{venue} avec {sender} — Ittsui": "{venue} with {sender} (Ittsui)",
    "Proposition de rendez-vous via Ittsui. Répondre ici : {url}": "Rendez-vous proposed through Ittsui. Answer here: {url}",
    "{sender} vous propose un rendez-vous sur Ittsui": "{sender} is proposing a rendez-vous on Ittsui",
    "{sender} vous propose de vous retrouver :": "{sender} is suggesting you meet:",
    "Lieu : {venue} ({address})": "Place: {venue} ({address})",
    "Date : {date} à {time}": "Date: {date} at {time}",
    "Pour accepter ou décliner, connectez-vous ici : {url}": "To accept or decline, sign in here: {url}",
    "Ajouter à Google Agenda (dès maintenant, avant même de répondre) : {url}":
      "Add to Google Calendar (right now, even before you answer): {url}",
    "Cette demande expire dans {n} jours.": "This request expires in {n} days.",
    "{sender} vous propose un rendez-vous": "{sender} is proposing a rendez-vous",
    "{date} à {time}": "{date} at {time}",
    "Accepter ou décliner": "Accept or decline",
    "Ajouter à Google Agenda": "Add to Google Calendar",
    "(dès maintenant, avant même de répondre)": "(right now, even before you answer)",
    // meeting-requests/respond, rsvp
    "Rendez-vous confirmé via Ittsui.": "Rendez-vous confirmed through Ittsui.",
    "Rendez-vous confirmé :": "Rendez-vous confirmed:",
    "{venue} ({address}), le {date} à {time}.": "{venue} ({address}), on {date} at {time}.",
    "Ajouter à Google Agenda : {url}": "Add to Google Calendar: {url}",
    "Votre demande de rendez-vous a été acceptée": "Your rendez-vous request was accepted",
    "{name} a accepté.": "{name} accepted.",
    "Rendez-vous confirmé sur Ittsui": "Rendez-vous confirmed on Ittsui",
    "Rendez-vous verrouillé : {venue}.": "Rendez-vous locked in: {venue}.",
    "Votre demande de rendez-vous a été déclinée": "Your rendez-vous request was declined",
    "{name} a décliné votre demande pour {venue}, le {date} à {time}.":
      "{name} declined your request for {venue}, on {date} at {time}.",
    "La personne invitée a décliné votre demande pour {venue}, le {date} à {time}.":
      "The person you invited declined your request for {venue}, on {date} at {time}.",
    // notify, user/delete
    "Votre rendez-vous de la semaine": "Your rendez-vous this week",
    "Votre rendez-vous du mois": "Your rendez-vous this month",
    "Votre rendez-vous de l'année": "Your rendez-vous this year",
    "Le rituel Ittsui avec cette personne a été annulé.": "The Ittsui ritual with this person has been cancelled.",
  },
  ja: {
    hebdomadaire: "毎週",
    mensuel: "毎月",
    annuel: "毎年",
    "{inviter} vous invite sur Ittsui": "{inviter}さんからIttsuiへの招待が届きました",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous sur Ittsui.":
      "{inviter}さんが、Ittsuiであなたとの{adj}の約束を提案しています。",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous.": "{inviter}さんが、あなたとの{adj}の約束を提案しています。",
    "Pour l'activer, connectez-vous ici : {url}": "有効にするには、こちらからログインしてください：{url}",
    "Si vous ne souhaitez pas être lié, ignorez ce message ou déclinez ici : {url}":
      "つながりを希望しない場合は、このメールを無視するか、こちらから辞退してください：{url}",
    "Cette invitation expire dans {n} jours.": "この招待は{n}日後に期限切れになります。",
    "Activer l&rsquo;invitation": "招待を有効にする",
    "Si vous ne souhaitez pas être lié(e), {link}déclinez ici{end}.":
      "つながりを希望しない場合は、{link}こちらから辞退{end}してください。",
    "Invitation envoyée à {name}": "{name}さんに招待を送りました",
    "Votre invitation à {name} ({email}) a été envoyée. Vous serez notifié(e) dès que la connexion est active.":
      "{name}さん（{email}）への招待を送りました。つながりが有効になったらお知らせします。",
    "Votre invitation à {name} est prête — envoyez-lui le lien vous-même par SMS ou WhatsApp depuis l'écran de suivi. Vous serez notifié(e) dès que la connexion est active.":
      "{name}さんへの招待の準備ができました。確認画面から、SMSやWhatsAppでリンクを送ってください。つながりが有効になったらお知らせします。",
    "{name} a décliné l'invitation.": "{name}さんが招待を辞退しました。",
    "La personne invitée a décliné l'invitation.": "招待した方が辞退しました。",
    "{name} a rejoint Ittsui. Le lien est actif.": "{name}さんがIttsuiに参加しました。つながりが有効になりました。",
    "Votre invité(e) a rejoint Ittsui. Le lien est actif.": "招待した方がIttsuiに参加しました。つながりが有効になりました。",
    "Mise à jour de votre invitation": "招待についてのお知らせ",
    "Quelqu'un sur Ittsui": "Ittsuiのユーザー",
    "{venue} avec {sender} — Ittsui": "{sender}さんと{venue}（Ittsui）",
    "Proposition de rendez-vous via Ittsui. Répondre ici : {url}": "Ittsuiで届いた約束の提案です。返事はこちら：{url}",
    "{sender} vous propose un rendez-vous sur Ittsui": "{sender}さんからIttsuiで約束の提案が届きました",
    "{sender} vous propose de vous retrouver :": "{sender}さんから、会う提案が届いています：",
    "Lieu : {venue} ({address})": "場所：{venue}（{address}）",
    "Date : {date} à {time}": "日時：{date} {time}",
    "Pour accepter ou décliner, connectez-vous ici : {url}": "承諾・辞退はこちらから（ログインが必要です）：{url}",
    "Ajouter à Google Agenda (dès maintenant, avant même de répondre) : {url}":
      "Googleカレンダーに追加（返事の前でも追加できます）：{url}",
    "Cette demande expire dans {n} jours.": "このリクエストは{n}日後に期限切れになります。",
    "{sender} vous propose un rendez-vous": "{sender}さんから約束の提案です",
    "{date} à {time}": "{date} {time}",
    "Accepter ou décliner": "承諾・辞退する",
    "Ajouter à Google Agenda": "Googleカレンダーに追加",
    "(dès maintenant, avant même de répondre)": "（返事の前でも追加できます）",
    "Rendez-vous confirmé via Ittsui.": "Ittsuiで確定した約束です。",
    "Rendez-vous confirmé :": "約束が確定しました：",
    "{venue} ({address}), le {date} à {time}.": "{venue}（{address}）、{date} {time}。",
    "Ajouter à Google Agenda : {url}": "Googleカレンダーに追加：{url}",
    "Votre demande de rendez-vous a été acceptée": "約束のリクエストが承諾されました",
    "{name} a accepté.": "{name}さんが承諾しました。",
    "Rendez-vous confirmé sur Ittsui": "Ittsuiで約束が確定しました",
    "Rendez-vous verrouillé : {venue}.": "約束が確定しました：{venue}。",
    "Votre demande de rendez-vous a été déclinée": "約束のリクエストが辞退されました",
    "{name} a décliné votre demande pour {venue}, le {date} à {time}.":
      "{name}さんが、{date} {time}の{venue}でのリクエストを辞退しました。",
    "La personne invitée a décliné votre demande pour {venue}, le {date} à {time}.":
      "招待した方が、{date} {time}の{venue}でのリクエストを辞退しました。",
    "Votre rendez-vous de la semaine": "今週の約束",
    "Votre rendez-vous du mois": "今月の約束",
    "Votre rendez-vous de l'année": "今年の約束",
    "Le rituel Ittsui avec cette personne a été annulé.": "この方とのIttsuiの約束は取り消されました。",
  },
};
