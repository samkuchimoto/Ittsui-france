// /app/contacts/contacts.i18n.ts — English and Japanese for ContactsClient.tsx
// (see lib/translate.ts). The last three keys are /api/contacts' own
// validation messages, translated where they're shown.

import type { Catalog } from "@/lib/translate";

export const CONTACTS: Catalog = {
  en: {
    "Le nom est requis.": "A name is needed.",
    "Indiquez un e-mail ou un numéro de téléphone.": "Add an email or a phone number.",
    "Cette adresse e-mail ne semble pas valide.": "This email address doesn't look right.",
    "Une erreur est survenue.": "Something went wrong.",
    "Ce contact n'a ni e-mail ni numéro de téléphone enregistré.": "This contact has no email or phone number saved.",
    "Tableau de bord": "Dashboard",
    "Mes contacts": "My contacts",
    "Famille, ami(e)s, partenaire — pas de messagerie, juste de quoi leur envoyer une demande de rendez-vous en un geste.":
      "Family, friends, partner. No messaging, just what you need to send them a rendez-vous request in one tap.",
    "Import...": "Importing…",
    "Importer depuis mes contacts": "Import from my contacts",
    Nom: "Name",
    "Numéro de téléphone": "Phone number",
    "Ou, si vous l'avez, son e-mail :": "Or, if you have it, their email:",
    "E-mail (optionnel)": "Email (optional)",
    "+ Ajouter aussi un e-mail": "+ Add an email too",
    "Ajout...": "Adding…",
    "Ajouter à mes contacts": "Add to my contacts",
    "Proposer un RDV": "Propose a rendez-vous",
    Supprimer: "Remove",
    "Aucun contact pour l'instant.": "No contacts yet.",
    "numéro invalide": "Invalid phone number",
    "e-mail ou téléphone requis": "An email or a phone number is needed",
    "champs invalides": "Some fields aren't valid",
  },
  ja: {
    "Le nom est requis.": "名前を入力してください。",
    "Indiquez un e-mail ou un numéro de téléphone.": "メールアドレスか電話番号を入力してください。",
    "Cette adresse e-mail ne semble pas valide.": "このメールアドレスは正しくないようです。",
    "Une erreur est survenue.": "エラーが発生しました。",
    "Ce contact n'a ni e-mail ni numéro de téléphone enregistré.": "この連絡先には、メールアドレスも電話番号も登録されていません。",
    "Tableau de bord": "ダッシュボード",
    "Mes contacts": "連絡先",
    "Famille, ami(e)s, partenaire — pas de messagerie, juste de quoi leur envoyer une demande de rendez-vous en un geste.":
      "家族、友だち、パートナー。メッセージ機能はありません。約束のリクエストをワンタップで送るためのリストです。",
    "Import...": "読み込み中…",
    "Importer depuis mes contacts": "端末の連絡先から読み込む",
    Nom: "名前",
    "Numéro de téléphone": "電話番号",
    "Ou, si vous l'avez, son e-mail :": "メールアドレスがわかれば、こちらにも：",
    "E-mail (optionnel)": "メールアドレス（任意）",
    "+ Ajouter aussi un e-mail": "＋ メールアドレスも追加",
    "Ajout...": "追加中…",
    "Ajouter à mes contacts": "連絡先に追加",
    "Proposer un RDV": "約束を提案",
    Supprimer: "削除",
    "Aucun contact pour l'instant.": "まだ連絡先はありません。",
    "numéro invalide": "電話番号が正しくありません",
    "e-mail ou téléphone requis": "メールアドレスか電話番号が必要です",
    "champs invalides": "入力内容に誤りがあります",
  },
};
