// /lib/emails.i18n.ts — English and Japanese for what the server sends:
// invitation and request emails, confirmations, the weekly notification
// subject (see lib/translate.ts). Each message goes out in the language of
// the person who started it (Pair.lang, MeetingRequest.lang); French, and
// anything sent before those fields existed, reads exactly as it did.
// Values in {link}/{end} are HTML built by the route itself.

import type { Catalog } from "@/lib/translate";

export const EMAILS: Catalog = {
  en: {
    // The partner pilot (lib/partnerPilot.ts)
    "Partenaire Ittsui : {perk}": "Ittsui partner: {perk}",
    "Partenaire Ittsui : {perk}, pour vous deux.": "Ittsui partner: {perk}, for both of you.",
    "Code à montrer au comptoir : {code}": "Code to show at the counter: {code}",
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
    // The partner pilot (lib/partnerPilot.ts)
    "Partenaire Ittsui : {perk}": "Ittsuiパートナー：{perk}",
    "Partenaire Ittsui : {perk}, pour vous deux.": "Ittsuiパートナー：{perk}（おふたりに）",
    "Code à montrer au comptoir : {code}": "お店で提示するコード：{code}",
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
  es: {
    "Partenaire Ittsui : {perk}": "Aliado de Ittsui: {perk}",
    "Partenaire Ittsui : {perk}, pour vous deux.": "Aliado de Ittsui: {perk}, para los dos.",
    "Code à montrer au comptoir : {code}": "Código para mostrar en caja: {code}",
    hebdomadaire: "semanal",
    mensuel: "mensual",
    annuel: "anual",
    "{inviter} vous invite sur Ittsui": "{inviter} te invita a Ittsui",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous sur Ittsui.":
      "{inviter} te propone un encuentro {adj} en Ittsui.",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous.": "{inviter} te propone un encuentro {adj}.",
    "Pour l'activer, connectez-vous ici : {url}": "Para activarlo, inicia sesión aquí: {url}",
    "Si vous ne souhaitez pas être lié, ignorez ce message ou déclinez ici : {url}":
      "Si prefieres no vincularte, ignora este correo o rechaza aquí: {url}",
    "Cette invitation expire dans {n} jours.": "Esta invitación vence en {n} días.",
    "Activer l&rsquo;invitation": "Activar la invitación",
    "Si vous ne souhaitez pas être lié(e), {link}déclinez ici{end}.":
      "Si prefieres no vincularte, {link}rechaza aquí{end}.",
    "Invitation envoyée à {name}": "Invitación enviada a {name}",
    "Votre invitation à {name} ({email}) a été envoyée. Vous serez notifié(e) dès que la connexion est active.":
      "Tu invitación a {name} ({email}) fue enviada. Te avisaremos en cuanto el vínculo esté activo.",
    "Votre invitation à {name} est prête — envoyez-lui le lien vous-même par SMS ou WhatsApp depuis l'écran de suivi. Vous serez notifié(e) dès que la connexion est active.":
      "Tu invitación a {name} está lista: envíale tú el enlace por SMS o WhatsApp desde la pantalla de seguimiento. Te avisaremos en cuanto el vínculo esté activo.",
    "{name} a décliné l'invitation.": "{name} rechazó la invitación.",
    "La personne invitée a décliné l'invitation.": "La persona que invitaste rechazó la invitación.",
    "{name} a rejoint Ittsui. Le lien est actif.": "{name} se unió a Ittsui. El vínculo está activo.",
    "Votre invité(e) a rejoint Ittsui. Le lien est actif.":
      "La persona que invitaste se unió a Ittsui. El vínculo está activo.",
    "Mise à jour de votre invitation": "Novedades de tu invitación",
    "Quelqu'un sur Ittsui": "Alguien en Ittsui",
    "{venue} avec {sender} — Ittsui": "{venue} con {sender} (Ittsui)",
    "Proposition de rendez-vous via Ittsui. Répondre ici : {url}":
      "Encuentro propuesto con Ittsui. Responde aquí: {url}",
    "{sender} vous propose un rendez-vous sur Ittsui": "{sender} te propone un encuentro en Ittsui",
    "{sender} vous propose de vous retrouver :": "{sender} te propone verse:",
    "Lieu : {venue} ({address})": "Lugar: {venue} ({address})",
    "Date : {date} à {time}": "Fecha: {date} a las {time}",
    "Pour accepter ou décliner, connectez-vous ici : {url}": "Para aceptar o rechazar, inicia sesión aquí: {url}",
    "Ajouter à Google Agenda (dès maintenant, avant même de répondre) : {url}":
      "Agregar a Google Calendar (ya mismo, incluso antes de responder): {url}",
    "Cette demande expire dans {n} jours.": "Esta solicitud vence en {n} días.",
    "{sender} vous propose un rendez-vous": "{sender} te propone un encuentro",
    "{date} à {time}": "{date} a las {time}",
    "Accepter ou décliner": "Aceptar o rechazar",
    "Ajouter à Google Agenda": "Agregar a Google Calendar",
    "(dès maintenant, avant même de répondre)": "(ya mismo, incluso antes de responder)",
    "Rendez-vous confirmé via Ittsui.": "Encuentro confirmado con Ittsui.",
    "Rendez-vous confirmé :": "Encuentro confirmado:",
    "{venue} ({address}), le {date} à {time}.": "{venue} ({address}), el {date} a las {time}.",
    "Ajouter à Google Agenda : {url}": "Agregar a Google Calendar: {url}",
    "Votre demande de rendez-vous a été acceptée": "Aceptaron tu solicitud de encuentro",
    "{name} a accepté.": "{name} aceptó.",
    "Rendez-vous confirmé sur Ittsui": "Encuentro confirmado en Ittsui",
    "Rendez-vous verrouillé : {venue}.": "Encuentro confirmado: {venue}.",
    "Votre demande de rendez-vous a été déclinée": "Rechazaron tu solicitud de encuentro",
    "{name} a décliné votre demande pour {venue}, le {date} à {time}.":
      "{name} rechazó tu solicitud para {venue}, el {date} a las {time}.",
    "La personne invitée a décliné votre demande pour {venue}, le {date} à {time}.":
      "La persona que invitaste rechazó tu solicitud para {venue}, el {date} a las {time}.",
    "Votre rendez-vous de la semaine": "Tu encuentro de esta semana",
    "Votre rendez-vous du mois": "Tu encuentro de este mes",
    "Votre rendez-vous de l'année": "Tu encuentro de este año",
    "Le rituel Ittsui avec cette personne a été annulé.": "Se canceló el ritual de Ittsui con esta persona.",
  },
  he: {
    "Partenaire Ittsui : {perk}": "שותף של Ittsui: {perk}",
    "Partenaire Ittsui : {perk}, pour vous deux.": "שותף של Ittsui: {perk}, לשניכם.",
    "Code à montrer au comptoir : {code}": "קוד להצגה בקופה: {code}",
    hebdomadaire: "שבועי",
    mensuel: "חודשי",
    annuel: "שנתי",
    "{inviter} vous invite sur Ittsui": "הזמנה מ-{inviter} ל-Ittsui",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous sur Ittsui.":
      "הצעה מ-{inviter}: מפגש {adj} קבוע איתך ב-Ittsui.",
    "{inviter} a proposé de protéger un rendez-vous {adj} avec vous.": "הצעה מ-{inviter}: מפגש {adj} קבוע איתך.",
    "Pour l'activer, connectez-vous ici : {url}": "כדי להפעיל, אפשר להתחבר כאן: {url}",
    "Si vous ne souhaitez pas être lié, ignorez ce message ou déclinez ici : {url}":
      "אם מעדיפים לא להתחבר, אפשר להתעלם מהאימייל הזה או לסרב כאן: {url}",
    "Cette invitation expire dans {n} jours.": "ההזמנה הזו תפוג בעוד {n} ימים.",
    "Activer l&rsquo;invitation": "הפעלת ההזמנה",
    "Si vous ne souhaitez pas être lié(e), {link}déclinez ici{end}.": "אם מעדיפים לא להתחבר, {link}אפשר לסרב כאן{end}.",
    "Invitation envoyée à {name}": "ההזמנה נשלחה אל {name}",
    "Votre invitation à {name} ({email}) a été envoyée. Vous serez notifié(e) dès que la connexion est active.":
      "ההזמנה שלך אל {name} ({email}) נשלחה. נעדכן ברגע שהחיבור יהיה פעיל.",
    "Votre invitation à {name} est prête — envoyez-lui le lien vous-même par SMS ou WhatsApp depuis l'écran de suivi. Vous serez notifié(e) dès que la connexion est active.":
      "ההזמנה שלך אל {name} מוכנה: צריך לשלוח את הקישור בעצמך ב-SMS או ב-WhatsApp ממסך המעקב. נעדכן ברגע שהחיבור יהיה פעיל.",
    "{name} a décliné l'invitation.": "ההזמנה ל-{name} נדחתה.",
    "La personne invitée a décliné l'invitation.": "ההזמנה נדחתה.",
    "{name} a rejoint Ittsui. Le lien est actif.": "{name} ב-Ittsui עכשיו. החיבור פעיל.",
    "Votre invité(e) a rejoint Ittsui. Le lien est actif.": "האדם שהזמנת הצטרף ל-Ittsui. החיבור פעיל.",
    "Mise à jour de votre invitation": "עדכון לגבי ההזמנה שלך",
    "Quelqu'un sur Ittsui": "מישהו ב-Ittsui",
    "{venue} avec {sender} — Ittsui": "{venue} עם {sender} (Ittsui)",
    "Proposition de rendez-vous via Ittsui. Répondre ici : {url}": "מפגש שהוצע דרך Ittsui. לתשובה: {url}",
    "{sender} vous propose un rendez-vous sur Ittsui": "הצעה למפגש מ-{sender} ב-Ittsui",
    "{sender} vous propose de vous retrouver :": "ההצעה של {sender}:",
    "Lieu : {venue} ({address})": "מקום: {venue} ({address})",
    "Date : {date} à {time}": "תאריך: {date} בשעה {time}",
    "Pour accepter ou décliner, connectez-vous ici : {url}": "כדי לאשר או לסרב, אפשר להתחבר כאן: {url}",
    "Ajouter à Google Agenda (dès maintenant, avant même de répondre) : {url}":
      "הוספה ליומן Google (כבר עכשיו, עוד לפני התשובה): {url}",
    "Cette demande expire dans {n} jours.": "הבקשה הזו תפוג בעוד {n} ימים.",
    "{sender} vous propose un rendez-vous": "הצעה למפגש מ-{sender}",
    "{date} à {time}": "{date} בשעה {time}",
    "Accepter ou décliner": "אישור או סירוב",
    "Ajouter à Google Agenda": "הוספה ליומן Google",
    "(dès maintenant, avant même de répondre)": "(כבר עכשיו, עוד לפני התשובה)",
    "Rendez-vous confirmé via Ittsui.": "המפגש אושר דרך Ittsui.",
    "Rendez-vous confirmé :": "המפגש אושר:",
    "{venue} ({address}), le {date} à {time}.": "{venue} ({address}), ב{date} בשעה {time}.",
    "Ajouter à Google Agenda : {url}": "הוספה ליומן Google: {url}",
    "Votre demande de rendez-vous a été acceptée": "בקשת המפגש שלך אושרה",
    "{name} a accepté.": "התקבל אישור מ-{name}.",
    "Rendez-vous confirmé sur Ittsui": "המפגש אושר ב-Ittsui",
    "Rendez-vous verrouillé : {venue}.": "המפגש נקבע: {venue}.",
    "Votre demande de rendez-vous a été déclinée": "בקשת המפגש שלך נדחתה",
    "{name} a décliné votre demande pour {venue}, le {date} à {time}.":
      "הבקשה שלך ל-{venue} ב{date} בשעה {time} נדחתה על ידי {name}.",
    "La personne invitée a décliné votre demande pour {venue}, le {date} à {time}.":
      "הבקשה שלך ל-{venue} ב{date} בשעה {time} נדחתה.",
    "Votre rendez-vous de la semaine": "המפגש שלכם השבוע",
    "Votre rendez-vous du mois": "המפגש שלכם החודש",
    "Votre rendez-vous de l'année": "המפגש שלכם השנה",
    "Le rituel Ittsui avec cette personne a été annulé.": "הריטואל ב-Ittsui עם האדם הזה בוטל.",
  },
};
