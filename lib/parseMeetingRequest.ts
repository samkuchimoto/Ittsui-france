// /lib/parseMeetingRequest.ts
// "Décrire en une phrase" (/request/new): "un café avec Marie mardi vers 15h
// à Bastille" -> a best guess at recipientName/venueName/venueAddress/
// venueType/date/time, in French, English and Japanese, and the basics in
// Mexican Spanish and Hebrew (days, times, the person, the kind of place).
//
// Rules only, since 2026-10-22: it used to ask Mistral, then Groq, over the
// network. Plain patterns do this job instantly, offline, in the browser,
// for nothing, and the same way every time (the model's own date arithmetic
// was never reliable: dates were already computed here, not by it).
//
// Narrate/assist, never decide: this ONLY pre-fills the form's fields.
// Nothing is sent without the person reviewing and tapping "Envoyer". When
// nothing is recognised it returns null, and the form stays as it was.
//
// No runtime imports on purpose: it runs as is in the browser and in Node
// (scratchpad tests).

import type { VenueType } from "@/lib/types";

export interface ParsedMeetingRequest {
  recipientName: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueType: VenueType | null;
  date: string | null;
  time: string | null;
}

type Lang = "fr" | "en" | "ja" | "es" | "he";
type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Today in Paris, "YYYY-MM-DD" (the app's reference, like lib/timezone.ts). */
function parisToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(iso: string): Weekday {
  return WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}

/** A named weekday means its next occurrence, 1 to 7 days out (never today). */
function nextWeekday(day: Weekday, today: string): string {
  const offset = ((WEEKDAYS.indexOf(day) - WEEKDAYS.indexOf(weekdayOf(today)) + 7 - 1) % 7) + 1;
  return addDays(today, offset);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A day (and month) that's already past means the next one. */
function explicitDate(day: number, month: number | null, today: string): string | null {
  const [y, m, d] = today.split("-").map(Number);
  let year = y;
  let mon = month ?? m;
  if (month === null && day < d) mon += 1;
  if (mon > 12) {
    mon = 1;
    year += 1;
  }
  if (month !== null && (mon < m || (mon === m && day < d))) year += 1;
  const candidate = new Date(Date.UTC(year, mon - 1, day));
  if (candidate.getUTCMonth() !== mon - 1) return null; // 31 février
  return `${year}-${pad(mon)}-${pad(day)}`;
}

const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7,
  aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12,
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9,
  octubre: 10, noviembre: 11, diciembre: 12,
};
const MONTH_WORDS = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");

// Hebrew weekdays need "יום": "שני" alone also means "second".
const DAY_WORDS: [RegExp, Weekday][] = [
  [/\blundi\b|\bmonday\b|月曜|\blunes\b|יום שני/, "mon"],
  [/\bmardi\b|\btuesday\b|火曜|\bmartes\b|יום שלישי/, "tue"],
  [/\bmercredi\b|\bwednesday\b|水曜|\bmiercoles\b|יום רביעי/, "wed"],
  [/\bjeudi\b|\bthursday\b|木曜|\bjueves\b|יום חמישי/, "thu"],
  [/\bvendredi\b|\bfriday\b|金曜|\bviernes\b|יום שישי/, "fri"],
  [/\bsamedi\b|\bsaturday\b|土曜|週末|\bweek-?end\b|\bsabado\b|fin de semana|שבת|סוף השבוע|סופ"ש|סופ״ש/, "sat"],
  [/\bdimanche\b|\bsunday\b|日曜|\bdomingo\b|יום ראשון/, "sun"],
];

function findDate(plain: string, lang: Lang, today: string, dayFirst?: boolean): string | null {
  if (/apres[- ]demain|day after tomorrow|明後日|あさって|pasado manana|מחרתיים/.test(plain)) return addDays(today, 2);
  // "mañana" is tomorrow, except "la mañana" (the morning).
  if (/\bdemain\b|\btomorrow\b|明日|あした|あす|(?<!la )\bmanana\b|מחר/.test(plain)) return addDays(today, 1);
  if (/aujourd'?hui|aujourd’hui|ce soir|\btoday\b|\btonight\b|今日|きょう|今夜|今晩|\bhoy\b|esta noche|היום|הערב/.test(plain)) return today;

  let m = plain.match(new RegExp(`\\b(\\d{1,2})(?:er|st|nd|rd|th)?\\s+(?:of\\s+|de\\s+)?(${MONTH_WORDS})\\b`));
  if (m) return explicitDate(Number(m[1]), MONTHS[m[2]], today);
  m = plain.match(new RegExp(`\\b(${MONTH_WORDS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  if (m) return explicitDate(Number(m[2]), MONTHS[m[1]], today);
  m = plain.match(/(\d{1,2})月(\d{1,2})日/);
  if (m) return explicitDate(Number(m[2]), Number(m[1]), today);
  m = plain.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    // The meeting city's convention when known (lib/cities.ts: London day
    // first, New York month first); otherwise day first in French, month
    // first in Japanese, and in English day first only when it can't be a month.
    const first = dayFirst === undefined ? lang === "fr" || (lang === "en" && a > 12) : dayFirst || a > 12;
    return first ? explicitDate(a, b, today) : explicitDate(b, a, today);
  }
  m = plain.match(/\b(?:le|el) (\d{1,2})(?:er)?\b(?!\s*h|\s*:)/) ?? plain.match(/(?<![\d月])(\d{1,2})日(?!曜)/);
  if (m) return explicitDate(Number(m[1]), null, today);

  for (const [pattern, day] of DAY_WORDS) if (pattern.test(plain)) return nextWeekday(day, today);
  return null;
}

function toTime(hour: number, minute: number): string | null {
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

const DAY_PARTS: [RegExp, string][] = [
  [/petit[- ]dej|breakfast|朝食|モーニング|\bdesayuno\b|ארוחת בוקר/, "09:30"],
  [/brunch|ブランチ/, "11:30"],
  [/dejeuner|\bdej\b|\blunch\b|ランチ|昼食|ארוחת צהריים/, "12:30"],
  [/\bcomida\b/, "14:30"],
  [/gouter/, "16:00"],
  [/apero|\bdrinks?\b/, "19:00"],
  [/\bdiner\b|\bdinner\b|ディナー|夕食|晩ご飯|晩ごはん|ארוחת ערב/, "20:00"],
  [/\bcena\b/, "20:30"],
  [/en la tarde|por la tarde|אחר הצהריים|אחה"צ|אחה״צ/, "16:00"],
  [/en la noche|por la noche|esta noche|בערב|הערב/, "20:00"],
  [/en la manana|por la manana|de la manana|בבוקר/, "10:00"],
  [/\bmediodia\b|בצהריים/, "12:30"],
  [/apres[- ]midi|\baprem\b|\bafternoon\b|午後/, "15:00"],
  [/\bmidi\b|\bnoon\b|お昼|昼/, "12:00"],
  [/\bminuit\b|\bmidnight\b/, "00:00"],
  [/\bmatin\b|\bmorning\b|朝/, "10:00"],
  [/夕方/, "17:00"],
  [/\bsoir\b|\bsoiree\b|ce soir|\btonight\b|\bevening\b|夜|今夜|今晩/, "19:00"],
];

function findTime(plain: string): string | null {
  let m = plain.match(/(午前|午後)?\s?(\d{1,2})時(?:(\d{1,2})分|(半))?/);
  if (m) {
    let hour = Number(m[2]);
    if (m[1] === "午後" && hour < 12) hour += 12;
    return toTime(hour, m[4] ? 30 : Number(m[3] ?? 0));
  }
  m = plain.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm|a\.m\.|p\.m\.)/);
  if (m) {
    let hour = Number(m[1]) % 12;
    if (m[3].startsWith("p")) hour += 12;
    return toTime(hour, Number(m[2] ?? 0));
  }
  // "dîner à 8h", "dinner at 8": an evening word turns a morning hour into an evening one.
  const evening = /du soir|de l'apres[- ]midi|de l’apres[- ]midi|de l'aprem|\bsoir\b|\bdiner\b|apero|\bdinner\b|\bevening\b|\btonight\b|\bdrinks?\b|de la tarde|de la noche|\bcena\b|esta noche|en la noche|בערב|ארוחת ערב|אחר הצהריים/.test(plain);
  // "a las 5", "a la 1": Spanish hours, the afternoon or evening between 1 and 7.
  m = plain.match(/\ba las? (\d{1,2})(?::(\d{2}))?\b/) ?? plain.match(/(?:בשעה|ב-|ב)\s?(\d{1,2})(?::(\d{2}))?(?!\d)/);
  if (m) {
    const hour = Number(m[1]);
    return toTime(hour >= 1 && hour < 12 && (evening || hour <= 7) ? hour + 12 : hour, Number(m[2] ?? 0));
  }
  m = plain.match(/\b(\d{1,2})\s?h\s?(\d{2})?\b/) ?? plain.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) {
    let hour = Number(m[1]);
    if (hour < 12 && evening) hour += 12;
    return toTime(hour, Number(m[2] ?? 0));
  }
  // A bare "at 3" between 1 and 7 means the afternoon or evening: these are social plans.
  m = plain.match(/\bat (\d{1,2})\b(?!\s*(?:am|pm|:))/);
  if (m) {
    const hour = Number(m[1]);
    return toTime(hour >= 1 && hour < 12 && (evening || hour <= 7) ? hour + 12 : hour, 0);
  }
  for (const [pattern, time] of DAY_PARTS) if (pattern.test(plain)) return time;
  return null;
}

const TYPES: [VenueType, RegExp][] = [
  ["home", /chez (?:moi|toi|nous|vous|lui|elle)\b|a la maison|my place|your place|at home|my house|at mine|at yours|家で|うちで|自宅|en (?:mi|tu|su) casa|\ben casa\b|אצלי|אצלך|אצלנו|בבית/],
  ["museum", /\bmusee|\bexpo\b|exposition|galerie|museum|exhibition|exhibit|gallery|美術館|博物館|展覧会|ギャラリー|\bmuseo\b|exposicion|galeria|מוזיאון|תערוכה|גלריה/],
  ["park", /\bparc\b|jardin|balade|promenade|pique-?nique|\bsquare\b|\bpark\b|\bwalk\b|picnic|garden|stroll|公園|散歩|ピクニック|庭園|\bparque\b|caminar|caminata|\bpaseo\b|פארק|טיול|הליכה|גינה/],
  ["restaurant", /\bresto|restaurant|dejeuner|\bdej\b|\bdiner\b|brunch|manger|repas|\bpizza|sushi|\blunch\b|\bdinner\b|\beat\b|\bmeal\b|レストラン|ランチ|ディナー|食事|ごはん|ご飯|夕食|昼食|ラーメン|寿司|\bcomer\b|\bcomida\b|\bcena\b|almuerzo|desayuno|restaurante|\btacos\b|מסעדה|ארוחת|ארוחה|לאכול/],
  ["cafe", /\bcafe\b|\bverre\b|apero|\bbar\b|boire|gouter|chocolat chaud|\bcoffee\b|\btea\b|\bdrinks?\b|カフェ|コーヒー|お茶|喫茶|飲み|バー|cafecito|\bchela\b|cerveza|\btrago\b|קפה|בירה|משקה/],
];

function findType(plain: string, lang: Lang): VenueType | null {
  for (const [type, pattern] of TYPES) if (pattern.test(plain)) return type;
  // "un thé": only in French, where it can't be the English article.
  if (lang === "fr" && /\bun the\b|\bprendre (?:le|un) the\b/.test(plain)) return "cafe";
  return null;
}

const CAP = "[A-ZÀ-ÖØ-Ý][\\p{L}'’-]*";
const NOT_NAMES = new RegExp(
  `^(?:${["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Demain", "Tomorrow", "Today", "Tonight", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo", "Mañana", "Hoy"].join("|")})$`
);
const RELATIONS =
  "maman|papa|mamie|mami|papi|papy|ma m[eè]re|mon p[eè]re|ma s(?:œ|oe)ur|mon fr[eè]re|ma femme|mon mari|ma copine|mon copain|ma ch[eé]rie|mon ch[eé]ri|ma fille|mon fils|ma tante|mon oncle|ma cousine|mon cousin|ma grand-m[eè]re|mon grand-p[eè]re|mes parents|" +
  "mom|mum|dad|grandma|grandpa|my sister|my brother|my wife|my husband|my girlfriend|my boyfriend|my partner|my daughter|my son|my aunt|my uncle|my cousin|my parents|" +
  "mi mama|mi papa|mama|papa|mi abuela|mi abuelo|mi hermana|mi hermano|mi novia|mi novio|mi esposa|mi esposo|mi hija|mi hijo|mi tia|mi tio|mi prima|mi primo|mi amiga|mi amigo|mis papas";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Strips leading Japanese day/time words ("明日", "土曜日に", "15時に") from a token. */
function stripJaTime(token: string): string {
  const lead = /^(?:今日|明日|明後日|あした|あさって|今夜|今晩|週末|来週の?|今週の?|[月火水木金土日]曜日?|\d{1,2}月\d{1,2}日|\d{1,2}日|午前|午後|\d{1,2}時(?:\d{1,2}分|半)?|朝|昼|夜|夕方)(?:に|は|、|の)?/;
  let out = token;
  for (let i = 0; i < 6 && lead.test(out); i++) out = out.replace(lead, "");
  return out;
}

function findName(text: string, plain: string): string | null {
  // Relations are matched on the lowercase text, then given back as typed.
  const rel = plain.match(new RegExp(`(?:^|\\s)(?:avec|with|con)\\s+(${RELATIONS})(?=\\s|$|[,.!?])`));
  if (rel && rel.index !== undefined) {
    const start = plain.indexOf(rel[1], rel.index);
    return capitalize(text.slice(start, start + rel[1].length));
  }
  let m = text.match(new RegExp(`(?:^|\\s)(?:avec|with|w/|con)\\s+(${CAP}(?:\\s+${CAP})?)`, "u"));
  if (m) {
    const words = m[1].split(/\s+/).filter((w) => !NOT_NAMES.test(w));
    if (words.length) return words.join(" ").slice(0, 40);
  }
  // Hebrew has no capitals: the word after "עם", unless it's a day or a time.
  m = text.match(/(?:^|\s)עם\s+([\u0590-\u05FF"״׳'-]+)/u);
  if (m && !/^(?:מחר|מחרתיים|היום|הערב|בערב|בבוקר)$/.test(m[1])) return m[1];
  m = text.match(/(?:^|[\s、,。])([^\s、,。]{1,14}?)と(?:一緒に)?/u);
  if (m) {
    const name = stripJaTime(m[1]);
    if (name) return name.slice(0, 40);
  }
  return null;
}

function findAddress(text: string): string | null {
  const m =
    text.match(/(\d{1,4}\s*(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|quai|all[ée]e|impasse|passage|chemin|cours)\s+[^,.;\n]+?)(?=\s+(?:à|a|le|la|avec|vers|demain|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s|[,.;\n]|$)/iu) ??
    text.match(/(\d{1,5}\s+(?:[A-Z][\w'-]*\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln)\b\.?)/);
  return m ? m[1].trim() : null;
}

// Either case for the first letter only: the name after it must stay capitalized.
const PLACE_WORD = ["parc", "jardin", "square", "mus[ée]e", "caf[ée]", "restaurant", "resto", "bar", "place", "march[ée]", "quai", "canal", "bois", "butte", "parque", "museo", "restaurante", "mercado", "plaza", "jard[íi]n"]
  .map((w) => `[${w[0].toUpperCase()}${w[0]}]${w.slice(1)}`)
  .join("|");

function findVenue(text: string, name: string | null): string | null {
  const keep = (v: string | undefined) => (v && v !== name && !NOT_NAMES.test(v) ? v.trim() : null);
  // "au parc Montsouris", "au café de Flore": a place word, then its name.
  let m = text.match(new RegExp(`(?:^|\\s)((?:${PLACE_WORD})\\s+(?:de la\\s+|de l['’]|du\\s+|des\\s+|de\\s+|d['’])?${CAP}(?:\\s+${CAP})*)`, "u"));
  if (m && /[A-ZÀ-ÖØ-Ý]/u.test(m[1].replace(/^\S+\s+/, ""))) return capitalize(m[1].trim());
  // "vers Bastille", "dans le Marais", "near Central Park", "at Le Perchoir".
  const connectors = `(?:\\s+(?:(?:de|du|des|la|le|les|l['’]|d['’]|sur|en|et|of|the|and)\\s+)?${CAP})*`;
  m = text.match(
    new RegExp(
      `(?:^|\\s)(?:vers|pr[eè]s\\s+d[eu]|[àa]\\s+c[oô]t[eé]\\s+d[eu]|du\\s+c[oô]t[eé]\\s+d[eu]|dans\\s+(?:le|la|les|l['’])|au|aux|[àa]\\s+la|[àa]\\s+l['’]|[àa]|sur|near|around|at|in|by|en\\s+(?:la|el)|en|cerca\\s+de|cerca\\s+del|por)\\s+(${CAP}${connectors})`,
      "u"
    )
  );
  if (m) {
    const v = keep(m[1]);
    if (v) return v;
  }
  // Japanese: the place before "で" or "の近く".
  m = text.match(/([^\s、,。]{1,16}?)(?:で|の近く|付近|あたり)/u);
  if (m) {
    const token = stripJaTime(m[1].split(/[とにはを]/).pop() ?? "");
    if (token && token !== name) return token;
  }
  return null;
}

export function parseMeetingRequest(input: string, lang: Lang = "fr", today = parisToday(), dayFirst?: boolean): ParsedMeetingRequest | null {
  const text = input.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim();
  if (!text) return null;
  const plain = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const recipientName = findName(text, plain);
  const result: ParsedMeetingRequest = {
    recipientName,
    venueName: findVenue(text, recipientName),
    venueAddress: findAddress(text),
    venueType: findType(plain, lang),
    date: findDate(plain, lang, today, dayFirst),
    time: findTime(plain),
  };
  return Object.values(result).some((v) => v !== null) ? result : null;
}

/** Same result, for the API route kept for older app builds (/api/parse-meeting-request). */
export async function parseMeetingRequestText(text: string, lang: Lang = "fr"): Promise<ParsedMeetingRequest | null> {
  return parseMeetingRequest(text, lang);
}
