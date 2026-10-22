// /app/components/plan.i18n.ts — English and Japanese for PlanCard.tsx
// (the plan card, the Plus offer) and SignInGate.tsx. See lib/translate.ts.

import type { Catalog } from "@/lib/translate";

export const PLAN: Catalog = {
  en: {
    // PlanCard
    "✓ Ittsui Plus": "✓ Ittsui Plus",
    "Rendez-vous sans limite, chaque semaine.": "Unlimited rendez-vous, every week.",
    "Gérer l'abonnement": "Manage subscription",
    "Essai Plus : encore {n} jours": "Plus trial: {n} days left",
    "Essai Plus : dernier jour": "Plus trial: last day",
    "Ensuite, un rendez-vous par mois reste gratuit.": "After that, one rendez-vous a month stays free.",
    "Plan gratuit : {used}/{limit} rendez-vous ce mois-ci": "Free plan: {used}/{limit} rendez-vous this month",
    "Avec Plus : chaque semaine, sans limite, sans engagement.": "With Plus: every week, no limit, cancel anytime.",
    "Passer à Plus, {price}/mois": "Go Plus, {price}/month",
    "Le paiement n'est pas encore activé, revenez bientôt.": "Payment isn't switched on yet, come back soon.",
    "Une erreur est survenue.": "Something went wrong.",
    "Code {code} : -50 % pendant 3 mois, pour les 100 premiers membres.": "Code {code}: 50% off for 3 months, for the first 100 members.",
    "Invitez un proche : un mois de Plus offert à chacun.": "Invite someone: you each get a month of Plus.",
    "Partager mon lien": "Share my link",
    "Lien copié": "Link copied",
    "Inscrits grâce à vous : {n}": "Joined through you: {n}",
    "Je bloque du temps pour les gens qui comptent avec Ittsui. Avec mon lien, tu as un mois de Plus offert :":
      "I set time aside for the people who matter with Ittsui. With my link you get a month of Plus free:",
    // YourTurn
    "À votre tour": "Your turn",
    "Bloquez du temps avec les personnes qui comptent pour vous : Ittsui propose le lieu et l'heure, il ne reste qu'à confirmer.":
      "Set time aside with the people who matter to you: Ittsui suggests the place and the time, you just confirm.",
    "Avec l'invitation de {name} : 14 jours de Plus, plus un mois offert.": "With {name}'s invite: 14 days of Plus, plus a month free.",
    "14 jours de Plus offerts, sans carte bancaire.": "14 days of Plus free, no card needed.",
    "Commencer": "Get started",
    // PlusOffer
    "Votre rendez-vous gratuit du mois est utilisé": "This month's free rendez-vous is used",
    "Le plan gratuit comprend un rendez-vous par mois. Avec Ittsui Plus, proposez autant de moments que vous voulez, chaque semaine, à toutes les personnes qui comptent.":
      "The free plan includes one rendez-vous a month. With Ittsui Plus, suggest as many moments as you like, every week, to everyone who matters.",
    "Sans engagement, résiliable à tout moment.": "No commitment, cancel anytime.",
    "Retour au tableau de bord": "Back to the dashboard",
    // SignInGate
    "Bienvenue sur Ittsui": "Welcome to Ittsui",
    "Connectez-vous pour commencer : 14 jours de Plus offerts, sans carte bancaire.": "Sign in to start: 14 days of Plus, free, no card needed.",
    "Se connecter avec Google": "Sign in with Google",
    "Se connecter avec une clé d'accès": "Sign in with a passkey",
    "Connexion...": "Signing in...",
    "Échec de la connexion.": "Sign-in failed.",
    "Impossible de démarrer la connexion.": "The sign-in couldn't start.",
    "Connexion annulée.": "Sign-in cancelled.",
    "Vérification échouée.": "Verification failed.",
    "Connexion échouée.": "Sign-in failed.",
  },
  ja: {
    // PlanCard
    "✓ Ittsui Plus": "✓ Ittsui Plus",
    "Rendez-vous sans limite, chaque semaine.": "毎週、回数の制限なくランデヴーを。",
    "Gérer l'abonnement": "サブスクリプションを管理",
    "Essai Plus : encore {n} jours": "Plusお試し期間：残り{n}日",
    "Essai Plus : dernier jour": "Plusお試し期間：今日が最終日",
    "Ensuite, un rendez-vous par mois reste gratuit.": "お試し期間のあとも、月1回のランデヴーは無料です。",
    "Plan gratuit : {used}/{limit} rendez-vous ce mois-ci": "無料プラン：今月のランデヴー {used}/{limit}",
    "Avec Plus : chaque semaine, sans limite, sans engagement.": "Plusなら毎週、回数の制限なし。いつでも解約できます。",
    "Passer à Plus, {price}/mois": "Plusにする（月額{price}）",
    "Le paiement n'est pas encore activé, revenez bientôt.": "お支払いはまだご利用いただけません。もうしばらくお待ちください。",
    "Une erreur est survenue.": "エラーが発生しました。",
    "Code {code} : -50 % pendant 3 mois, pour les 100 premiers membres.": "コード{code}：先着100名様は3か月間50%オフ。",
    "Invitez un proche : un mois de Plus offert à chacun.": "大切な人を招待すると、おふたりともPlusが1か月無料になります。",
    "Partager mon lien": "リンクを共有",
    "Lien copié": "リンクをコピーしました",
    "Inscrits grâce à vous : {n}": "あなたの招待で登録：{n}人",
    "Je bloque du temps pour les gens qui comptent avec Ittsui. Avec mon lien, tu as un mois de Plus offert :":
      "Ittsuiで大切な人との時間をつくっています。このリンクから登録すると、Plusが1か月無料になります：",
    // YourTurn
    "À votre tour": "次はあなたの番です",
    "Bloquez du temps avec les personnes qui comptent pour vous : Ittsui propose le lieu et l'heure, il ne reste qu'à confirmer.":
      "大切な人との時間をつくりましょう。場所と時間はIttsuiが提案するので、あとは確認するだけです。",
    "Avec l'invitation de {name} : 14 jours de Plus, plus un mois offert.": "{name}さんの招待で、Plus 14日間に加えてさらに1か月無料。",
    "14 jours de Plus offerts, sans carte bancaire.": "Plusを14日間無料でお試しいただけます（カード不要）。",
    "Commencer": "はじめる",
    // PlusOffer
    "Votre rendez-vous gratuit du mois est utilisé": "今月の無料ランデヴーはご利用済みです",
    "Le plan gratuit comprend un rendez-vous par mois. Avec Ittsui Plus, proposez autant de moments que vous voulez, chaque semaine, à toutes les personnes qui comptent.":
      "無料プランのランデヴーは月1回までです。Ittsui Plusなら、大切な人たちに毎週、何度でも時間を提案できます。",
    "Sans engagement, résiliable à tout moment.": "契約期間の縛りはなく、いつでも解約できます。",
    "Retour au tableau de bord": "ダッシュボードに戻る",
    // SignInGate
    "Bienvenue sur Ittsui": "Ittsuiへようこそ",
    "Connectez-vous pour commencer : 14 jours de Plus offerts, sans carte bancaire.": "ログインしてはじめましょう。Plusを14日間無料でお試しいただけます（カード不要）。",
    "Se connecter avec Google": "Googleでログイン",
    "Se connecter avec une clé d'accès": "パスキーでログイン",
    "Connexion...": "ログイン中...",
    "Échec de la connexion.": "ログインに失敗しました。",
    "Impossible de démarrer la connexion.": "ログインを開始できませんでした。",
    "Connexion annulée.": "ログインがキャンセルされました。",
    "Vérification échouée.": "確認に失敗しました。",
    "Connexion échouée.": "ログインに失敗しました。",
  },
};
