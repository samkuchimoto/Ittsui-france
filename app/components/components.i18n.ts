// /app/components/components.i18n.ts — English and Japanese for the small
// components shared by the app screens (loading, status, time, contacts,
// origin story, directions). See lib/translate.ts.

import type { Catalog } from "@/lib/translate";

export const COMPONENTS: Catalog = {
  en: {
    // CityPicker
    "Ville du rendez-vous": "City of the rendez-vous",
    // FriendlyLoading
    "Un instant…": "One moment…",
    "On vérifie tout ça…": "Checking everything…",
    "Presque prêt…": "Almost ready…",
    // SlowLoadFallback
    "Cela prend plus de temps que prévu.": "This is taking longer than expected.",
    Réessayer: "Try again",
    // TimeSelect
    "{label} — heure": "{label}: hour",
    "{label} — minutes": "{label}: minutes",
    "{h}h": "{h}",
    // CockpitStatus
    "Statut du rituel": "Ritual status",
    Envoyée: "Sent",
    Reçue: "Received",
    Planifiée: "Scheduled",
    "Lieu validé": "Place confirmed",
    // VenueDirections
    "Ouvrir dans Maps": "Open in Maps",
    Itinéraire: "Directions",
    // PhoneContactPicker
    "Voir tous mes contacts": "See all my contacts",
    "Chargement...": "Loading…",
    "Rechercher un nom...": "Search for a name…",
    Fermer: "Close",
    "Accès aux contacts refusé — autorisez-le dans les réglages de votre téléphone pour Ittsui, puis réessayez.":
      "Access to contacts denied: allow it for Ittsui in your phone's settings, then try again.",
    "Impossible de charger vos contacts pour le moment.": "Your contacts can't be loaded right now.",
    "Aucun contact trouvé sur ce téléphone.": "No contacts found on this phone.",
    // OriginStorySheet
    "Avant Ittsui, six mois de volontariat dans des fermes biologiques à Yugawara puis Negoro, au Japon. De longues journées simples — et une question qui a commencé à me travailler : dans une ville de millions de gens, comment est-ce qu'on finit quand même par se sentir seul ?":
      "Before Ittsui, six months volunteering on organic farms in Yugawara, then Negoro, in Japan. Long, simple days, and a question that started working on me: in a city of millions of people, how do you still end up feeling alone?",
    "Le voyage a continué jusqu'à Prague. Un soir, arrivé tard, l'auberge prévue était fermée. Dans une autre, j'ai rencontré une voyageuse japonaise, et on a fini par parler de cette idée encore floue d'application.":
      "The journey went on to Prague. One evening, arriving late, the hostel I'd planned on was closed. In another one, I met a Japanese traveller, and we ended up talking about this still-vague idea for an app.",
    "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »":
      "“The problem isn't that we don't want to see people. It's that we don't have the time.”",
    "C'est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme : une seule proposition, une seule décision, puis le silence jusqu'à la prochaine fois.":
      "That observation, not a starting idea, is what gave Ittsui its shape: one proposal, one decision, then silence until next time.",
    "Concrètement, ça ressemble à ça chaque semaine :": "In practice, this is what it looks like each week:",
    "Exemple — Samedi 15h30": "Example: Saturday 15:30",
    Oui: "Yes",
    Non: "No",
    "Découvrir Ittsui": "Discover Ittsui",
    Suivant: "Next",
    Passer: "Skip",
  },
  ja: {
    // CityPicker
    "Ville du rendez-vous": "会う街",
    "Un instant…": "少々お待ちください…",
    "On vérifie tout ça…": "確認しています…",
    "Presque prêt…": "もうすぐです…",
    "Cela prend plus de temps que prévu.": "思ったより時間がかかっています。",
    Réessayer: "もう一度試す",
    "{label} — heure": "{label}（時）",
    "{label} — minutes": "{label}（分）",
    "{h}h": "{h}時",
    "Statut du rituel": "習慣の状況",
    Envoyée: "送信済み",
    Reçue: "受信済み",
    Planifiée: "予定済み",
    "Lieu validé": "場所決定",
    "Ouvrir dans Maps": "マップで開く",
    Itinéraire: "経路",
    "Voir tous mes contacts": "連絡先をすべて見る",
    "Chargement...": "読み込み中…",
    "Rechercher un nom...": "名前で検索…",
    Fermer: "閉じる",
    "Accès aux contacts refusé — autorisez-le dans les réglages de votre téléphone pour Ittsui, puis réessayez.":
      "連絡先へのアクセスが許可されていません。スマートフォンの設定でIttsuiに許可してから、もう一度お試しください。",
    "Impossible de charger vos contacts pour le moment.": "今は連絡先を読み込めません。",
    "Aucun contact trouvé sur ce téléphone.": "このスマートフォンに連絡先が見つかりません。",
    "Avant Ittsui, six mois de volontariat dans des fermes biologiques à Yugawara puis Negoro, au Japon. De longues journées simples — et une question qui a commencé à me travailler : dans une ville de millions de gens, comment est-ce qu'on finit quand même par se sentir seul ?":
      "Ittsuiの前、日本の湯河原と根来の有機農場で6か月ボランティアをしていました。シンプルで長い毎日。そこで、ある問いが頭から離れなくなりました。何百万人もいる街で、それでも人はなぜ孤独を感じてしまうのだろう？",
    "Le voyage a continué jusqu'à Prague. Un soir, arrivé tard, l'auberge prévue était fermée. Dans une autre, j'ai rencontré une voyageuse japonaise, et on a fini par parler de cette idée encore floue d'application.":
      "旅はプラハへと続きました。ある晩、遅くに着くと、予定していた宿は閉まっていました。別の宿で日本人の旅行者に出会い、まだぼんやりしていたアプリのアイデアの話になりました。",
    "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »":
      "「人に会いたくないわけじゃない。時間がないだけ。」",
    "C'est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme : une seule proposition, une seule décision, puis le silence jusqu'à la prochaine fois.":
      "最初のアイデアではなく、この気づきがIttsuiの形をつくりました。提案はひとつ、決めることもひとつ。あとは次回まで静かに。",
    "Concrètement, ça ressemble à ça chaque semaine :": "実際には、毎週こんなふうに届きます：",
    "Exemple — Samedi 15h30": "例：土曜 15:30",
    Oui: "はい",
    Non: "いいえ",
    "Découvrir Ittsui": "Ittsuiを始める",
    Suivant: "次へ",
    Passer: "スキップ",
  },
  es: {
    "Ville du rendez-vous": "Ciudad del encuentro",
    "Un instant…": "Un momento…",
    "On vérifie tout ça…": "Revisando todo…",
    "Presque prêt…": "Casi listo…",
    "Cela prend plus de temps que prévu.": "Esto está tardando más de lo esperado.",
    Réessayer: "Intentar de nuevo",
    "{label} — heure": "{label}: hora",
    "{label} — minutes": "{label}: minutos",
    "{h}h": "{h}",
    "Statut du rituel": "Estado del ritual",
    Envoyée: "Enviado",
    Reçue: "Recibido",
    Planifiée: "Agendado",
    "Lieu validé": "Lugar confirmado",
    "Ouvrir dans Maps": "Abrir en Maps",
    Itinéraire: "Cómo llegar",
    "Voir tous mes contacts": "Ver todos mis contactos",
    "Chargement...": "Cargando…",
    "Rechercher un nom...": "Buscar un nombre…",
    Fermer: "Cerrar",
    "Accès aux contacts refusé — autorisez-le dans les réglages de votre téléphone pour Ittsui, puis réessayez.":
      "Acceso a contactos denegado: permítelo para Ittsui en los ajustes de tu teléfono y vuelve a intentarlo.",
    "Impossible de charger vos contacts pour le moment.": "No se pueden cargar tus contactos ahora.",
    "Aucun contact trouvé sur ce téléphone.": "No se encontraron contactos en este teléfono.",
    "Avant Ittsui, six mois de volontariat dans des fermes biologiques à Yugawara puis Negoro, au Japon. De longues journées simples — et une question qui a commencé à me travailler : dans une ville de millions de gens, comment est-ce qu'on finit quand même par se sentir seul ?":
      "Antes de Ittsui, seis meses de voluntariado en granjas orgánicas en Yugawara y luego en Negoro, en Japón. Días largos y sencillos, y una pregunta que empezó a darme vueltas: en una ciudad de millones de personas, ¿cómo es que uno termina sintiéndose solo?",
    "Le voyage a continué jusqu'à Prague. Un soir, arrivé tard, l'auberge prévue était fermée. Dans une autre, j'ai rencontré une voyageuse japonaise, et on a fini par parler de cette idée encore floue d'application.":
      "El viaje siguió hasta Praga. Una noche llegué tarde y el hostal que tenía previsto estaba cerrado. En otro conocí a una viajera japonesa y terminamos hablando de esta idea, todavía vaga, de una app.",
    "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »":
      "“El problema no es que no queramos ver a la gente. Es que no tenemos tiempo.”",
    "C'est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme : une seule proposition, une seule décision, puis le silence jusqu'à la prochaine fois.":
      "Esa observación, y no una idea de partida, es lo que le dio forma a Ittsui: una propuesta, una decisión y luego silencio hasta la próxima vez.",
    "Concrètement, ça ressemble à ça chaque semaine :": "En la práctica, así se ve cada semana:",
    "Exemple — Samedi 15h30": "Ejemplo: sábado 15:30",
    Oui: "Sí",
    Non: "No",
    "Découvrir Ittsui": "Descubre Ittsui",
    Suivant: "Siguiente",
    Passer: "Omitir",
  },
  he: {
    "Ville du rendez-vous": "עיר המפגש",
    "Un instant…": "רגע אחד…",
    "On vérifie tout ça…": "בודקים הכול…",
    "Presque prêt…": "כמעט מוכן…",
    "Cela prend plus de temps que prévu.": "זה לוקח יותר זמן מהצפוי.",
    Réessayer: "לנסות שוב",
    "{label} — heure": "{label}: שעה",
    "{label} — minutes": "{label}: דקות",
    "{h}h": "{h}",
    "Statut du rituel": "מצב הריטואל",
    Envoyée: "נשלח",
    Reçue: "התקבל",
    Planifiée: "נקבע",
    "Lieu validé": "המקום אושר",
    "Ouvrir dans Maps": "פתיחה במפות",
    Itinéraire: "הוראות הגעה",
    "Voir tous mes contacts": "כל אנשי הקשר שלי",
    "Chargement...": "טוען…",
    "Rechercher un nom...": "חיפוש שם…",
    Fermer: "סגירה",
    "Accès aux contacts refusé — autorisez-le dans les réglages de votre téléphone pour Ittsui, puis réessayez.":
      "הגישה לאנשי הקשר נחסמה: יש לאשר אותה ל-Ittsui בהגדרות הטלפון ולנסות שוב.",
    "Impossible de charger vos contacts pour le moment.": "אי אפשר לטעון את אנשי הקשר כרגע.",
    "Aucun contact trouvé sur ce téléphone.": "לא נמצאו אנשי קשר בטלפון הזה.",
    "Avant Ittsui, six mois de volontariat dans des fermes biologiques à Yugawara puis Negoro, au Japon. De longues journées simples — et une question qui a commencé à me travailler : dans une ville de millions de gens, comment est-ce qu'on finit quand même par se sentir seul ?":
      "לפני Ittsui: שישה חודשים של התנדבות בחוות אורגניות ביוגווארה, ואחר כך בנגורו, ביפן. ימים ארוכים ופשוטים, ושאלה אחת שלא הרפתה ממני: בעיר של מיליוני אנשים, איך בכל זאת מרגישים לבד?",
    "Le voyage a continué jusqu'à Prague. Un soir, arrivé tard, l'auberge prévue était fermée. Dans une autre, j'ai rencontré une voyageuse japonaise, et on a fini par parler de cette idée encore floue d'application.":
      "המסע המשיך לפראג. ערב אחד הגעתי מאוחר, וההוסטל שתכננתי היה סגור. בהוסטל אחר פגשתי מטיילת יפנית, ומצאנו את עצמנו מדברים על רעיון עדיין מעורפל לאפליקציה.",
    "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »":
      "\"הבעיה היא לא שאנחנו לא רוצים לראות אנשים. הבעיה היא שאין לנו זמן.\"",
    "C'est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme : une seule proposition, une seule décision, puis le silence jusqu'à la prochaine fois.":
      "התובנה הזו, ולא רעיון מוכן מראש, היא שעיצבה את Ittsui: הצעה אחת, החלטה אחת, ואז שקט עד הפעם הבאה.",
    "Concrètement, ça ressemble à ça chaque semaine :": "בפועל, כך זה נראה כל שבוע:",
    "Exemple — Samedi 15h30": "לדוגמה: שבת 15:30",
    Oui: "כן",
    Non: "לא",
    "Découvrir Ittsui": "הכירו את Ittsui",
    Suivant: "הבא",
    Passer: "דילוג",
  },
};
