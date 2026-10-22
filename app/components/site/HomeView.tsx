// /app/components/site/HomeView.tsx
// The homepage, in French (app/page.tsx), English (app/en) and Japanese
// (app/ja). Server Component: every piece of interactivity (scroll-tracked
// header, reveals, the early-access form, the sandbox) lives in its own
// "use client" island, so this file composes static prose plus those.
//
// ---------------------------------------------------------------------
// Rewritten against real tester feedback, quoted verbatim below.
//
//   "C'est quoi"                     "Le nom ne lui parle pas"
//   "Site de rencontre, il sait      "L'explication n'est pas dans
//    ce que c'est"                    le nom, en dessous de ça il faut"
//   "Image not clikable"             "Mascot misleading as products"
//   "Adress not / Je rentre"         "Curiosité, il veut savoir"
//   "Deux types: ceux qui vont vers le site, un autre qui juste browsing"
//   "L'appli qui doit lui dire c'est quoi sans chercher"
//   "En moins de trois secondes il sait de quoi il s'agit"
//   "En naviguant au lieu de naviguer c'est la confirmation, càd satisfaire"
//
// Four structural changes came out of that:
//
// 1. Positive framing. The hero badge used to read "Pas une appli de
//    rencontre — un outil de maintien relationnel". Negation makes the
//    reader picture the rejected category first, which is precisely how
//    "site de rencontre" kept sticking. The badge now says who this is
//    for, and the H1 says what happens, in one sentence of plain French.
//
// 2. The sandbox is the hero visual. A decorative stock photo sat here
//    and answered nothing when tapped. Someone who is "juste browsing"
//    now meets a working proposal card in the first screen, with no
//    scrolling and no signup — the fastest honest answer to "c'est quoi".
//
// 3. One concrete question for the high-intent visitor: "Avec qui
//    voulez-vous bloquer un moment ?" replaces the abstract "Protéger
//    mes relations" button, and the answer is carried into setup.
//
// 4. Every surface that looks tappable now is. Duo tiles reconfigure the
//    card, the venue opens its real address and a map link.
//
// 2026-10-20, product direction: "Envoyer un geste" is hidden from the
// homepage (its section and hero link); the gesture pages still work for
// links already sent. 2026-10-23: the homepage says one thing, "one
// proposal, one decision, more time with the people who matter", so the
// email summary left it (/triage still works, from the dashboard). No copy
// promises "no account": a guest invited by email, or to a weekly ritual,
// confirms with a Google sign-in. Only "no app to install" is true for all.
//
// The mascot's removal from the header is a Zone 0 decision only — see
// HeaderNav.tsx's comment. The cast stays everywhere in-product.
// ---------------------------------------------------------------------

import Link from "next/link";
import { fraunces, workSans } from "@/app/fonts";
import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";
import { plusOffer } from "@/lib/planConfig";
import { pagePath, withLang, type Locale } from "@/lib/i18n";
import { HeaderNav } from "@/app/components/HeaderNav";
import { Reveal } from "@/app/components/Reveal";
import { EarlyAccessForm } from "@/app/components/EarlyAccessForm";
import { DuoSandbox } from "@/app/components/DuoSandbox";
import { AmbientHeroVideo } from "@/app/components/AmbientHeroVideo";
import { StartRitualField } from "@/app/components/StartRitualField";
import { IconArrowRight, IconCheck, IconSparkles, IconCalendarX } from "@/app/components/HomeIcons";
import { MascotAvatar } from "@/app/components/MascotAvatar";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { NativeLanguagePicker } from "@/app/components/site/NativeLanguagePicker";
import { SiteFooter } from "@/app/components/site/SiteFooter";
import { localeTypography } from "@/app/components/site/typography";

type Copy = {
  badge: string;
  title: string;
  lede: string;
  oneOff: string;
  kanjiName: string;
  kanjiGloss: string;
  versusTitle: string;
  versusLede: string;
  versusHead: string;
  versus: { dimension: string; whatsapp: string; ittsui: string }[];
  notWantTitle: string;
  notWantBody: string;
  howTitle: string;
  steps: { title: string; body: string }[];
  ownRequest: string;
  disconnect: string;
  whyTitle: [string, string];
  whyQuote: string;
  whyBody: string;
  whyLink: string;
  feedbackTitle: string;
  feedback: { quote: string; from: string }[];
  ctaBadge: string;
  ctaTitle: string;
  ctaButton: string;
  ctaFree: string;
  plusUnit: string;
  plusBody: string;
  plusNote: string;
  plusButton: string;
  /** The founding offer (lib/planConfig.ts FOUNDING_CODE), typed at Stripe Checkout. */
  plusCode: string;
  mobile: string;
};

// The real competitor is not another app — it's the default habit of
// negotiating a date across a messaging thread. Naming that comparison
// explicitly is the only way a visitor can judge whether Ittsui is
// worth the switch; "plus simple" on its own means nothing next to a
// tool they already have and trust.
const COPY: Record<Locale, Copy> = {
  fr: {
    badge: "Pour vos proches, votre partenaire et vos ami(e)s qui comptent déjà",
    title: "Une proposition. Une décision. Plus de temps avec les personnes qui comptent.",
    lede: "Ittsui choisit le lieu et l'horaire. Vous validez en 1 clic. Votre invité(e) n'a aucune application à installer.",
    oneOff: "Proposer un rendez-vous ponctuel",
    kanjiName: "Ittsui (一対)",
    kanjiGloss: " : l'art d'entretenir le lien à deux.",
    versusTitle: "Pourquoi pas juste un message ?",
    versusLede:
      "Caler un café avec un(e) ami(e) prend rarement un message. Il en prend douze, sur quatre jours, et souvent ça ne se fait pas.",
    versusHead: "Messagerie",
    versus: [
      {
        dimension: "Trouver une date",
        whatsapp: "« On se voit quand ? » · « T'es libre quel jour ? » · relance trois jours plus tard",
        ittsui: "Un jour et une heure déjà choisis, une fois pour toutes, à la configuration.",
      },
      {
        dimension: "Trouver un lieu",
        whatsapp: "Chercher un café, vérifier les horaires, envoyer trois liens, attendre un avis",
        ittsui: "Une adresse réelle proposée pour vous, avec une alternative si elle ne va pas.",
      },
      {
        dimension: "Ce que ça demande à l'autre",
        whatsapp: "Participer à toute la négociation",
        ittsui: "Ouvrir un lien et toucher « Je viens ». Aucune application à installer.",
      },
      {
        dimension: "Après",
        whatsapp: "Le fil continue, les notifications aussi",
        ittsui: "Silence total jusqu'au jour J.",
      },
    ],
    notWantTitle: "Ce n'est pas un manque d'envie.",
    notWantBody:
      "C'est la charge de travail et le manque de temps qui font perdre de vue les gens qui comptent, sans jamais l'avoir décidé. Ittsui prend la décision à votre place chaque semaine ; vous, vous dites juste oui.",
    howTitle: "Comment ça marche.",
    steps: [
      {
        title: "1 proposition par semaine",
        body: "Chaque semaine, recevez une proposition unique — un lieu réel, un horaire — prête à être validée en un clic.",
      },
      {
        title: "Votre invité(e) répond en un geste",
        body: "Elle ou il reçoit un lien par SMS ou WhatsApp, voit le lieu et l'heure, touche « Je viens ». Pas d'application à installer, rien à négocier.",
      },
      {
        title: "Puis plus rien",
        body: "Une fois le rendez-vous bloqué, silence total jusqu'à la semaine suivante. Le lien se maintient sans effort de mémoire.",
      },
    ],
    ownRequest: "Vous savez déjà quoi faire ? Proposez votre propre rendez-vous →",
    disconnect: "Le droit à la déconnexion, appliqué à vos relations.",
    whyTitle: ["Le problème n'est pas l'envie.", "C'est le temps."],
    whyQuote: "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »",
    whyBody:
      "Une phrase entendue par hasard, un soir de voyage, qui a donné à Ittsui sa forme actuelle : une seule proposition, une seule décision, puis plus rien à gérer jusqu'à la prochaine fois.",
    whyLink: "Lire l'histoire complète →",
    feedbackTitle: "Premiers retours",
    feedback: [
      { quote: "C'est rapide, fluide… SMS c'est clean.", from: "Testeur parisien, 27 août 2026" },
      { quote: "Permet de trouver un contact rapidement.", from: "Testeur parisien, 27 août 2026" },
      { quote: "UI is nice… Intuitive.", from: "Étudiante américaine à Paris, 27 août 2026" },
    ],
    ctaBadge: "Le lien, sans effort",
    ctaTitle: "Offrez du temps réel aux personnes qui comptent.",
    ctaButton: "Bloquer un premier moment",
    ctaFree: "Gratuit : un rendez-vous par mois. 14 jours de Plus offerts à l'inscription.",
    plusUnit: "/ mois",
    plusBody:
      "Le prix d'un café, pour ne pas perdre le lien avec votre famille, vos ami(e)s ou votre partenaire.",
    plusNote:
      "Des rendez-vous chaque semaine, sans limite, avec toutes les personnes qui comptent. Sans Plus, un rendez-vous par mois reste gratuit. Sans engagement.",
    plusButton: "Commencer, 14 jours offerts",
    plusCode: "Code FONDATEUR : -50 % pendant 3 mois, pour les 100 premiers membres.",
    mobile: "Ittsui sur mobile →",
  },
  en: {
    badge: "For your family, your partner and the friends who already matter",
    title: "One proposal. One decision. More time with the people who matter.",
    lede: "Ittsui picks the place and the time. You confirm in one tap. Your guest has no app to install.",
    oneOff: "Suggest a one-off rendez-vous",
    kanjiName: "Ittsui (一対)",
    kanjiGloss: ": the art of tending the bond between two people.",
    versusTitle: "Why not just send a message?",
    versusLede:
      "Arranging a coffee with a friend rarely takes one message. It takes twelve, over four days, and often it never happens.",
    versusHead: "Messaging",
    versus: [
      {
        dimension: "Finding a date",
        whatsapp: "“When shall we meet?” · “Which day are you free?” · a nudge three days later",
        ittsui: "A day and a time already chosen, once and for all, at setup.",
      },
      {
        dimension: "Finding a place",
        whatsapp: "Look for a café, check the opening hours, send three links, wait for an opinion",
        ittsui: "A real address suggested for you, with an alternative if it doesn't suit.",
      },
      {
        dimension: "What it asks of the other person",
        whatsapp: "Taking part in the whole negotiation",
        ittsui: "Opening a link and tapping “I'm in”. No app to install.",
      },
      {
        dimension: "Afterwards",
        whatsapp: "The thread goes on, and so do the notifications",
        ittsui: "Total silence until the day itself.",
      },
    ],
    notWantTitle: "It's not that you don't want to.",
    notWantBody:
      "It's the workload and the lack of time that make us lose sight of the people who matter, without ever deciding to. Ittsui makes the decision for you each week; you just say yes.",
    howTitle: "How it works.",
    steps: [
      {
        title: "1 proposal a week",
        body: "Each week, get a single proposal (a real place, a time) ready to confirm in one tap.",
      },
      {
        title: "Your guest replies in one tap",
        body: "They get a link by SMS or WhatsApp, see the place and the time, and tap “I'm in”. No app to install, nothing to negotiate.",
      },
      {
        title: "Then nothing",
        body: "Once the rendez-vous is set, total silence until the following week. The bond keeps going without any effort of memory.",
      },
    ],
    ownRequest: "Already know what you want to do? Suggest your own rendez-vous →",
    disconnect: "The right to disconnect, applied to your relationships.",
    whyTitle: ["The problem isn't wanting to.", "It's time."],
    whyQuote: "“The problem isn't that we don't want to see people. It's that we don't have the time.”",
    whyBody:
      "A sentence overheard by chance, one evening while travelling, that gave Ittsui its current shape: one proposal, one decision, then nothing left to manage until next time.",
    whyLink: "Read the full story →",
    feedbackTitle: "First feedback",
    feedback: [
      { quote: "It's quick, smooth… the SMS is clean.", from: "Tester in Paris, 27 August 2026 · translated from French" },
      { quote: "Helps you find a contact quickly.", from: "Tester in Paris, 27 August 2026 · translated from French" },
      { quote: "UI is nice… Intuitive.", from: "American student in Paris, 27 August 2026" },
    ],
    ctaBadge: "The bond, without the effort",
    ctaTitle: "Give real time to the people who matter.",
    ctaButton: "Set aside a first moment",
    ctaFree: "Free: one rendez-vous a month. 14 days of Plus when you sign up.",
    plusUnit: "/ month",
    plusBody: "The price of a coffee, so you don't lose touch with your family, your friends or your partner.",
    plusNote: "Rendez-vous every week, with no limit, with everyone who matters. Without Plus, one rendez-vous a month stays free. Cancel anytime.",
    plusButton: "Start with 14 days free",
    plusCode: "Code FONDATEUR: 50% off for 3 months, for the first 100 members.",
    mobile: "Ittsui on mobile →",
  },
  ja: {
    badge: "家族、パートナー、そして大切な友人のために",
    title: "提案はひとつ。決めるのは一度。大切な人との時間を、もっと。",
    lede: "場所と時間はIttsuiが選びます。あなたはワンタップで確定するだけ。相手はアプリをインストールする必要がありません。",
    oneOff: "1回だけの約束を提案する",
    kanjiName: "Ittsui（一対）",
    kanjiGloss: "：ふたりのつながりを、大切に育てるために。",
    versusTitle: "メッセージを送るだけでは、だめ？",
    versusLede:
      "友だちとお茶の約束をするのに、メッセージ1通で済むことはまずありません。4日間で12通。しかも結局、流れてしまうことも多いのです。",
    versusHead: "メッセージアプリ",
    versus: [
      {
        dimension: "日にちを決める",
        whatsapp: "「いつ会う？」·「何曜日なら空いてる？」· 3日後にもう一度催促",
        ittsui: "曜日と時間は、最初の設定で一度決めるだけ。",
      },
      {
        dimension: "場所を決める",
        whatsapp: "カフェを探し、営業時間を調べ、リンクを3つ送り、返事を待つ",
        ittsui: "あなたに合った実在の場所を提案。合わなければ代案もあります。",
      },
      {
        dimension: "相手にかかる手間",
        whatsapp: "やり取りのすべてに付き合ってもらう",
        ittsui: "リンクを開いて「行きます」をタップするだけ。アプリのインストールは不要。",
      },
      {
        dimension: "そのあと",
        whatsapp: "スレッドは続き、通知も鳴り続ける",
        ittsui: "当日まで、完全な静けさ。",
      },
    ],
    notWantTitle: "会いたくないわけじゃない。",
    notWantBody:
      "忙しさと時間のなさが、いつの間にか大切な人との距離をつくってしまう。自分で決めたわけでもないのに。Ittsuiが毎週あなたの代わりに決めます。あなたは「はい」と言うだけ。",
    howTitle: "使い方。",
    steps: [
      {
        title: "週にひとつの提案",
        body: "毎週、実在の場所と時間をひとつだけ提案します。ワンタップで確定できます。",
      },
      {
        title: "相手はワンタップで返事",
        body: "相手にはSMSかWhatsAppでリンクが届き、場所と時間を見て「行きます」をタップするだけ。アプリのインストールも、日程の交渉もいりません。",
      },
      {
        title: "あとは何もしない",
        body: "約束が決まったら、翌週まで完全な静けさ。覚えておく努力なしに、つながりが続きます。",
      },
    ],
    ownRequest: "やりたいことが決まっている？自分で約束を提案する →",
    disconnect: "「つながらない権利」を、大切な人との関係にも。",
    whyTitle: ["問題は、会いたい気持ちではありません。", "時間です。"],
    whyQuote: "「人に会いたくないわけじゃない。時間がないだけ。」",
    whyBody:
      "旅先のある夜、偶然耳にしたこのひと言が、今のIttsuiの形を決めました。提案はひとつ、決めることもひとつ。あとは次回まで、何もしなくていい。",
    whyLink: "物語をすべて読む →",
    feedbackTitle: "最初の声",
    feedback: [
      { quote: "速くて、なめらか…SMSがすっきりしている。", from: "パリのテスター、2026年8月27日（フランス語から翻訳）" },
      { quote: "連絡したい相手がすぐに見つかる。", from: "パリのテスター、2026年8月27日（フランス語から翻訳）" },
      { quote: "UIがいい…直感的。", from: "パリ在住のアメリカ人学生、2026年8月27日（英語から翻訳）" },
    ],
    ctaBadge: "がんばらずに、つながる",
    ctaTitle: "大切な人に、本当の時間を。",
    ctaButton: "最初の時間をつくる",
    ctaFree: "無料プランは月1回のランデヴー。登録から14日間はPlusを無料でお試しいただけます。",
    plusUnit: "/ 月",
    plusBody: "コーヒー1杯の値段で、家族や友人、パートナーとのつながりを守る。",
    plusNote: "大切な人たちと、毎週、回数の制限なくランデヴーを。Plusに入らなくても、月1回のランデヴーは無料です。いつでも解約できます。",
    plusButton: "14日間無料ではじめる",
    plusCode: "コードFONDATEUR：先着100名様は3か月間50%オフ。",
    mobile: "スマートフォンでIttsuiを使う →",
  },
  es: {
    badge: "Para tu familia, tu pareja y las amistades que ya importan",
    title: "Una propuesta. Una decisión. Más tiempo con la gente que importa.",
    lede: "Ittsui elige el lugar y la hora. Tú confirmas con un toque. Tu invitado no tiene que instalar ninguna app.",
    oneOff: "Proponer un encuentro puntual",
    kanjiName: "Ittsui (一対)",
    kanjiGloss: ": el arte de cuidar el vínculo entre dos personas.",
    versusTitle: "¿Por qué no mandar un mensaje y ya?",
    versusLede:
      "Quedar para un café con alguien casi nunca toma un solo mensaje. Toma doce, a lo largo de cuatro días, y muchas veces nunca pasa.",
    versusHead: "Mensajes",
    versus: [
      {
        dimension: "Encontrar una fecha",
        whatsapp: "“¿Cuándo nos vemos?” · “¿Qué día puedes?” · un recordatorio tres días después",
        ittsui: "Un día y una hora ya elegidos, de una vez por todas, al configurarlo.",
      },
      {
        dimension: "Encontrar un lugar",
        whatsapp: "Buscar un café, revisar los horarios, mandar tres enlaces, esperar una opinión",
        ittsui: "Una dirección real sugerida para ti, con una alternativa si no te convence.",
      },
      {
        dimension: "Lo que se le pide a la otra persona",
        whatsapp: "Participar en toda la negociación",
        ittsui: "Abrir un enlace y tocar “Me uno”. Sin instalar ninguna app.",
      },
      {
        dimension: "Después",
        whatsapp: "La conversación sigue, y las notificaciones también",
        ittsui: "Silencio total hasta el día del encuentro.",
      },
    ],
    notWantTitle: "No es que no quieras.",
    notWantBody:
      "Son la carga de trabajo y la falta de tiempo las que nos hacen perder de vista a la gente que importa, sin decidirlo nunca. Ittsui toma la decisión por ti cada semana; tú solo dices que sí.",
    howTitle: "Cómo funciona.",
    steps: [
      {
        title: "1 propuesta por semana",
        body: "Cada semana recibes una sola propuesta (un lugar real, una hora) lista para confirmar con un toque.",
      },
      {
        title: "Tu invitado responde con un toque",
        body: "Recibe un enlace por SMS o WhatsApp, ve el lugar y la hora, y toca “Me uno”. Sin instalar nada, sin negociar.",
      },
      {
        title: "Y luego, nada",
        body: "Una vez fijado el encuentro, silencio total hasta la semana siguiente. El vínculo sigue sin ningún esfuerzo de memoria.",
      },
    ],
    ownRequest: "¿Ya sabes qué quieres hacer? Propón tu propio encuentro →",
    disconnect: "El derecho a desconectarse, aplicado a tus relaciones.",
    whyTitle: ["El problema no son las ganas.", "Es el tiempo."],
    whyQuote: "“El problema no es que no queramos ver a la gente. Es que no tenemos tiempo.”",
    whyBody:
      "Una frase escuchada por casualidad, una noche de viaje, que le dio a Ittsui su forma actual: una propuesta, una decisión y luego nada que gestionar hasta la próxima vez.",
    whyLink: "Leer la historia completa →",
    feedbackTitle: "Primeras opiniones",
    feedback: [
      { quote: "Es rápido, fluido… el SMS está limpio.", from: "Usuario de prueba en París, 27 de agosto de 2026 · traducido del francés" },
      { quote: "Ayuda a encontrar un contacto rápido.", from: "Usuario de prueba en París, 27 de agosto de 2026 · traducido del francés" },
      { quote: "La interfaz es bonita… Intuitiva.", from: "Estudiante estadounidense en París, 27 de agosto de 2026 · traducido del inglés" },
    ],
    ctaBadge: "El vínculo, sin el esfuerzo",
    ctaTitle: "Dale tiempo de verdad a la gente que importa.",
    ctaButton: "Apartar un primer momento",
    ctaFree: "Gratis: un encuentro al mes. 14 días de Plus al registrarte.",
    plusUnit: "/ mes",
    plusBody: "El precio de un café para no perder el contacto con tu familia, tus amigos o tu pareja.",
    plusNote: "Encuentros cada semana, sin límite, con toda la gente que importa. Sin Plus, un encuentro al mes sigue siendo gratis. Cancela cuando quieras.",
    plusButton: "Empezar con 14 días gratis",
    plusCode: "Código FONDATEUR: 50% de descuento durante 3 meses, para los primeros 100 miembros.",
    mobile: "Ittsui en el celular →",
  },
  he: {
    badge: "למשפחה, לבן או בת הזוג ולחברים שכבר חשובים לכם",
    title: "הצעה אחת. החלטה אחת. יותר זמן עם האנשים שחשובים לכם.",
    lede: "Ittsui בוחרת את המקום ואת השעה. אתם מאשרים בנגיעה אחת. מי שמוזמן לא צריך להתקין אפליקציה.",
    oneOff: "להציע מפגש חד־פעמי",
    kanjiName: "Ittsui (一対)",
    kanjiGloss: ": האמנות של טיפוח הקשר בין שני אנשים.",
    versusTitle: "למה לא פשוט לשלוח הודעה?",
    versusLede:
      "לתאם קפה עם מישהו קרוב כמעט אף פעם לא לוקח הודעה אחת. זה לוקח שתים־עשרה הודעות, לאורך ארבעה ימים, ולפעמים זה פשוט לא קורה.",
    versusHead: "הודעות",
    versus: [
      {
        dimension: "למצוא תאריך",
        whatsapp: '"מתי נפגשים?" · "איזה יום נוח לך?" · תזכורת שלושה ימים אחר כך',
        ittsui: "יום ושעה שכבר נבחרו, פעם אחת ולתמיד, בהגדרה.",
      },
      {
        dimension: "למצוא מקום",
        whatsapp: "לחפש בית קפה, לבדוק שעות פתיחה, לשלוח שלושה קישורים, לחכות לתגובה",
        ittsui: "כתובת אמיתית שמוצעת לכם, עם חלופה אם היא לא מתאימה.",
      },
      {
        dimension: "מה זה דורש מהצד השני",
        whatsapp: "להשתתף בכל המשא ומתן",
        ittsui: 'לפתוח קישור וללחוץ "אני בפנים". בלי להתקין אפליקציה.',
      },
      {
        dimension: "ואחר כך",
        whatsapp: "השרשור ממשיך, וגם ההתראות",
        ittsui: "שקט מוחלט עד היום עצמו.",
      },
    ],
    notWantTitle: "זה לא שאתם לא רוצים.",
    notWantBody:
      "העומס וחוסר הזמן הם שגורמים לנו לאבד קשר עם האנשים שחשובים לנו, בלי שאי פעם החלטנו על כך. Ittsui מקבלת את ההחלטה בשבילכם בכל שבוע; אתם רק אומרים כן.",
    howTitle: "איך זה עובד.",
    steps: [
      {
        title: "הצעה אחת בשבוע",
        body: "בכל שבוע מגיעה הצעה אחת בלבד (מקום אמיתי, שעה) שמוכנה לאישור בנגיעה אחת.",
      },
      {
        title: "מי שמוזמן עונה בנגיעה אחת",
        body: 'מגיע קישור ב-SMS או ב-WhatsApp, רואים את המקום ואת השעה, ולוחצים "אני בפנים". בלי להתקין אפליקציה, בלי משא ומתן.',
      },
      {
        title: "ואז כלום",
        body: "אחרי שהמפגש נקבע, שקט מוחלט עד השבוע הבא. הקשר ממשיך בלי שום מאמץ לזכור.",
      },
    ],
    ownRequest: "כבר יודעים מה רוצים לעשות? הציעו מפגש משלכם ←",
    disconnect: "הזכות להתנתק, גם במערכות היחסים שלכם.",
    whyTitle: ["הבעיה היא לא הרצון.", "הבעיה היא הזמן."],
    whyQuote: '"הבעיה היא לא שאנחנו לא רוצים לראות אנשים. הבעיה היא שאין לנו זמן."',
    whyBody:
      "משפט ששמעתי במקרה, ערב אחד בטיול, שנתן ל-Ittsui את הצורה שלה היום: הצעה אחת, החלטה אחת, ואז שום דבר לנהל עד הפעם הבאה.",
    whyLink: "לסיפור המלא ←",
    feedbackTitle: "תגובות ראשונות",
    feedback: [
      { quote: "מהיר, חלק… ה-SMS נקי.", from: "בודק בפריז, 27 באוגוסט 2026 · תורגם מצרפתית" },
      { quote: "עוזר למצוא איש קשר מהר.", from: "בודק בפריז, 27 באוגוסט 2026 · תורגם מצרפתית" },
      { quote: "הממשק יפה… אינטואיטיבי.", from: "סטודנטית אמריקאית בפריז, 27 באוגוסט 2026 · תורגם מאנגלית" },
    ],
    ctaBadge: "הקשר, בלי המאמץ",
    ctaTitle: "לתת זמן אמיתי לאנשים שחשובים לכם.",
    ctaButton: "לשמור רגע ראשון",
    ctaFree: "בחינם: מפגש אחד בחודש. 14 ימי Plus בהרשמה.",
    plusUnit: "/ לחודש",
    plusBody: "במחיר של קפה, כדי לא לאבד קשר עם המשפחה, עם החברים או עם בן או בת הזוג.",
    plusNote: "מפגשים כל שבוע, בלי הגבלה, עם כל מי שחשוב לכם. בלי Plus, מפגש אחד בחודש נשאר בחינם. אפשר לבטל מתי שרוצים.",
    plusButton: "להתחיל עם 14 ימים בחינם",
    plusCode: "קוד FONDATEUR: הנחה של 50% למשך 3 חודשים, ל-100 המצטרפים הראשונים.",
    mobile: "Ittsui בנייד ←",
  },
};

const STEP_ICONS = [IconSparkles, IconCheck, IconCalendarX];

export function HomeView({ lang }: { lang: Locale }) {
  const t = COPY[lang];
  const app = (href: string) => withLang(href, lang);

  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <DocumentLang lang={lang} />
      <NativeLanguagePicker lang={lang} />
      <HeaderNav lang={lang} />

      {/* Hero — the copy on the left, a working demonstration on the
          right, both on the first screen at lg: and stacked in that order
          on mobile.

          The ambient footage is a background layer on this section, not a
          card inside it: the sandbox has to stay the only thing that looks
          tappable. See AmbientHeroVideo.tsx. `relative` here is what the
          absolutely-positioned layer anchors to; `isolate` keeps the
          stacking context local so the sticky header is unaffected. */}
      <section className="relative isolate -mt-[68px] flex min-h-[86vh] items-center overflow-hidden px-6 pb-16 pt-[104px] sm:pb-24 lg:min-h-[92vh]">
        <AmbientHeroVideo />
        <div className="relative mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <Reveal className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-start">
            <span
              className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: "rgba(255,253,249,0.10)",
                color: CREAM,
                border: "1px solid rgba(255,253,249,0.22)",
                backdropFilter: "blur(6px)",
              }}
            >
              {t.badge}
            </span>
            {/* Sized down at the small end of the clamp on purpose: at
                2.25rem this headline ran four lines on a 390px screen and
                pushed the interactive card entirely off the first screen,
                which is the one thing this rewrite exists to prevent. */}
            <h1
              className="mt-3.5 leading-[1.08]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(2rem, 4.8vw, 3.75rem)",
                color: CREAM,
                textShadow: "0 1px 30px rgba(12,10,9,0.55)",
              }}
            >
              {t.title}
            </h1>
            <p
              className="mx-auto mt-4 max-w-md text-[15px] sm:text-[17px] lg:mx-0"
              style={{ color: "rgba(255,253,249,0.82)", textShadow: "0 1px 18px rgba(12,10,9,0.5)" }}
            >
              {t.lede}
            </p>

            <div className="mx-auto mt-5 max-w-md sm:mt-7 lg:mx-0">
              <StartRitualField onDark lang={lang} />
            </div>

            {/* The lower-commitment entry point: a one-off rendez-vous for
                someone not ready for a standing weekly ritual. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm lg:justify-start">
              <Link href={app("/request/new")} className="underline underline-offset-4" style={{ color: "rgba(255,253,249,0.78)" }}>
                {t.oneOff}
              </Link>
            </div>

            {/* The kanji stays, explained. Leaving 一対 as an unglossed
                graphic next to an opaque name was half of "le nom ne lui
                parle pas" — a footnote costs one line and turns it from
                a barrier into the thing that makes the name memorable. */}
            <p className="mt-4 text-xs sm:mt-6" style={{ color: "rgba(255,253,249,0.62)" }}>
              <span style={{ fontFamily: "var(--font-display)" }}>{t.kanjiName}</span>
              {t.kanjiGloss}
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-8 w-full max-w-xl sm:mt-12 lg:mx-0 lg:mt-0 lg:max-w-none">
            <DuoSandbox lang={lang} />
          </Reveal>
        </div>
      </section>

      {/* Why not just send a text — the comparison that decides whether
          someone switches. */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            {t.versusTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: MUTED }}>
            {t.versusLede}
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="overflow-hidden rounded-3xl border bg-white" style={{ borderColor: BORDER }}>
            <div
              className="grid grid-cols-[1fr_1fr] border-b text-xs uppercase tracking-[0.12em] sm:grid-cols-[10rem_1fr_1fr]"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              <div className="hidden px-5 py-3 sm:block" />
              <div className="px-5 py-3">{t.versusHead}</div>
              <div className="px-5 py-3" style={{ color: ACCENT }}>
                Ittsui
              </div>
            </div>
            {t.versus.map((row) => (
              <div
                key={row.dimension}
                className="grid grid-cols-[1fr_1fr] border-b text-sm last:border-b-0 sm:grid-cols-[10rem_1fr_1fr]"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="col-span-2 px-5 pb-1 pt-4 text-xs font-medium sm:col-span-1 sm:py-5 sm:text-sm"
                  style={{ color: INK }}
                >
                  {row.dimension}
                </div>
                <div className="px-5 py-4 text-xs leading-relaxed sm:py-5 sm:text-sm" style={{ color: MUTED }}>
                  {row.whatsapp}
                </div>
                <div className="px-5 py-4 text-xs leading-relaxed sm:py-5 sm:text-sm" style={{ color: INK }}>
                  {row.ittsui}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-8 max-w-xl">
          <div className="flex items-start gap-4 rounded-2xl border p-5" style={{ borderColor: BORDER, backgroundColor: "white" }}>
            <MascotAvatar characterId="kokoro" variant="bust" size={40} className="shrink-0" />
            <div>
              <p className="text-sm font-medium">{t.notWantTitle}</p>
              <p className="mt-1 text-sm" style={{ color: MUTED }}>
                {t.notWantBody}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            {t.howTitle}
          </h2>
        </Reveal>

        <Reveal className="mx-auto mt-14 max-w-2xl">
          <ol className="space-y-10">
            {t.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={step.title} className="flex gap-6">
                  <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                    {`0${i + 1}`}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                      {step.title}
                      <span style={{ color: MUTED }}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </h3>
                    <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                      {step.body}
                    </p>
                    {/* Was cream-on-cream (copied from the hero's link
                        colour), so it was invisible on this section. */}
                    {i === 0 && (
                      <p className="mt-2 text-sm">
                        <Link href={app("/request/new")} className="underline underline-offset-4" style={{ color: ACCENT }}>
                          {t.ownRequest}
                        </Link>
                      </p>
                    )}
                    {i === 2 && (
                      <p className="mt-1 text-sm" style={{ color: MUTED }}>
                        {t.disconnect}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </section>

      {/* Early access email capture — real feature request: visible on
          the first page, not buried in a footer or a separate page. Sits
          below the mechanic rather than next to the hero, so there is
          only ever one field asking for something at a time. */}
      <section className="border-t px-6 py-16" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md">
          <EarlyAccessForm lang={lang} />
        </Reveal>
      </section>

      {/* The "why" — real origin story, not new marketing copy. Both
          quotes below are verbatim from /a-propos, not written for this
          section; the only thing new here is surfacing them on the
          homepage instead of leaving them one click away. */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            {t.whyTitle[0]}
            <br />
            {t.whyTitle[1]}
          </h2>
          <p
            className="mx-auto mt-6 max-w-md text-[17px] italic"
            style={{ fontFamily: "var(--font-display)", color: INK }}
          >
            {t.whyQuote}
          </p>
          <p className="mx-auto mt-4 max-w-sm text-sm" style={{ color: MUTED }}>
            {t.whyBody}
          </p>
          <Link
            href={pagePath("about", lang)}
            className="mt-5 inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
            style={{ color: INK }}
          >
            {t.whyLink}
          </Link>
        </Reveal>
      </section>

      {/* Real, unedited quotes from early testers — never fabricated,
          never a star rating or a fake name. See AGENTS.md's standing
          position on this: authentic-but-anonymous beats persuasive but
          invented every time. The translated pages say when a quote is a
          translation. */}
      <section className="border-t px-6 py-16 sm:py-20" style={{ borderColor: BORDER, backgroundColor: `${ACCENT}08` }}>
        <Reveal className="mx-auto max-w-2xl">
          <p className="text-center text-xs uppercase tracking-[0.14em]" style={{ color: MUTED }}>
            {t.feedbackTitle}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {t.feedback.map((item) => (
              <div key={item.quote} className="rounded-xl border bg-white p-4 text-sm" style={{ borderColor: BORDER }}>
                <p aria-hidden="true" className="leading-none" style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: `${ACCENT}66` }}>
                  &ldquo;
                </p>
                <p className="-mt-2" style={{ color: INK }}>
                  {item.quote}
                </p>
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  — {item.from}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Footer CTA */}
      <section id="plus" className="border-t px-6 py-24 text-center sm:py-32" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md">
          <span
            className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium"
            style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
          >
            {t.ctaBadge}
          </span>
          <p
            className="mt-5"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)" }}
          >
            {t.ctaTitle}
          </p>
          <Link
            href={app("/setup")}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            {t.ctaButton}
            <IconArrowRight className="rtl:-scale-x-100 h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: MUTED }}>
            {t.ctaFree}
          </p>

          {/* Ittsui Plus — given its own real moment rather than a small
              footnote caption, per direct product/pricing feedback: lead
              with what a subscription actually protects (a specific
              relationship — family, ami, partenaire), not a vague feature
              list. 4,99 €/mois (since 2026-10-22; each currency's amount is in lib/planConfig.ts) is a deliberate price point, not a placeholder.
              No fabricated feature list: "à venir" stays honest about what
              Plus doesn't concretely include yet. Links to /dashboard
              rather than starting checkout directly from this public,
              unauthenticated page: purchase is pair-scoped (see
              lib/types.ts's Pair.subscriptionStatus) and /dashboard
              already redirects to /setup on its own when nobody is signed
              in. */}
          <div className="mt-8 rounded-2xl border p-6 text-start" style={{ borderColor: BORDER, backgroundColor: "white" }}>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                Ittsui Plus
              </p>
              <p className="text-sm" style={{ color: MUTED }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.5rem", color: INK }}>
                  {plusOffer(lang).label}
                </span>{" "}
                {t.plusUnit}
              </p>
            </div>
            <p className="mt-2 text-sm" style={{ color: INK }}>
              {t.plusBody}
            </p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>
              {t.plusNote}
            </p>
            <p className="mt-2 text-xs font-medium" style={{ color: ACCENT }}>
              {t.plusCode}
            </p>
            <Link
              href={app("/dashboard")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: ACCENT }}
            >
              {t.plusButton}
              <IconArrowRight className="rtl:-scale-x-100 h-3.5 w-3.5" />
            </Link>
          </div>

          <Link
            href={pagePath("download", lang)}
            className="mt-6 inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
            style={{ color: INK }}
          >
            {t.mobile}
          </Link>
        </Reveal>
      </section>

      <SiteFooter page="home" lang={lang} />
    </main>
  );
}
