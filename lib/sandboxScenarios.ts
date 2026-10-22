// /lib/sandboxScenarios.ts
// Data behind the homepage's interactive sandbox — the four duo contexts
// (ami / partenaire / famille / parents) and the real proposal each one
// swaps into the live card.
//
// Why this file exists: the homepage used to show these four as static
// photo tiles with a caption, and a separate static demo card further
// down. Two pieces of real user feedback killed that arrangement —
// "Image not clikable" and "En naviguant au lieu de naviguer c'est la
// confirmation cad satisfaire": a visitor taps a category expecting the
// page to answer, and a dead tile answers nothing. Tapping a context now
// reconfigures the card, which is the product's whole mechanic shown
// rather than described.
//
// Every venue below is a real place, reusing the exact names and
// addresses from lib/venueCatalog.ts's STATIC_CATALOG — the same
// fallback catalog the live weekly-proposal pipeline would draw from, so
// the demo cannot promise a venue the product would never propose.
//
// `metro` is the adjacent station, a stable, checkable fact about a
// fixed address. Deliberately absent, despite being asked for in the
// brief this implements: a numeric "ambient noise rating" and an average
// budget figure. Neither is derivable from a name and an address, and
// neither has a data source in this repo — inventing them would be the
// same mistake as inventing a venue photo. `ambience` is a plain
// descriptive tag instead, which is honest about being a description.

import type { Locale } from "@/lib/i18n";

export type DuoContext = "amis" | "partenaire" | "famille" | "parents";

export interface SandboxVenue {
  name: string;
  /** Short display form used on the card face, e.g. "Café de Flore · Paris 6e". */
  shortLabel: string;
  address: string;
  metro: string;
  ambience: string[];
  photo: string;
  photoAlt: string;
}

export interface SandboxScenario {
  id: DuoContext;
  /** Tile label — unchanged from the static cards these replaced. */
  label: string;
  /** Placeholder name used in the preview of the message the invitee gets. */
  sampleRecipient: string;
  /** Card header form: "Samedi · 15:30". */
  when: string;
  /** Prose form for the message preview: "samedi à 15h30". The header
   *  form reads as a glitch mid-sentence. */
  whenSentence: string;
  tilePhoto: string;
  tileAlt: string;
  primary: SandboxVenue;
  alternative: SandboxVenue;
}

const CAFE_INDUSTRIE: SandboxVenue = {
  name: "Café de l'Industrie",
  shortLabel: "Café de l'Industrie · Paris 11e",
  address: "16 Rue Saint-Sabin, 75011 Paris",
  metro: "Bréguet-Sabin (ligne 5) · Bastille (1, 5, 8)",
  ambience: ["Idéal pour discuter", "Grandes tables", "Bastille"],
  photo: "/friends-cafe-terrace.jpg",
  photoAlt: "Deux amis discutent en terrasse, sur une rue pavée.",
};

const CAFE_FLORE: SandboxVenue = {
  name: "Café de Flore",
  shortLabel: "Café de Flore · Paris 6e",
  address: "172 Bd Saint-Germain, 75006 Paris",
  metro: "Saint-Germain-des-Prés (ligne 4)",
  ambience: ["Terrasse", "Saint-Germain-des-Prés", "Ouvert tard"],
  photo: "/couple-parisian-cafe.jpg",
  photoAlt: "Un café parisien, deux personnes attablées près de la vitre.",
};

const CHEZ_JANOU: SandboxVenue = {
  name: "Chez Janou",
  shortLabel: "Chez Janou · Paris 3e",
  address: "2 Rue Roger Verlomme, 75003 Paris",
  metro: "Chemin Vert (ligne 8)",
  ambience: ["Bistrot provençal", "Le Marais", "Réserver conseillé"],
  photo: "/couple-living-room.jpg",
  photoAlt: "Un couple discute, installé dans la lumière chaude du soir.",
};

const LUXEMBOURG: SandboxVenue = {
  name: "Jardin du Luxembourg",
  shortLabel: "Jardin du Luxembourg · Paris 6e",
  address: "75006 Paris",
  metro: "Odéon (4, 10) · RER B Luxembourg",
  ambience: ["En plein air", "Calme", "Gratuit"],
  photo: "/grandmother-granddaughter-park.jpg",
  photoAlt: "Une grand-mère et sa petite-fille assises sur un banc, dans un parc.",
};

const RODIN: SandboxVenue = {
  name: "Musée Rodin",
  shortLabel: "Musée Rodin · Paris 7e",
  address: "77 Rue de Varenne, 75007 Paris",
  metro: "Varenne (ligne 13) · Invalides (8, 13, RER C)",
  ambience: ["Jardin de sculptures", "Calme", "Une heure suffit"],
  photo: "/hero-father-son-vineyard.jpg.jpg",
  photoAlt: "Un père et son fils adulte marchent côte à côte.",
};

export const SANDBOX_SCENARIOS: SandboxScenario[] = [
  {
    id: "amis",
    label: "Vos ami(e)s proches",
    sampleRecipient: "Thomas",
    when: "Samedi · 15:30",
    whenSentence: "samedi à 15h30",
    tilePhoto: "/friends-cafe-terrace.jpg",
    tileAlt: "Deux amis discutent en terrasse, sur une rue pavée.",
    primary: CAFE_INDUSTRIE,
    alternative: LUXEMBOURG,
  },
  {
    id: "partenaire",
    label: "Votre partenaire",
    sampleRecipient: "Camille",
    when: "Vendredi · 20:00",
    whenSentence: "vendredi à 20h",
    tilePhoto: "/couple-living-room.jpg",
    tileAlt: "Un couple discute, installé sur un canapé, dans la lumière chaude du soir.",
    primary: CHEZ_JANOU,
    alternative: CAFE_FLORE,
  },
  {
    id: "famille",
    label: "Votre famille",
    sampleRecipient: "Mamie",
    when: "Dimanche · 15:00",
    whenSentence: "dimanche à 15h",
    tilePhoto: "/grandmother-granddaughter-park.jpg",
    tileAlt: "Une grand-mère et sa petite-fille assises sur un banc, dans un parc.",
    primary: LUXEMBOURG,
    alternative: CAFE_FLORE,
  },
  {
    id: "parents",
    label: "Vos parents",
    sampleRecipient: "Papa",
    when: "Dimanche · 11:00",
    whenSentence: "dimanche à 11h",
    tilePhoto: "/hero-father-son-vineyard.jpg.jpg",
    tileAlt: "Un père et son fils adulte marchent côte à côte dans les vignes.",
    primary: RODIN,
    alternative: LUXEMBOURG,
  },
];

// The English, Japanese, Spanish and Hebrew homepages run the same demo:
// the same five real places (French names and addresses, because they are
// French addresses), with the descriptions, the duo labels and the sample
// names translated. No local venue is invented for the other cities. The invitee's message is shown in the page's language,
// which is the language the app writes invitations in for that reader.

type VenueText = Pick<SandboxVenue, "shortLabel" | "metro" | "ambience" | "photoAlt">;
const translated = (venue: SandboxVenue, text: VenueText): SandboxVenue => ({ ...venue, ...text });

const EN = {
  industrie: translated(CAFE_INDUSTRIE, {
    shortLabel: "Café de l'Industrie · Paris 11th",
    metro: "Bréguet-Sabin (line 5) · Bastille (1, 5, 8)",
    ambience: ["Good for talking", "Big tables", "Bastille"],
    photoAlt: "Two friends talk on a café terrace, on a cobbled street.",
  }),
  flore: translated(CAFE_FLORE, {
    shortLabel: "Café de Flore · Paris 6th",
    metro: "Saint-Germain-des-Prés (line 4)",
    ambience: ["Terrace", "Saint-Germain-des-Prés", "Open late"],
    photoAlt: "A Parisian café, two people seated by the window.",
  }),
  janou: translated(CHEZ_JANOU, {
    shortLabel: "Chez Janou · Paris 3rd",
    metro: "Chemin Vert (line 8)",
    ambience: ["Provençal bistro", "Le Marais", "Booking advised"],
    photoAlt: "A couple talking in the warm evening light.",
  }),
  luxembourg: translated(LUXEMBOURG, {
    shortLabel: "Jardin du Luxembourg · Paris 6th",
    metro: "Odéon (4, 10) · RER B Luxembourg",
    ambience: ["Outdoors", "Quiet", "Free"],
    photoAlt: "A grandmother and her granddaughter sitting on a park bench.",
  }),
  rodin: translated(RODIN, {
    shortLabel: "Musée Rodin · Paris 7th",
    metro: "Varenne (line 13) · Invalides (8, 13, RER C)",
    ambience: ["Sculpture garden", "Quiet", "An hour is enough"],
    photoAlt: "A father and his adult son walking side by side.",
  }),
};

const JA = {
  industrie: translated(CAFE_INDUSTRIE, {
    shortLabel: "Café de l'Industrie · パリ11区",
    metro: "Bréguet-Sabin（メトロ5号線）· Bastille（1・5・8号線）",
    ambience: ["ゆっくり話せる", "大きなテーブル", "バスティーユ"],
    photoAlt: "石畳の通りのテラス席で話す二人の友人。",
  }),
  flore: translated(CAFE_FLORE, {
    shortLabel: "Café de Flore · パリ6区",
    metro: "Saint-Germain-des-Prés（メトロ4号線）",
    ambience: ["テラス席", "サン＝ジェルマン＝デ＝プレ", "夜遅くまで営業"],
    photoAlt: "パリのカフェ。窓辺の席に座る二人。",
  }),
  janou: translated(CHEZ_JANOU, {
    shortLabel: "Chez Janou · パリ3区",
    metro: "Chemin Vert（メトロ8号線）",
    ambience: ["プロヴァンス料理のビストロ", "マレ地区", "予約がおすすめ"],
    photoAlt: "夕方のやわらかな光の中で話すカップル。",
  }),
  luxembourg: translated(LUXEMBOURG, {
    shortLabel: "Jardin du Luxembourg · パリ6区",
    metro: "Odéon（メトロ4・10号線）· RER B線 Luxembourg",
    ambience: ["屋外", "静か", "入場無料"],
    photoAlt: "公園のベンチに座る祖母と孫娘。",
  }),
  rodin: translated(RODIN, {
    shortLabel: "Musée Rodin · パリ7区",
    metro: "Varenne（メトロ13号線）· Invalides（8・13号線、RER C線）",
    ambience: ["彫刻の庭園", "静か", "1時間で回れる"],
    photoAlt: "並んで歩く父と成人した息子。",
  }),
};

const ES = {
  industrie: translated(CAFE_INDUSTRIE, {
    shortLabel: "Café de l'Industrie · París 11",
    metro: "Bréguet-Sabin (línea 5) · Bastille (1, 5, 8)",
    ambience: ["Ideal para platicar", "Mesas grandes", "Bastille"],
    photoAlt: "Dos amigos platican en una terraza, en una calle empedrada.",
  }),
  flore: translated(CAFE_FLORE, {
    shortLabel: "Café de Flore · París 6",
    metro: "Saint-Germain-des-Prés (línea 4)",
    ambience: ["Terraza", "Saint-Germain-des-Prés", "Abierto hasta tarde"],
    photoAlt: "Un café parisino, dos personas sentadas junto a la ventana.",
  }),
  janou: translated(CHEZ_JANOU, {
    shortLabel: "Chez Janou · París 3",
    metro: "Chemin Vert (línea 8)",
    ambience: ["Bistró provenzal", "Le Marais", "Mejor reservar"],
    photoAlt: "Una pareja platica con la luz cálida de la tarde.",
  }),
  luxembourg: translated(LUXEMBOURG, {
    shortLabel: "Jardin du Luxembourg · París 6",
    metro: "Odéon (4, 10) · RER B Luxembourg",
    ambience: ["Al aire libre", "Tranquilo", "Gratis"],
    photoAlt: "Una abuela y su nieta sentadas en una banca del parque.",
  }),
  rodin: translated(RODIN, {
    shortLabel: "Musée Rodin · París 7",
    metro: "Varenne (línea 13) · Invalides (8, 13, RER C)",
    ambience: ["Jardín de esculturas", "Tranquilo", "Basta una hora"],
    photoAlt: "Un padre y su hijo adulto caminan lado a lado.",
  }),
};

const HE = {
  industrie: translated(CAFE_INDUSTRIE, {
    shortLabel: "Café de l'Industrie · פריז 11",
    metro: "Bréguet-Sabin (קו 5) · Bastille (1, 5, 8)",
    ambience: ["טוב לשיחה", "שולחנות גדולים", "בסטיליה"],
    photoAlt: "שני חברים משוחחים במרפסת של בית קפה, ברחוב מרוצף.",
  }),
  flore: translated(CAFE_FLORE, {
    shortLabel: "Café de Flore · פריז 6",
    metro: "Saint-Germain-des-Prés (קו 4)",
    ambience: ["מרפסת", "סן־ז׳רמן־דה־פרה", "פתוח עד מאוחר"],
    photoAlt: "בית קפה פריזאי, שני אנשים יושבים ליד החלון.",
  }),
  janou: translated(CHEZ_JANOU, {
    shortLabel: "Chez Janou · פריז 3",
    metro: "Chemin Vert (קו 8)",
    ambience: ["ביסטרו פרובנסלי", "המארה", "מומלץ להזמין מקום"],
    photoAlt: "זוג משוחח באור הערב החמים.",
  }),
  luxembourg: translated(LUXEMBOURG, {
    shortLabel: "Jardin du Luxembourg · פריז 6",
    metro: "Odéon (4, 10) · RER B Luxembourg",
    ambience: ["בחוץ", "שקט", "בחינם"],
    photoAlt: "סבתא ונכדתה יושבות על ספסל בפארק.",
  }),
  rodin: translated(RODIN, {
    shortLabel: "Musée Rodin · פריז 7",
    metro: "Varenne (קו 13) · Invalides (8, 13, RER C)",
    ambience: ["גן פסלים", "שקט", "מספיקה שעה"],
    photoAlt: "אב ובנו הבוגר הולכים זה לצד זה.",
  }),
};

const SCENARIOS_BY_LOCALE: Record<Locale, SandboxScenario[]> = {
  fr: SANDBOX_SCENARIOS,
  en: [
    {
      id: "amis",
      label: "Your close friends",
      sampleRecipient: "Thomas",
      when: "Saturday · 15:30",
      whenSentence: "on Saturday at 15:30",
      tilePhoto: "/friends-cafe-terrace.jpg",
      tileAlt: "Two friends talk on a café terrace, on a cobbled street.",
      primary: EN.industrie,
      alternative: EN.luxembourg,
    },
    {
      id: "partenaire",
      label: "Your partner",
      sampleRecipient: "Camille",
      when: "Friday · 20:00",
      whenSentence: "on Friday at 20:00",
      tilePhoto: "/couple-living-room.jpg",
      tileAlt: "A couple talking on a sofa in the warm evening light.",
      primary: EN.janou,
      alternative: EN.flore,
    },
    {
      id: "famille",
      label: "Your family",
      sampleRecipient: "Grandma",
      when: "Sunday · 15:00",
      whenSentence: "on Sunday at 15:00",
      tilePhoto: "/grandmother-granddaughter-park.jpg",
      tileAlt: "A grandmother and her granddaughter sitting on a park bench.",
      primary: EN.luxembourg,
      alternative: EN.flore,
    },
    {
      id: "parents",
      label: "Your parents",
      sampleRecipient: "Dad",
      when: "Sunday · 11:00",
      whenSentence: "on Sunday at 11:00",
      tilePhoto: "/hero-father-son-vineyard.jpg.jpg",
      tileAlt: "A father and his adult son walking side by side through the vineyards.",
      primary: EN.rodin,
      alternative: EN.luxembourg,
    },
  ],
  ja: [
    {
      id: "amis",
      label: "親しい友人",
      sampleRecipient: "トマ",
      when: "土曜 · 15:30",
      whenSentence: "土曜の15時30分",
      tilePhoto: "/friends-cafe-terrace.jpg",
      tileAlt: "石畳の通りのテラス席で話す二人の友人。",
      primary: JA.industrie,
      alternative: JA.luxembourg,
    },
    {
      id: "partenaire",
      label: "パートナー",
      sampleRecipient: "カミーユ",
      when: "金曜 · 20:00",
      whenSentence: "金曜の20時",
      tilePhoto: "/couple-living-room.jpg",
      tileAlt: "夕方のやわらかな光の中、ソファで話すカップル。",
      primary: JA.janou,
      alternative: JA.flore,
    },
    {
      id: "famille",
      label: "家族",
      sampleRecipient: "おばあちゃん",
      when: "日曜 · 15:00",
      whenSentence: "日曜の15時",
      tilePhoto: "/grandmother-granddaughter-park.jpg",
      tileAlt: "公園のベンチに座る祖母と孫娘。",
      primary: JA.luxembourg,
      alternative: JA.flore,
    },
    {
      id: "parents",
      label: "両親",
      sampleRecipient: "お父さん",
      when: "日曜 · 11:00",
      whenSentence: "日曜の11時",
      tilePhoto: "/hero-father-son-vineyard.jpg.jpg",
      tileAlt: "ぶどう畑を並んで歩く父と成人した息子。",
      primary: JA.rodin,
      alternative: JA.luxembourg,
    },
  ],
  es: [
    {
      id: "amis",
      label: "Tus amigos cercanos",
      sampleRecipient: "Diego",
      when: "Sábado · 15:30",
      whenSentence: "el sábado a las 15:30",
      tilePhoto: "/friends-cafe-terrace.jpg",
      tileAlt: "Dos amigos platican en una terraza, en una calle empedrada.",
      primary: ES.industrie,
      alternative: ES.luxembourg,
    },
    {
      id: "partenaire",
      label: "Tu pareja",
      sampleRecipient: "Valeria",
      when: "Viernes · 20:00",
      whenSentence: "el viernes a las 20:00",
      tilePhoto: "/couple-living-room.jpg",
      tileAlt: "Una pareja platica en un sillón con la luz cálida de la tarde.",
      primary: ES.janou,
      alternative: ES.flore,
    },
    {
      id: "famille",
      label: "Tu familia",
      sampleRecipient: "Abuela",
      when: "Domingo · 15:00",
      whenSentence: "el domingo a las 15:00",
      tilePhoto: "/grandmother-granddaughter-park.jpg",
      tileAlt: "Una abuela y su nieta sentadas en una banca del parque.",
      primary: ES.luxembourg,
      alternative: ES.flore,
    },
    {
      id: "parents",
      label: "Tus papás",
      sampleRecipient: "Papá",
      when: "Domingo · 11:00",
      whenSentence: "el domingo a las 11:00",
      tilePhoto: "/hero-father-son-vineyard.jpg.jpg",
      tileAlt: "Un padre y su hijo adulto caminan lado a lado entre los viñedos.",
      primary: ES.rodin,
      alternative: ES.luxembourg,
    },
  ],
  he: [
    {
      id: "amis",
      label: "החברים הקרובים שלכם",
      sampleRecipient: "יואב",
      when: "שבת · 15:30",
      whenSentence: "בשבת בשעה 15:30",
      tilePhoto: "/friends-cafe-terrace.jpg",
      tileAlt: "שני חברים משוחחים במרפסת של בית קפה, ברחוב מרוצף.",
      primary: HE.industrie,
      alternative: HE.luxembourg,
    },
    {
      id: "partenaire",
      label: "בן או בת הזוג",
      sampleRecipient: "נועה",
      when: "שישי · 20:00",
      whenSentence: "ביום שישי בשעה 20:00",
      tilePhoto: "/couple-living-room.jpg",
      tileAlt: "זוג משוחח על ספה באור הערב החמים.",
      primary: HE.janou,
      alternative: HE.flore,
    },
    {
      id: "famille",
      label: "המשפחה שלכם",
      sampleRecipient: "סבתא",
      when: "ראשון · 15:00",
      whenSentence: "ביום ראשון בשעה 15:00",
      tilePhoto: "/grandmother-granddaughter-park.jpg",
      tileAlt: "סבתא ונכדתה יושבות על ספסל בפארק.",
      primary: HE.luxembourg,
      alternative: HE.flore,
    },
    {
      id: "parents",
      label: "ההורים שלכם",
      sampleRecipient: "אבא",
      when: "ראשון · 11:00",
      whenSentence: "ביום ראשון בשעה 11:00",
      tilePhoto: "/hero-father-son-vineyard.jpg.jpg",
      tileAlt: "אב ובנו הבוגר הולכים זה לצד זה בין הכרמים.",
      primary: HE.rodin,
      alternative: HE.luxembourg,
    },
  ],
};

export function sandboxScenarios(lang: Locale = "fr"): SandboxScenario[] {
  return SCENARIOS_BY_LOCALE[lang];
}

export function scenarioFor(id: DuoContext, lang: Locale = "fr"): SandboxScenario {
  const scenarios = SCENARIOS_BY_LOCALE[lang];
  return scenarios.find((s) => s.id === id) ?? scenarios[0];
}
