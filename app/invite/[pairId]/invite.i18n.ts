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
  es: {
    "Une erreur est survenue.": "Algo salió mal.",
    "Échec de la connexion.": "No se pudo iniciar sesión.",
    "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles.":
      "Esto está tardando más de lo esperado. A veces el wifi público o del trabajo bloquea la conexión con Google: prueba con tus datos móviles.",
    Réessayer: "Intentar de nuevo",
    "Vous êtes lié(e) à {name}": "Ya estás en contacto con {name}",
    "Vous êtes lié(e) à cette personne": "Ya estás en contacto con esta persona",
    "Rendez-vous chaque {day}, vers {time}. La première proposition arrive automatiquement, sans rien à faire d'ici là.":
      "Un encuentro cada {day}, hacia las {time}. La primera propuesta llega sola; no tienes que hacer nada hasta entonces.",
    "Aller au tableau de bord": "Ir al panel",
    "Faire pareil avec quelqu'un d'autre": "Hacer lo mismo con otra persona",
    "Invitation déclinée": "Invitación rechazada",
    "Aucune donnée n'a été conservée. Rien d'autre à faire.": "No se guardó ningún dato. No hay nada más que hacer.",
    "Décliner l'invitation ?": "¿Rechazar la invitación?",
    "Vous ne serez pas lié(e) et vos informations seront supprimées.": "No habrá vínculo y se borrarán tus datos.",
    Décliner: "Rechazar",
    "Vous avez été invité(e) sur Ittsui": "Te invitaron a Ittsui",
    "Pas une appli de rencontre : un rendez-vous protégé, une fois par semaine, avec la personne qui vous a envoyé ce lien — une proposition, validable en un geste, sans agenda à gérer.":
      "No es una app de citas: un encuentro protegido, una vez a la semana, con la persona que te envió este enlace. Una propuesta, confirmada con un toque, sin agenda que administrar.",
    "Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à activer le lien.":
      "Un paso para confirmar: basta con iniciar sesión con Google para activar el vínculo.",
    ". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu l'invitation.":
      ". Iniciaste sesión con otra cuenta de Google: vuelve a entrar con la que recibió la invitación.",
    "Connexion...": "Iniciando sesión…",
    "Se connecter avec un autre compte": "Usar otra cuenta",
    "Je viens": "Me uno",
    "Via Google, juste pour vérifier que c'est bien vous.": "Con Google, solo para verificar que eres tú.",
    "champs manquants": "Faltan algunos datos",
    "invitation introuvable": "No se encontró la invitación",
    "cette invitation n'est plus valide — une invitation plus récente a peut-être été envoyée":
      "Esta invitación ya no es válida. Quizá se envió una más reciente",
    "invitation déjà traitée": "Ya se respondió esta invitación",
    "invitation expirée": "Esta invitación venció",
    "cette invitation ne correspond pas à votre compte": "Esta invitación no corresponde a tu cuenta",
  },
  he: {
    "Une erreur est survenue.": "משהו השתבש.",
    "Échec de la connexion.": "ההתחברות נכשלה.",
    "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles.":
      "זה לוקח יותר זמן מהצפוי. לפעמים Wi-Fi ציבורי או של מקום העבודה חוסם את החיבור ל-Google: כדאי לנסות עם חבילת הגלישה.",
    Réessayer: "לנסות שוב",
    "Vous êtes lié(e) à {name}": "החיבור עם {name} פעיל",
    "Vous êtes lié(e) à cette personne": "החיבור עם האדם הזה פעיל",
    "Rendez-vous chaque {day}, vers {time}. La première proposition arrive automatiquement, sans rien à faire d'ici là.":
      "מפגש בכל {day}, בסביבות {time}. ההצעה הראשונה תגיע מעצמה, ועד אז אין מה לעשות.",
    "Aller au tableau de bord": "מעבר ללוח הבקרה",
    "Faire pareil avec quelqu'un d'autre": "לעשות את אותו הדבר עם מישהו אחר",
    "Invitation déclinée": "ההזמנה נדחתה",
    "Aucune donnée n'a été conservée. Rien d'autre à faire.": "לא נשמר שום מידע. אין צורך לעשות שום דבר נוסף.",
    "Décliner l'invitation ?": "לדחות את ההזמנה?",
    "Vous ne serez pas lié(e) et vos informations seront supprimées.": "לא ייווצר חיבור, והפרטים שלך יימחקו.",
    Décliner: "דחייה",
    "Vous avez été invité(e) sur Ittsui": "קיבלת הזמנה ל-Ittsui",
    "Pas une appli de rencontre : un rendez-vous protégé, une fois par semaine, avec la personne qui vous a envoyé ce lien — une proposition, validable en un geste, sans agenda à gérer.":
      "זו לא אפליקציית היכרויות: מפגש שמור, פעם בשבוע, עם מי ששלח לך את הקישור הזה. הצעה אחת, אישור בנגיעה אחת, בלי יומן לנהל.",
    "Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à activer le lien.":
      "צעד אחד לאישור: מספיק להתחבר עם Google כדי להפעיל את החיבור.",
    ". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu l'invitation.":
      ". התחברת עם חשבון Google אחר: יש להתחבר שוב עם החשבון שקיבל את ההזמנה.",
    "Connexion...": "מתחברים…",
    "Se connecter avec un autre compte": "התחברות עם חשבון אחר",
    "Je viens": "אני בפנים",
    "Via Google, juste pour vérifier que c'est bien vous.": "עם Google, רק כדי לאמת את הזהות.",
    "champs manquants": "חסרים כמה פרטים",
    "invitation introuvable": "ההזמנה לא נמצאה",
    "cette invitation n'est plus valide — une invitation plus récente a peut-être été envoyée":
      "ההזמנה הזו כבר לא בתוקף. ייתכן שנשלחה הזמנה חדשה יותר",
    "invitation déjà traitée": "כבר ענו על ההזמנה הזו",
    "invitation expirée": "תוקף ההזמנה הזו פג",
    "cette invitation ne correspond pas à votre compte": "ההזמנה הזו לא תואמת לחשבון שלך",
  },
};
