// /app/dashboard/requests.i18n.ts — English and Japanese for RequestsPanel.tsx
// and the archive (see lib/translate.ts).

import type { Catalog } from "@/lib/translate";

export const REQUESTS: Catalog = {
  en: {
    Café: "Café",
    Restaurant: "Restaurant",
    Parc: "Park",
    Musée: "Museum",
    "Chez vous": "At home",
    "En attente": "Pending",
    Accepté: "Accepted",
    Décliné: "Declined",
    Expiré: "Expired",
    Annulée: "Cancelled",
    "{date} à {time}": "{date} at {time}",
    "Rendez-vous confirmé via Ittsui.": "Rendez-vous confirmed through Ittsui.",
    "Ajouter à Google Agenda": "Add to Google Calendar",
    "Annulation...": "Cancelling…",
    "Annuler cette demande": "Cancel this request",
    "Demandes de rendez-vous": "Rendez-vous requests",
    "☕ Nouvelle demande": "☕ New request",
    "📬 Résumer mes e-mails": "📬 Sum up my emails",
    Reçues: "Received",
    Envoyées: "Sent",
    "Aucune demande pour l'instant.": "No requests yet.",
    // Archive
    "← Tableau de bord": "← Dashboard",
    "Vos moments ensemble": "Your moments together",
    "Aucune personne liée pour le moment.": "Nobody linked yet.",
    "Vos moments confirmés apparaîtront ici, à mesure qu'ils se confirment.":
      "Your confirmed moments will appear here as they're confirmed.",
  },
  ja: {
    Café: "カフェ",
    Restaurant: "レストラン",
    Parc: "公園",
    Musée: "美術館",
    "Chez vous": "自宅",
    "En attente": "返事待ち",
    Accepté: "承諾",
    Décliné: "辞退",
    Expiré: "期限切れ",
    Annulée: "キャンセル",
    "{date} à {time}": "{date} {time}",
    "Rendez-vous confirmé via Ittsui.": "Ittsuiで確定した約束です。",
    "Ajouter à Google Agenda": "Googleカレンダーに追加",
    "Annulation...": "キャンセル中…",
    "Annuler cette demande": "このリクエストを取り消す",
    "Demandes de rendez-vous": "約束のリクエスト",
    "☕ Nouvelle demande": "☕ 新しいリクエスト",
    "📬 Résumer mes e-mails": "📬 メールを要約",
    Reçues: "受け取ったもの",
    Envoyées: "送ったもの",
    "Aucune demande pour l'instant.": "まだリクエストはありません。",
    "← Tableau de bord": "← ダッシュボード",
    "Vos moments ensemble": "ふたりの時間の記録",
    "Aucune personne liée pour le moment.": "まだ誰ともつながっていません。",
    "Vos moments confirmés apparaîtront ici, à mesure qu'ils se confirment.":
      "確定した約束は、ここに順番に記録されていきます。",
  },
};
