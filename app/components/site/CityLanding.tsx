// /app/components/site/CityLanding.tsx
// One landing page per city and language (lib/cities.ts, City.landing):
// /paris, /en/<city>, /ja/tokyo, /es/ciudad-de-mexico, /he/tel-aviv, for
// ads and links. The homepage's proposition, then only what is true in that
// city (its clock, where the place suggestions come from, the price in its
// currency) and the two ways in, with the city already chosen; then the
// venue pilot's terms (lib/venuePilot.ts). Each view is counted by city and
// language (LandingBeacon), with no identifier.

import Link from "next/link";
import type { Metadata } from "next";
import { fraunces, workSans } from "@/app/fonts";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { CITIES, CITY_IDS, type CityId } from "@/lib/cities";
import { DATE_LOCALE, LOCALE_LABEL, OG_LOCALE, dirOf, pagePath, withLang, type Locale } from "@/lib/i18n";
import { plusOffer } from "@/lib/planConfig";
import { VENUE_PILOT } from "@/lib/venuePilot";
import { DocumentLang } from "@/app/components/site/DocumentLang";
import { SiteFooter } from "@/app/components/site/SiteFooter";
import { LandingBeacon } from "@/app/components/site/LandingBeacon";
import { localeTypography } from "@/app/components/site/typography";

type Copy = {
  metaTitle: string;
  home: string;
  badge: string;
  title: string;
  lede: string;
  primary: string;
  secondary: string;
  factsTitle: string;
  timeTitle: string;
  timeBody: string;
  /** Appended to timeBody where the clocks change during the year. */
  clockChange: string;
  placesTitle: string;
  placesCurated: string;
  placesOpenData: string;
  priceTitle: string;
  priceBody: string;
  venueTitle: string;
  venueSignUp: string;
  venueWrite: string;
  /** Prefilled in the email a venue sends to join (lib/venuePilot.ts terms). */
  venueMail: string;
  otherCities: string;
};

const COPY: Record<Locale, Copy> = {
  fr: {
    metaTitle: "Ittsui à {city} · Une proposition. Une décision.",
    home: "← Ittsui",
    badge: "Ittsui à {city}",
    title: "Une proposition. Une décision. Plus de temps avec les personnes qui comptent.",
    lede: "Ittsui propose un lieu à {city} et un horaire, pour vous et un proche. Vous validez en un geste ; votre proche répond depuis un lien, sans rien installer.",
    primary: "Proposer un rendez-vous à {city}",
    secondary: "Créer un rituel chaque semaine",
    factsTitle: "Ce qu'Ittsui fait à {city}",
    timeTitle: "À l'heure de {city}",
    timeBody: "Propositions, confirmations et invitations d'agenda suivent le fuseau de {city} ({zone}).",
    clockChange: " Changement d'heure compris.",
    placesTitle: "De vrais lieux",
    placesCurated: "Les suggestions viennent d'une sélection de vrais cafés, restaurants, parcs et musées de {city}.",
    placesOpenData: "Les suggestions viennent d'OpenStreetMap autour de {city}. Ittsui n'a pas encore de lieu partenaire à {city} : vérifiez les horaires avant d'y aller.",
    priceTitle: "Gratuit pour commencer",
    priceBody: "Un rendez-vous par mois est gratuit, avec 14 jours de Plus à l'inscription. Ittsui Plus, chaque semaine et sans limite : {price} par mois, sans engagement.",
    venueTitle: "Vous tenez un café ou un lieu à {city} ?",
    venueSignUp: "Rejoindre le pilote",
    venueWrite: "Rejoindre le pilote par e-mail",
    venueMail: "Nom du lieu :\nAdresse :\nVotre nom et rôle :\nTéléphone :\nHeures creuses (jours et horaires) :\nAvantage pour les personnes envoyées par Ittsui :\n\nNous souhaitons rejoindre le pilote partenaires d'Ittsui aux conditions de {url}",
    otherCities: "Ittsui est aussi à",
  },
  en: {
    metaTitle: "Ittsui in {city} · One proposal. One decision.",
    home: "← Ittsui",
    badge: "Ittsui in {city}",
    title: "One proposal. One decision. More time with the people who matter.",
    lede: "Ittsui suggests a place in {city} and a time for you and someone close. You confirm in one tap; they answer from a link, with nothing to install.",
    primary: "Propose a rendez-vous in {city}",
    secondary: "Set up a weekly ritual",
    factsTitle: "What Ittsui does in {city}",
    timeTitle: "On {city} time",
    timeBody: "Proposals, confirmations and calendar invites follow {city}'s time zone ({zone}).",
    clockChange: " Clock changes included.",
    placesTitle: "Real places",
    placesCurated: "Suggestions come from a hand-picked list of real cafés, restaurants, parks and museums in {city}.",
    placesOpenData: "Suggestions come from OpenStreetMap around {city}. Ittsui has no partner venues in {city} yet, so check opening hours before you go.",
    priceTitle: "Free to start",
    priceBody: "One rendez-vous a month is free, with 14 days of Plus when you sign up. Ittsui Plus, every week with no limit: {price} a month, cancel anytime.",
    venueTitle: "Do you run a café or a venue in {city}?",
    venueSignUp: "Join the pilot (form in French)",
    venueWrite: "Join the pilot by email",
    venueMail: "Venue name:\nAddress:\nYour name and role:\nPhone:\nQuiet hours (days and times):\nPerk for the people Ittsui sends:\n\nWe would like to join the Ittsui partner pilot on the terms at {url}",
    otherCities: "Ittsui is also in",
  },
  ja: {
    metaTitle: "Ittsui {city} · 提案はひとつ。決めるのは一度。",
    home: "← Ittsui",
    badge: "Ittsui · {city}",
    title: "提案はひとつ。決めるのは一度。大切な人との時間を、もっと。",
    lede: "{city}の場所と時間を、あなたと大切な人のためにIttsuiが提案します。あなたはワンタップで確定、相手はリンクから返事をするだけ。インストールは不要です。",
    primary: "{city}で約束を提案する",
    secondary: "毎週の習慣をつくる",
    factsTitle: "{city}でのIttsui",
    timeTitle: "{city}の時間で",
    timeBody: "提案、確定のお知らせ、カレンダーの招待は、すべて{city}のタイムゾーン（{zone}）で届きます。",
    clockChange: "サマータイムの切り替えにも対応しています。",
    placesTitle: "実在する場所",
    placesCurated: "提案は、{city}に実在するカフェ、レストラン、公園、美術館の厳選リストから選ばれます。",
    placesOpenData: "提案は、{city}周辺のOpenStreetMapのデータから選ばれます。{city}にはまだ提携店がないため、お出かけ前に営業時間をご確認ください。",
    priceTitle: "無料で始められます",
    priceBody: "月1回の約束は無料。登録すると14日間Plusをお試しいただけます。Ittsui Plusは毎週、回数の制限なしで月額{price}。いつでも解約できます。",
    venueTitle: "{city}でカフェやお店を営んでいますか？",
    venueSignUp: "試験運用に参加する（フランス語のフォーム）",
    venueWrite: "メールで試験運用に参加する",
    venueMail: "店名：\n住所：\nお名前と役職：\n電話番号：\n空いている時間帯（曜日と時間）：\nIttsuiからのお客さまへの特典：\n\n{url} の条件で、Ittsuiの提携店の試験運用に参加を希望します。",
    otherCities: "Ittsuiはこちらの都市でも",
  },
  es: {
    metaTitle: "Ittsui en {city} · Una propuesta. Una decisión.",
    home: "← Ittsui",
    badge: "Ittsui en {city}",
    title: "Una propuesta. Una decisión. Más tiempo con la gente que importa.",
    lede: "Ittsui sugiere un lugar en {city} y una hora para ti y alguien cercano. Confirmas con un toque; la otra persona responde desde un enlace, sin instalar nada.",
    primary: "Proponer un encuentro en {city}",
    secondary: "Crear un ritual semanal",
    factsTitle: "Qué hace Ittsui en {city}",
    timeTitle: "A la hora de {city}",
    timeBody: "Las propuestas, confirmaciones e invitaciones de calendario siguen la zona horaria de {city} ({zone}).",
    clockChange: " Incluye el cambio de horario.",
    placesTitle: "Lugares reales",
    placesCurated: "Las sugerencias vienen de una selección de cafés, restaurantes, parques y museos reales de {city}.",
    placesOpenData: "Las sugerencias vienen de OpenStreetMap alrededor de {city}. Ittsui todavía no tiene lugares aliados en {city}: revisa los horarios antes de ir.",
    priceTitle: "Gratis para empezar",
    priceBody: "Un encuentro al mes es gratis, con 14 días de Plus al registrarte. Ittsui Plus, cada semana y sin límite: {price} al mes, cancela cuando quieras.",
    venueTitle: "¿Tienes un café o un local en {city}?",
    venueSignUp: "Unirme al piloto (formulario en francés)",
    venueWrite: "Unirme al piloto por correo",
    venueMail: "Nombre del lugar:\nDirección:\nTu nombre y puesto:\nTeléfono:\nHorarios tranquilos (días y horas):\nBeneficio para las personas que envía Ittsui:\n\nQueremos unirnos al piloto de aliados de Ittsui con las condiciones de {url}",
    otherCities: "Ittsui también está en",
  },
  he: {
    metaTitle: "Ittsui ב{city} · הצעה אחת. החלטה אחת.",
    home: "→ Ittsui",
    badge: "Ittsui ב{city}",
    title: "הצעה אחת. החלטה אחת. יותר זמן עם האנשים שחשובים לכם.",
    lede: "Ittsui מציעה מקום ב{city} ושעה, לכם ולמישהו קרוב. מאשרים בנגיעה אחת, והצד השני עונה מקישור, בלי להתקין כלום.",
    primary: "להציע מפגש ב{city}",
    secondary: "ליצור ריטואל שבועי",
    factsTitle: "מה Ittsui עושה ב{city}",
    timeTitle: "לפי השעון של {city}",
    timeBody: "הצעות, אישורים והזמנות ליומן לפי אזור הזמן של {city} ({zone}).",
    clockChange: " כולל המעבר לשעון קיץ.",
    placesTitle: "מקומות אמיתיים",
    placesCurated: "ההצעות מגיעות מרשימה נבחרת של בתי קפה, מסעדות, פארקים ומוזיאונים אמיתיים ב{city}.",
    placesOpenData: "ההצעות מגיעות מ-OpenStreetMap באזור {city}. עדיין אין ל-Ittsui בתי עסק שותפים ב{city}, אז כדאי לבדוק שעות פתיחה לפני שיוצאים.",
    priceTitle: "בחינם בהתחלה",
    priceBody: "מפגש אחד בחודש בחינם, עם 14 ימי Plus בהרשמה. Ittsui Plus, כל שבוע בלי הגבלה: {price} לחודש, אפשר לבטל מתי שרוצים.",
    venueTitle: "יש לכם בית קפה או מקום ב{city}?",
    venueSignUp: "הצטרפות לפיילוט (טופס בצרפתית)",
    venueWrite: "הצטרפות לפיילוט במייל",
    venueMail: "שם המקום:\nכתובת:\nשם ותפקיד:\nטלפון:\nשעות שקטות (ימים ושעות):\nהטבה לאנשים ש-Ittsui שולחת:\n\nנשמח להצטרף לפיילוט השותפים של Ittsui בתנאים שב-{url}",
    otherCities: "Ittsui נמצאת גם ב:",
  },
};

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);

/** The zone's generic name in the page's language ("Central European Time"), the same in summer and winter. */
function zoneName(timezone: string, lang: Locale): string {
  return (
    new Intl.DateTimeFormat(DATE_LOCALE[lang], { timeZone: timezone, timeZoneName: "longGeneric" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? timezone
  );
}

/** Whether the city's clocks change during the year (Tokyo's and Mexico City's don't). */
function changesClocks(timezone: string): boolean {
  const offset = (month: number) =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "shortOffset" })
      .formatToParts(new Date(Date.UTC(2026, month, 1)))
      .find((part) => part.type === "timeZoneName")?.value;
  return offset(0) !== offset(6);
}

/** A city's page in this language, or in English where it has none. */
const landingHref = (cityId: CityId, lang: Locale) => CITIES[cityId].landing[lang] ?? CITIES[cityId].landing.en!;

function varsFor(cityId: CityId, lang: Locale) {
  const city = CITIES[cityId];
  return { city: city.name[lang], zone: zoneName(city.timezone, lang), price: plusOffer(lang, cityId).label };
}

export function cityLandingMetadata(cityId: CityId, lang: Locale): Metadata {
  const city = CITIES[cityId];
  const vars = varsFor(cityId, lang);
  const title = fill(COPY[lang].metaTitle, vars);
  const description = fill(COPY[lang].lede, vars);
  const path = city.landing[lang]!;
  const languages = Object.fromEntries(Object.entries(city.landing).map(([l, href]) => [l === "es" ? "es-MX" : l, href]));
  return {
    title,
    description,
    alternates: { canonical: path, languages: { ...languages, "x-default": city.landing[city.langs[0]] ?? path } },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Ittsui",
      locale: OG_LOCALE[lang],
      type: "website",
      images: [{ url: "/hero.jpg", width: 1536, height: 1024, alt: "Ittsui" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/hero.jpg"] },
  };
}

export function CityLanding({ cityId, lang }: { cityId: CityId; lang: Locale }) {
  const city = CITIES[cityId];
  const t = COPY[lang];
  const vars = varsFor(cityId, lang);
  const versions = Object.entries(city.landing) as [Locale, string][];
  const facts: [string, string][] = [
    [fill(t.timeTitle, vars), fill(t.timeBody, vars) + (changesClocks(city.timezone) ? t.clockChange : "")],
    [t.placesTitle, fill(city.frenchData ? t.placesCurated : t.placesOpenData, vars)],
    [t.priceTitle, fill(t.priceBody, vars)],
  ];
  const others = CITY_IDS.filter((id) => id !== cityId);
  const pilot = VENUE_PILOT[lang];

  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      dir={dirOf(lang)}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <DocumentLang lang={lang} />
      <LandingBeacon city={cityId} lang={lang} />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between text-sm" style={{ color: MUTED }}>
          <Link href={pagePath("home", lang)} className="hover:underline">
            {t.home}
          </Link>
          {versions.length > 1 && (
            <span className="flex items-center gap-2">
              {versions.map(([l, href], i) => (
                <span key={l} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">|</span>}
                  {l === lang ? (
                    <span style={{ color: INK, fontWeight: 600 }}>{LOCALE_LABEL[l]}</span>
                  ) : (
                    <Link href={href} hrefLang={l} className="hover:underline">
                      {LOCALE_LABEL[l]}
                    </Link>
                  )}
                </span>
              ))}
            </span>
          )}
        </div>

        <span
          className="mt-10 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium"
          style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
        >
          {fill(t.badge, vars)}
        </span>
        <h1 className="mt-4 leading-[1.1]" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          {t.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>
          {fill(t.lede, vars)}
        </p>

        {/* The city goes along (RequestFormClient and SetupClient read ?city=): nothing to choose again. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={withLang(`/request/new?city=${cityId}`, lang)}
            className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            {fill(t.primary, vars)}
          </Link>
          <Link
            href={withLang(`/setup?city=${cityId}`, lang)}
            className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 text-base transition-transform hover:scale-[1.02]"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            {t.secondary}
          </Link>
        </div>

        <h2 className="mt-16 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {fill(t.factsTitle, vars)}
        </h2>
        <dl className="mt-4">
          {facts.map(([title, body]) => (
            <div key={title} className="border-t py-5" style={{ borderColor: BORDER }}>
              <dt className="font-medium">{title}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed" style={{ color: MUTED }}>
                {body}
              </dd>
            </div>
          ))}
        </dl>

        {/* Venues: the pilot's terms (lib/venuePilot.ts), then a way in. Paris has the
            French sign-up form and live matching; elsewhere a venue joins by email,
            and the page says the pilot hasn't started there. */}
        <section id="venues" className="mt-12 rounded-2xl border bg-white p-6" style={{ borderColor: BORDER }}>
          <h2 className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            {fill(t.venueTitle, vars)}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: MUTED }}>
            {pilot.benefit}
          </p>
          <p className="mt-2 text-sm font-medium" style={{ color: INK }}>
            {city.frenchData ? pilot.live : fill(pilot.notYet, vars)}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm leading-relaxed" style={{ color: MUTED }}>
            {pilot.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
          {city.frenchData ? (
            <Link href="/partenaires" hrefLang="fr" className="mt-4 inline-block font-medium underline underline-offset-4" style={{ color: ACCENT }}>
              {t.venueSignUp}
            </Link>
          ) : (
            <a
              href={`mailto:contact@kuchimoto.com?subject=${encodeURIComponent(`Ittsui · ${city.name.en} · partner venue`)}&body=${encodeURIComponent(
                fill(t.venueMail, { url: `https://www.ittsui.fr${city.landing[lang]}#venues` }),
              )}`}
              className="mt-4 inline-block font-medium underline underline-offset-4"
              style={{ color: ACCENT }}
            >
              {t.venueWrite}
            </a>
          )}
        </section>

        <p className="mt-12 text-sm leading-relaxed" style={{ color: MUTED }}>
          {t.otherCities}{" "}
          {others.map((id, i) => (
            <span key={id}>
              {i > 0 && " · "}
              <Link href={landingHref(id, lang)} hrefLang={CITIES[id].landing[lang] ? lang : "en"} className="underline underline-offset-4">
                {CITIES[id].name[lang]}
              </Link>
            </span>
          ))}
        </p>
      </div>
      <SiteFooter page="home" lang={lang} />
    </main>
  );
}
