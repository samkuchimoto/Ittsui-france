// /app/setup/pending/pending.i18n.ts — English and Japanese for PendingClient.tsx
// (shared strings with setup come from ../setup.i18n.ts).

import type { Catalog } from "@/lib/translate";

export const PENDING: Catalog = {
  en: {
    "✓ E-mail envoyé": "✓ Email sent",
    "⚠ Échec d'envoi de l'e-mail": "⚠ The email couldn't be sent",
    "Cette invitation n'a pas d'e-mail — envoyez-lui le lien vous-même si ce n'est pas déjà fait.":
      "This invitation has no email: send them the link yourself if you haven't already.",
    "Invitation déclinée": "Invitation declined",
    "{name} n'a pas souhaité être lié(e). Vous pouvez inviter quelqu'un d'autre.":
      "{name} preferred not to be linked. You can invite someone else.",
    "Nouvelle invitation": "New invitation",
    "Se déconnecter": "Sign out",
    "Invitation annulée": "Invitation cancelled",
    "Cette invitation a été remplacée par une plus récente. Vous pouvez en envoyer une nouvelle.":
      "This invitation was replaced by a newer one. You can send a new one.",
    "Invitation expirée": "Invitation expired",
    "{name} n'a pas répondu à temps. Vous pouvez réessayer.": "{name} didn't reply in time. You can try again.",
    "En attente": "Waiting",
    "{name} n'a pas encore rejoint Ittsui. Cette page se met à jour automatiquement dès que c'est fait.":
      "{name} hasn't joined Ittsui yet. This page updates by itself as soon as they do.",
    "Annulation...": "Cancelling…",
    "Annuler l'invitation": "Cancel the invitation",
    Déclinée: "Declined",
    Expirée: "Expired",
    Annulée: "Cancelled",
    "Invitations précédentes": "Previous invitations",
  },
  ja: {
    "✓ E-mail envoyé": "✓ メールを送信しました",
    "⚠ Échec d'envoi de l'e-mail": "⚠ メールを送信できませんでした",
    "Cette invitation n'a pas d'e-mail — envoyez-lui le lien vous-même si ce n'est pas déjà fait.":
      "この招待にはメールアドレスがありません。まだなら、リンクをあなたから送ってください。",
    "Invitation déclinée": "招待は辞退されました",
    "{name} n'a pas souhaité être lié(e). Vous pouvez inviter quelqu'un d'autre.":
      "{name}さんはつながりを希望しませんでした。別の人を招待できます。",
    "Nouvelle invitation": "新しい招待",
    "Se déconnecter": "ログアウト",
    "Invitation annulée": "招待はキャンセルされました",
    "Cette invitation a été remplacée par une plus récente. Vous pouvez en envoyer une nouvelle.":
      "この招待は新しい招待に置き換えられました。新しく送ることができます。",
    "Invitation expirée": "招待の期限が切れました",
    "{name} n'a pas répondu à temps. Vous pouvez réessayer.": "{name}さんから期限内に返事がありませんでした。もう一度送ることができます。",
    "En attente": "返事待ち",
    "{name} n'a pas encore rejoint Ittsui. Cette page se met à jour automatiquement dès que c'est fait.":
      "{name}さんはまだIttsuiに参加していません。参加すると、このページは自動で更新されます。",
    "Annulation...": "キャンセル中…",
    "Annuler l'invitation": "招待をキャンセル",
    Déclinée: "辞退",
    Expirée: "期限切れ",
    Annulée: "キャンセル",
    "Invitations précédentes": "これまでの招待",
  },
};
