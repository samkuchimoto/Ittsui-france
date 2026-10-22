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
};
