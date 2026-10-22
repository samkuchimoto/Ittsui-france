// /app/components/site/AboutView.tsx
// /a-propos, /en/about, /ja/about.
// Real early testers (both met in Paris) independently asked for
// this: "what's the background," "what's the context," "why does this
// exist." The founder's own account below is the honest answer — this
// page exists because that specific, repeated feedback asked for it, not
// as a persuasion device. No testimonials, quotes, or claims from anyone
// but the founder appear here — see AGENTS.md / CLAUDE.md's standing
// position against fabricated social proof.

import { fraunces, workSans } from "@/app/fonts";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { withLang, type Locale } from "@/lib/i18n";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { SubpageTop } from "@/app/components/site/SubpageTop";
import { localeTypography } from "@/app/components/site/typography";

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="my-10 border-s-2 py-1 ps-6 text-xl leading-snug"
      style={{ borderColor: ACCENT, fontFamily: "var(--font-display)", fontWeight: 500, fontStyle: "italic" }}
    >
      {children}
    </blockquote>
  );
}

type Copy = { title: string; intro: string; before: string[]; quote: string; after: string[]; cta: string };

const COPY: Record<Locale, Copy> = {
  fr: {
    title: "Pourquoi Ittsui existe.",
    intro: "L'histoire réelle derrière le projet — pas une plaquette, juste ce qui s'est passé.",
    before: [
      "Avant Ittsui, j'ai passé six mois à faire du wwoofing — du volontariat dans des fermes biologiques — à Yugawara puis à Negoro, dans la préfecture de Wakayama, au Japon. De longues journées simples : la terre, les saisons, peu de bruit. C'est là qu'une question a commencé à me travailler, sans que je sache encore quoi en faire : dans une ville immense comme Tokyo, entouré de millions de gens, comment est-ce qu'on finit quand même par se sentir seul ?",
      "Le voyage a continué sac au dos, de Berlin vers Prague. Un soir, arrivé tard, l'auberge où j'avais prévu de dormir était déjà fermée pour la nuit. J'en ai trouvé une autre. C'est là que j'ai rencontré une voyageuse japonaise, seule elle aussi, et qu'on a fini par parler de cette idée encore floue d'application.",
      "Sa première réaction a été de clarifier ce que ce n'était pas : pas un réseau social, pas un endroit pour parler à des inconnus — quelque chose dont elle m'a dit se méfier naturellement, en particulier en tant que femme. Mais ce qu'elle a dit ensuite a changé la direction du projet.",
    ],
    quote: "« Le problème, ce n'est pas qu'on n'a pas envie de voir les gens. C'est qu'on n'a pas le temps. »",
    after: [
      "Elle m'a expliqué sa réalité à Tokyo : des journées de travail de huit à dix heures, parfois plus, des semaines pleines du lundi au vendredi, un dimanche qui sert surtout à récupérer. Concrètement, il ne reste que le vendredi ou le samedi soir pour organiser quoi que ce soit avec quelqu'un — et encore faut-il avoir l'énergie de s'en occuper. Selon elle, ce n'est pas près de changer, ni dans dix ans, ni dans vingt.",
      "Ce n'est donc pas un problème d'envie. C'est un problème de charge : celle de devoir sans cesse proposer, relancer, caler un horaire, gérer le fil de discussion qui finit par s'éteindre faute de temps pour y répondre. Ajouter une application de plus à consulter n'aurait rien réglé — ça aurait juste ajouté une charge de plus.",
      "C'est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme actuelle : une seule proposition, une seule décision, puis plus rien à gérer jusqu'à la prochaine fois. Le silence entre les deux n'est pas un manque de fonctionnalités — c'est le point.",
      "Le projet reste jeune, construit par une seule personne, et continue d'évoluer au contact de vraies conversations avec de vrais premiers utilisateurs, rencontrés directement à Paris. Cette page existe parce que plusieurs d'entre eux ont posé la même question, honnêtement : « c'est quoi, le contexte ? » — la voici.",
    ],
    cta: "Découvrir Ittsui",
  },
  en: {
    title: "Why Ittsui exists.",
    intro: "The real story behind the project: not a brochure, just what happened.",
    before: [
      "Before Ittsui, I spent six months wwoofing (volunteering on organic farms) in Yugawara, then in Negoro, in Wakayama Prefecture, Japan. Long, simple days: the soil, the seasons, very little noise. That's where a question started working on me, before I knew what to do with it: in a huge city like Tokyo, surrounded by millions of people, how do you still end up feeling alone?",
      "The journey went on with a backpack, from Berlin to Prague. One evening, arriving late, I found the hostel I had planned to sleep in already closed for the night. I found another one. That's where I met a Japanese traveller, also on her own, and we ended up talking about this still-vague idea for an app.",
      "Her first reaction was to make clear what it wasn't: not a social network, not a place to talk to strangers, something she said she was naturally wary of, especially as a woman. But what she said next changed the direction of the project.",
    ],
    quote: "“The problem isn't that we don't want to see people. It's that we don't have the time.”",
    after: [
      "She described her reality in Tokyo: working days of eight to ten hours, sometimes more, full weeks from Monday to Friday, and a Sunday mostly spent recovering. In practice, only Friday or Saturday evening is left to organise anything with anyone, and you still need the energy for it. According to her, that isn't about to change, not in ten years, not in twenty.",
      "So it isn't a problem of wanting to. It's a problem of load: having to keep suggesting, following up, finding a time, managing the conversation thread that ends up dying for lack of time to answer it. Adding one more app to check wouldn't have solved anything; it would just have added one more thing to carry.",
      "That observation, not a starting idea, is what gave Ittsui its current shape: one proposal, one decision, then nothing left to manage until next time. The silence in between isn't a lack of features. It's the point.",
      "The project is still young, built by one person, and keeps evolving through real conversations with real early users, met in person in Paris. This page exists because several of them asked the same honest question: “what's the context?” Here it is.",
    ],
    cta: "Discover Ittsui",
  },
  ja: {
    title: "Ittsuiが生まれた理由。",
    intro: "このプロジェクトの本当の話です。パンフレットではなく、実際に起きたことだけを。",
    before: [
      "Ittsuiをつくる前、私は日本で6か月間、WWOOF（有機農場でのボランティア）をしていました。最初は湯河原、次に和歌山県の根来です。土と季節と静けさだけの、長くてシンプルな毎日。そこで、まだ答えの出ないひとつの問いが頭から離れなくなりました。何百万人もの人に囲まれた東京のような大都市で、それでも人はなぜ孤独を感じてしまうのだろう？",
      "旅はバックパックを背負って続き、ベルリンからプラハへ。ある晩、遅くに着くと、泊まるつもりだったホステルはもう閉まっていました。別の宿を見つけ、そこで、同じくひとり旅をしていた日本人の女性に出会いました。話すうちに、まだぼんやりしていたアプリのアイデアの話になりました。",
      "彼女が最初にしたのは、これが何ではないかをはっきりさせることでした。SNSでもなく、知らない人と話す場所でもない。そういうものには、特に女性として自然と警戒してしまう、と。でも、そのあとに彼女が言った言葉が、プロジェクトの方向を変えました。",
    ],
    quote: "「人に会いたくないわけじゃない。時間がないだけ。」",
    after: [
      "彼女は東京での日常を話してくれました。1日8〜10時間、ときにはそれ以上働き、月曜から金曜までびっしり。日曜日はほとんど回復のために使う。実際に誰かと何かを計画できるのは金曜か土曜の夜だけで、それも気力が残っていればの話です。彼女によれば、それは10年後も20年後も変わらないだろう、と。",
      "だから、問題は気持ちではありません。負担なのです。何度も提案し、催促し、時間を合わせ、返事をする時間がないまま途切れていくスレッドを管理し続けること。確認するアプリがもうひとつ増えても、何も解決しません。負担がひとつ増えるだけです。",
      "最初のアイデアではなく、この気づきが、今のIttsuiの形をつくりました。提案はひとつ、決めることもひとつ。あとは次回まで何もしなくていい。その間の静けさは、機能が足りないのではありません。それこそが狙いです。",
      "このプロジェクトはまだ若く、ひとりでつくっています。パリで直接出会った最初のユーザーたちとの本当の会話を通して、今も変わり続けています。このページがあるのは、彼らの何人もが同じ質問を正直にしてくれたからです。「そもそも、どういう経緯なの？」その答えが、これです。",
    ],
    cta: "Ittsuiを見てみる",
  },
  es: {
    title: "Por qué existe Ittsui.",
    intro: "La historia real detrás del proyecto: no es un folleto, solo lo que pasó.",
    before: [
      "Antes de Ittsui, pasé seis meses haciendo wwoofing (voluntariado en granjas orgánicas) en Yugawara y luego en Negoro, en la prefectura de Wakayama, en Japón. Días largos y sencillos: la tierra, las estaciones, muy poco ruido. Ahí empezó a darme vueltas una pregunta, antes de saber qué hacer con ella: en una ciudad enorme como Tokio, rodeado de millones de personas, ¿cómo es que uno termina sintiéndose solo?",
      "El viaje siguió con mochila, de Berlín a Praga. Una noche llegué tarde y encontré cerrado el hostal donde pensaba dormir. Encontré otro. Ahí conocí a una viajera japonesa, también sola, y terminamos hablando de esta idea, todavía vaga, de una app.",
      "Su primera reacción fue dejar claro lo que no era: no una red social, no un lugar para hablar con desconocidos, algo de lo que, según dijo, desconfiaba por naturaleza, sobre todo como mujer. Pero lo que dijo después cambió el rumbo del proyecto.",
    ],
    quote: "“El problema no es que no queramos ver a la gente. Es que no tenemos tiempo.”",
    after: [
      "Me describió su realidad en Tokio: jornadas de ocho a diez horas, a veces más, semanas completas de lunes a viernes y un domingo que se va casi todo en recuperarse. En la práctica, solo queda el viernes o el sábado por la noche para organizar algo con alguien, y aun así hace falta tener energía. Según ella, eso no va a cambiar, ni en diez años ni en veinte.",
      "Entonces no es un problema de ganas. Es un problema de carga: tener que proponer una y otra vez, insistir, encontrar un horario, sostener la conversación que termina muriendo por falta de tiempo para contestarla. Agregar una app más que revisar no habría resuelto nada; solo habría sumado una cosa más que cargar.",
      "Esa observación, y no una idea de partida, es lo que le dio a Ittsui su forma actual: una propuesta, una decisión y luego nada que gestionar hasta la próxima vez. El silencio de en medio no es falta de funciones. Es justamente la idea.",
      "El proyecto todavía es joven, lo construye una sola persona y sigue evolucionando gracias a conversaciones reales con los primeros usuarios, conocidos en persona en París. Esta página existe porque varios de ellos hicieron la misma pregunta honesta: “¿cuál es el contexto?”. Aquí está.",
    ],
    cta: "Descubre Ittsui",
  },
  he: {
    title: "למה Ittsui קיימת.",
    intro: "הסיפור האמיתי מאחורי הפרויקט: לא חוברת שיווקית, רק מה שקרה.",
    before: [
      "לפני Ittsui, ביליתי שישה חודשים בווּפינג (התנדבות בחוות אורגניות) ביוגווארה, ואחר כך בנגורו, במחוז וואקאיאמה ביפן. ימים ארוכים ופשוטים: האדמה, העונות, מעט מאוד רעש. שם התחילה להעסיק אותי שאלה, עוד לפני שידעתי מה לעשות איתה: בעיר ענקית כמו טוקיו, מוקפים במיליוני אנשים, איך בכל זאת מרגישים לבד?",
      "המסע המשיך עם תרמיל, מברלין לפראג. ערב אחד הגעתי מאוחר, ומצאתי את ההוסטל שתכננתי לישון בו סגור ללילה. מצאתי אחר. שם פגשתי מטיילת יפנית, גם היא לבד, ומצאנו את עצמנו מדברים על רעיון עדיין מעורפל לאפליקציה.",
      "התגובה הראשונה שלה הייתה להבהיר מה זה לא: לא רשת חברתית, לא מקום לדבר עם זרים, דבר שלדבריה היא נזהרת ממנו מטבעה, במיוחד כאישה. אבל מה שאמרה אחר כך שינה את כיוון הפרויקט.",
    ],
    quote: '"הבעיה היא לא שאנחנו לא רוצים לראות אנשים. הבעיה היא שאין לנו זמן."',
    after: [
      "היא תיארה את המציאות שלה בטוקיו: ימי עבודה של שמונה עד עשר שעות, לפעמים יותר, שבועות מלאים מיום שני עד שישי, ויום ראשון שהולך בעיקר על התאוששות. בפועל, נשאר רק שישי או שבת בערב כדי לארגן משהו עם מישהו, וגם אז צריך כוח. לדבריה, זה לא עומד להשתנות, לא בעוד עשר שנים ולא בעוד עשרים.",
      "אז זו לא בעיה של רצון. זו בעיה של עומס: להציע שוב ושוב, להזכיר, למצוא זמן, לנהל את השרשור שבסוף גווע כי אין זמן לענות. עוד אפליקציה שצריך לבדוק לא הייתה פותרת כלום; היא רק הייתה מוסיפה עוד דבר לסחוב.",
      "התובנה הזו, ולא רעיון מוכן מראש, היא שנתנה ל-Ittsui את הצורה שלה היום: הצעה אחת, החלטה אחת, ואז שום דבר לנהל עד הפעם הבאה. השקט שבאמצע הוא לא חוסר בפיצ׳רים. זו כל הנקודה.",
      'הפרויקט עדיין צעיר, נבנה על ידי אדם אחד, וממשיך להתפתח מתוך שיחות אמיתיות עם משתמשים ראשונים, שפגשתי פנים אל פנים בפריז. הדף הזה קיים כי כמה מהם שאלו את אותה שאלה כנה: "מה ההקשר?" אז הנה הוא.',
    ],
    cta: "הכירו את Ittsui",
  },
};

export function AboutView({ lang }: { lang: Locale }) {
  const t = COPY[lang];
  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <DocumentLang lang={lang} />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <SubpageTop page="about" lang={lang} />

        <PageMascotHeader lang={lang} />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2rem, 4vw, 2.5rem)" }}>
          {t.title}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: MUTED }}>
          {t.intro}
        </p>

        <div className="mt-10 space-y-5 text-[17px] leading-relaxed" style={{ color: INK }}>
          {t.before.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}

          <Pullquote>{t.quote}</Pullquote>

          {t.after.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-14 border-t pt-8" style={{ borderColor: BORDER }}>
          <Link
            href={withLang("/setup", lang)}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            {t.cta}
          </Link>
        </div>
      </div>
    </main>
  );
}
