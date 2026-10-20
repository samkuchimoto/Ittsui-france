// /lib/triage/engine.ts
// The email summary (/triage), with no AI: it reads what someone pastes
// (Gmail or Outlook inbox rows, whole emails with their headers, or the
// text read from a screenshot), splits it into emails, classes each one,
// finds its dates, recommends a next step and writes the summary. It runs
// in the browser, so the emails go nowhere.
//
// Ported from kuchimoto.com's /demo-triage engine and extended for Ittsui:
//   - it writes its summary in French, English or Japanese (`lang`), and
//     reads inboxes in all three (Japanese keywords, dates such as
//     「10月24日までに」, Gmail/Outlook menu words, 差出人/件名 headers);
//   - "meeting" is a kind of its own: someone proposing to meet ("on se
//     voit jeudi ?", "are you free for a coffee?", 「お茶しませんか」).
//     The summary offers to hand that email to Ittsui's rendez-vous
//     request form — the two halves of the product meeting.
// Self-contained on purpose (no imports), so it can be tested on its own.

export type Lang = "fr" | "en" | "ja";

export type Category = "priority" | "follow" | "noise" | "info";
export type Kind =
  | "meeting" | "client" | "contract" | "bank" | "alert" | "expiry" | "deadline"
  | "otp" | "security" | "terms" | "confirmation" | "update"
  | "newsletter" | "jobs" | "promo" | "social"
  | "other";

export const KINDS: Record<Category, Kind[]> = {
  priority: ["meeting", "client", "contract", "bank", "alert", "expiry", "deadline"],
  follow: ["otp", "security", "terms", "confirmation", "update"],
  noise: ["newsletter", "jobs", "promo", "social"],
  info: ["other"],
};

export const KIND_LABEL: Record<Lang, Record<Kind, string>> = {
  fr: {
    meeting: "Rendez-vous à caler",
    client: "Réponses & échanges",
    contract: "Contrats & devis",
    bank: "Banque & paiements",
    alert: "Alertes",
    expiry: "Expirations & renouvellements",
    deadline: "Échéances & rendez-vous",
    otp: "Codes de sécurité",
    security: "Sécurité du compte",
    terms: "Conditions & confidentialité",
    confirmation: "Confirmations",
    update: "Mises à jour",
    newsletter: "Newsletters",
    jobs: "Offres d'emploi",
    promo: "Promotions",
    social: "Réseaux sociaux",
    other: "Autres informations",
  },
  en: {
    meeting: "Meetings to set up",
    client: "Replies & conversations",
    contract: "Contracts & quotes",
    bank: "Bank & payments",
    alert: "Alerts",
    expiry: "Expiries & renewals",
    deadline: "Deadlines & appointments",
    otp: "Security codes",
    security: "Account security",
    terms: "Terms & privacy",
    confirmation: "Confirmations",
    update: "Updates",
    newsletter: "Newsletters",
    jobs: "Job offers",
    promo: "Promotions",
    social: "Social networks",
    other: "Other information",
  },
  ja: {
    meeting: "調整したい約束",
    client: "返信・やり取り",
    contract: "契約・見積もり",
    bank: "銀行・支払い",
    alert: "アラート",
    expiry: "期限切れ・更新",
    deadline: "期限・予定",
    otp: "セキュリティコード",
    security: "アカウントのセキュリティ",
    terms: "規約・プライバシー",
    confirmation: "確認",
    update: "更新情報",
    newsletter: "ニュースレター",
    jobs: "求人",
    promo: "プロモーション",
    social: "SNS",
    other: "その他の情報",
  },
};

export type RawEmail = { sender: string; subject: string; snippet: string; received: string };

export type TriageEmail = RawEmail & {
  category: Category;
  kind: Kind;
  /** One line, in the summary's language. */
  summary: string;
  /** A date or limit found in the email, as written ("5 novembre", "Oct 24", "10月24日"). */
  deadline: string;
  /** The next step, for priorities. */
  action: string;
  /** For a meeting: the text handed to the rendez-vous request form. */
  meetingText: string;
};

export type BriefGroup = { kind: Kind; label: string; items: TriageEmail[] };

export type Brief = {
  emails: TriageEmail[];
  counts: { total: number; actions: number; info: number; noise: number; meetings: number; minutesSaved: number };
  priorities: BriefGroup[];
  follow: BriefGroup[];
  noise: BriefGroup[];
};

// ---------------------------------------------------------------- text helpers

const NBSP = " ";
// Accents off for matching (é -> e), then recomposed so Japanese kana keep
// their voiced marks (が stays が instead of か + a combining mark).
const fold = (s: string) =>
  s.replace(/[’‘`]/g, "'").normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC").toLowerCase();
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function shorten(text: string, max: number): string {
  const clean = squash(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-、。]+$/, "")}…`;
}

// ---------------------------------------------------------------- dates

const MONTH_FR =
  "janv(?:ier|\\.)?|f[ée]vr(?:ier|\\.)?|f[ée]v\\.?|mars|avr(?:il|\\.)?|mai|juin|juil(?:let|\\.)?|ao[uû]t|sept(?:embre|\\.)?|oct(?:obre|\\.)?|nov(?:embre|\\.)?|d[ée]c(?:embre|\\.)?";
const MONTH_EN =
  "jan(?:uary|\\.)?|feb(?:ruary|\\.)?|mar(?:ch|\\.)?|apr(?:il|\\.)?|may|june?|july?|aug(?:ust|\\.)?|sep(?:t(?:ember)?)?\\.?|oct(?:ober|\\.)?|nov(?:ember|\\.)?|dec(?:ember|\\.)?";
const DAY_FR = "lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche";
const DAY_EN = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const DAY_ABBR = "lun|mar|mer|jeu|ven|sam|dim|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun";
const TIME = "\\d{1,2}[:h]\\d{2}(?:\\s?[ap]\\.?m\\.?)?";
const JA_WEEKDAY = "[月火水木金土日]曜日?";
/** 「10月24日」「2026年10月24日（金）」「明日」「金曜」「3日以内」. */
const JA_DATE = `(?:\\d{4}年)?\\d{1,2}月\\d{1,2}日(?:\\s*[（(][月火水木金土日][）)])?|明後日|あさって|明日|あした|今日|本日|今夜|今晩|今週中|今週末|来週|今月末|月末|${JA_WEEKDAY}|\\d+日以内|\\d+日後`;

/** The date column of an inbox: "10:42", "17 oct.", "Oct 17", "17/10/2026", "Hier", "lun. 14/10", 「10月17日」「昨日 17:40」. */
const DATE_CELL = new RegExp(
  `^(?:(?:${DAY_FR}|${DAY_EN}|${DAY_ABBR})\\.?,?\\s+)?(?:${[
    TIME,
    `\\d{1,2}(?:er)?\\s+(?:${MONTH_FR}|${MONTH_EN})(?:\\s+\\d{4})?(?:,?\\s+(?:à\\s+)?${TIME})?`,
    `(?:${MONTH_EN}|${MONTH_FR})\\s+\\d{1,2}(?:,?\\s+\\d{4})?(?:,?\\s+(?:at\\s+)?${TIME})?`,
    `\\d{1,2}[/.-]\\d{1,2}(?:[/.-]\\d{2,4})?(?:,?\\s+${TIME})?`,
    `\\d{4}[/.-]\\d{1,2}[/.-]\\d{1,2}(?:\\s+${TIME})?`,
    `(?:hier|avant-hier|yesterday)(?:,?\\s+(?:à\\s+)?${TIME})?`,
    `il y a \\d+\\s*(?:min(?:ute)?s?|h|heures?|j|jours?)`,
    `\\d+\\s*(?:min(?:ute)?s?|h|hours?|d|days?)\\s+ago`,
    `(?:\\d{4}年)?\\d{1,2}月\\d{1,2}日(?:\\s*[（(][月火水木金土日][）)])?(?:\\s*${TIME})?`,
    `(?:昨日|一昨日|おととい)(?:\\s*${TIME})?`,
    `${JA_WEEKDAY}(?:\\s*${TIME})?`,
    `[（(][月火水木金土日][）)]\\s*${TIME}`,
    `\\d+\\s*(?:分|時間|日)前`,
  ].join("|")})\\.?$|^(?:${DAY_FR}|${DAY_EN}|${DAY_ABBR})\\.?$`,
  "i",
);

const isDateCell = (cell: string) => cell.length <= 40 && DATE_CELL.test(cell.trim());

/** A date written inside an email: "5 novembre", "1er décembre", "Oct 24", "24/10", "vendredi", "demain". */
const DATE_PHRASE = `(?:\\d{1,2}(?:er)?\\s+(?:${MONTH_FR}|${MONTH_EN})(?:\\s+\\d{4})?|(?:${MONTH_EN})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|\\d{1,2}\\.\\d{1,2}\\.\\d{4}|(?:${DAY_FR}|${DAY_EN})(?:\\s+\\d{1,2}(?:er)?(?:\\s+(?:${MONTH_FR}|${MONTH_EN}))?)?|aujourd'hui|ce soir|demain|apr[èe]s-demain|today|tonight|tomorrow|fin (?:du mois|de (?:la )?semaine|de (?:la )?journ[ée]e)|end of (?:the )?(?:day|week|month)|dans \\d+ jours?|in \\d+ days?)`;
const END = "(?![\\p{L}\\d])";
/** A date announced as a limit: "avant le 5 novembre", "expire le 2 novembre", "due by Oct 24". */
const DEADLINE_DATE = new RegExp(
  `(?:avant (?:le )?|jusqu'(?:au|à) |d'ici (?:le )?|au plus tard (?:le )?|expire(?:ra)? (?:le )?|expires? (?:on )?|[ée]ch[ée]ance\\s*:?\\s*(?:le |du )?|date limite\\s*:?\\s*(?:le |du )?|due (?:on |by )?|by |before |until |deadline\\s*:?\\s*)(${DATE_PHRASE})${END}`,
  "iu",
);
/** A limit in Japanese: 「10月24日までに」 or 「期限：10月24日」. */
const JA_DEADLINE = new RegExp(
  `(${JA_DATE})(?:\\s*\\d{1,2}[:時]\\d{0,2}分?)?\\s*(?:まで|迄|が期限|が締め切り|が締切)|(?:期限|締め切り|締切|〆切|有効期限|支払期限|提出期限|納期)\\s*[:：は]?\\s*(${JA_DATE})`,
  "u",
);
/** Any date, announced more loosely ("le 1er décembre", "on Nov 5"). */
const ANY_DATE = new RegExp(`(?:^|[^\\p{L}\\d])(${DATE_PHRASE})${END}`, "iu");
const ANY_JA_DATE = new RegExp(`(${JA_DATE})`, "u");

/** How precise a date is: a calendar date beats a weekday, which beats "dans 15 jours". */
const precision = (date: string) =>
  /\d/.test(date) && !/^(dans|in) /i.test(date) && !/日以内|日後/.test(date)
    ? 2
    : /^(dans|in) |aujourd|today|demain|tomorrow|soir|tonight|fin |end of|明日|あした|明後日|あさって|今日|本日|今夜|今晩|今週|来週|月末|日以内|日後/i.test(date)
      ? 0
      : 1;

function bestMatch(text: string, pattern: RegExp): string {
  let best = "";
  for (const match of text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))) {
    const found = match[1] ?? match[2];
    if (!found) continue;
    const date = squash(found);
    if (!best || precision(date) > precision(best)) best = date;
  }
  return best;
}

function findDate(text: string): { date: string; limit: boolean } {
  const normalized = text.replace(/[’‘]/g, "'");
  const limit = bestMatch(normalized, DEADLINE_DATE) || bestMatch(normalized, JA_DEADLINE);
  if (limit) return { date: limit, limit: true };
  return { date: bestMatch(normalized, ANY_DATE) || bestMatch(normalized, ANY_JA_DATE), limit: false };
}

const FR_MONTHS = ["janv", "fevr", "mars", "avr", "mai", "juin", "juil", "aout", "sept", "oct", "nov", "dec"];
const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** When a deadline falls, to sort priorities (closest first). Unknown: last. */
function deadlineTime(date: string, now = new Date()): number {
  if (!date) return Infinity;
  const d = fold(date);
  const day = 86_400_000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (/aujourd'hui|today|ce soir|tonight|fin de (la )?journee|end of (the )?day|今日|本日|今夜|今晩/.test(d)) return today;
  if (/apres-demain|明後日|あさって/.test(d)) return today + 2 * day;
  if (/demain|tomorrow|明日|あした/.test(d)) return today + day;
  const inDays = d.match(/(?:dans|in) (\d+) (?:jours?|days?)|(\d+)日(?:以内|後)/);
  if (inDays) return today + Number(inDays[1] ?? inDays[2]) * day;
  if (/今週/.test(d)) return today + ((7 - now.getDay()) % 7) * day;
  if (/月末/.test(d)) return new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime();
  let month = -1;
  let dayOfMonth = NaN;
  let year = now.getFullYear();
  const japanese = d.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  const numeric = d.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/);
  if (japanese) {
    if (japanese[1]) year = Number(japanese[1]);
    month = Number(japanese[2]) - 1;
    dayOfMonth = Number(japanese[3]);
  } else if (numeric) {
    dayOfMonth = Number(numeric[1]);
    month = Number(numeric[2]) - 1;
    if (numeric[3]) year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
  } else {
    const num = d.match(/(\d{1,2})(?:er|st|nd|rd|th)?/);
    if (num) dayOfMonth = Number(num[1]);
    const name = d.match(/[a-z]{3,}/g)?.find((word) => FR_MONTHS.some((m) => word.startsWith(m)) || EN_MONTHS.some((m) => word.startsWith(m)));
    if (name) month = Math.max(FR_MONTHS.findIndex((m) => name.startsWith(m)), EN_MONTHS.findIndex((m) => name.startsWith(m)));
    const y = d.match(/\b(20\d{2})\b/);
    if (y) year = Number(y[1]);
  }
  if (month < 0 || !(dayOfMonth >= 1 && dayOfMonth <= 31)) return Infinity - 1;
  let time = new Date(year, month, dayOfMonth).getTime();
  if (time < today - 60 * day) time = new Date(year + 1, month, dayOfMonth).getTime();
  return time;
}

// ---------------------------------------------------------------- reading the paste

// Menu and column text that comes along when a whole Gmail or Outlook
// page is copied (Ctrl+A): never an email.
const UI_WORDS = [
  "nouveau message", "nouveau courrier", "rédiger", "compose", "new mail", "new message",
  "boîte de réception", "boite de reception", "inbox", "messages suivis", "suivis", "starred", "en attente", "snoozed",
  "important", "messages envoyés", "envoyés", "sent", "sent items", "éléments envoyés", "brouillons", "drafts",
  "plus", "more", "moins", "less", "libellés", "labels", "catégories", "categories", "principale", "primary",
  "promotions", "réseaux sociaux", "social", "notifications", "mises à jour", "updates", "forums", "spam",
  "courrier indésirable", "junk email", "corbeille", "trash", "éléments supprimés", "deleted items",
  "tous les messages", "all mail", "archive", "archives", "chat", "meet", "espaces", "spaces", "gmail", "outlook",
  "mail", "courrier", "rechercher dans les messages", "rechercher", "search mail", "search", "paramètres",
  "settings", "aide", "help", "conditions", "confidentialité", "terms", "privacy", "program policies",
  "règlement du programme", "afficher les détails", "details", "détails", "gérer", "manage", "focused",
  "prioritaire", "autres", "other", "favoris", "favorites", "dossiers", "folders", "groupes", "groups",
  "sélectionner", "select", "trier", "sort", "filtrer", "filter", "actualiser", "refresh", "aujourd'hui", "today",
  "cette semaine", "this week", "semaine dernière", "la semaine dernière", "last week", "ce mois-ci", "this month",
  "le mois dernier", "last month", "plus tôt ce mois-ci", "earlier this month", "plus ancien", "older",
  "plus tôt", "earlier", "de", "objet", "reçu", "taille", "from", "subject", "received", "size", "importance",
  "pièce jointe", "attachment", "indicateur", "flag", "to", "à", "cc", "non lus", "unread", "marquer comme lu",
  "mark as read", "tout sélectionner", "select all", "boîte de réception prioritaire", "focused inbox",
  // Outlook's day headers ("Hier" above yesterday's emails); its date
  // column always carries a time ("Hier 17:40").
  "hier", "yesterday", "avant-hier",
  // Gmail and Outlook in Japanese.
  "受信トレイ", "スター付き", "スヌーズ中", "重要", "送信済み", "下書き", "もっと見る", "折りたたむ", "ラベル",
  "カテゴリ", "ソーシャル", "プロモーション", "新着", "フォーラム", "迷惑メール", "ゴミ箱", "すべてのメール", "チャット",
  "スペース", "メール", "メールを検索", "検索", "設定", "ヘルプ", "作成", "メイン", "未読", "すべて選択", "更新", "前へ",
  "次へ", "今日", "昨日", "今週", "先週", "今月", "先月", "それ以前", "件名", "差出人", "受信日時", "サイズ", "重要度",
  "添付ファイル", "優先", "その他", "お気に入り", "フォルダー", "グループ", "新しいメール", "削除済みアイテム",
  "送信済みアイテム", "アーカイブ", "利用規約", "プライバシー", "プログラム ポリシー", "詳細",
];
const UI_CELL = new RegExp(`^(?:${UI_WORDS.map(escape).join("|")})(?:\\s*\\(?\\d[\\d\\s.,]*\\)?)?$`, "i");
const PAGINATION = /^\d+\s*[–-]\s*\d+\s+(?:sur|of)\s+[\d\s.,]+$|^\d+\s*[–-]\s*\d+\s*\/\s*[\d,]+(?:\s*件)?$/i;
const SIZE = /^[\d.,]+\s*(?:go|gb|mo|mb|ko|kb)\b/i;
const ACTIVITY = /^(?:dernière activité|derniere activite|last account activity|utilisation de l'espace|\d+\s*%\s*(?:utilisés|used)|前回のアカウント アクティビティ|\d+\s*GB\s*\/)/i;

function cleanCell(raw: string): string {
  const cell = squash(raw.replace(/^[\s☐☑☒□■●•○◯☆★⭐✩✰|]+/u, ""));
  if (cell.length < 2) return "";
  if (UI_CELL.test(cell) || PAGINATION.test(cell) || SIZE.test(cell) || ACTIVITY.test(cell)) return "";
  // A footer like "Conditions · Confidentialité · Règlement du programme".
  if (cell.includes("·") && cell.split("·").every((part) => UI_CELL.test(part.trim()))) return "";
  if (/^\d{1,6}$/.test(cell)) return "";
  return cell;
}

function cleanSender(raw: string): string {
  let sender = squash(raw.replace(/<[^>]*>/g, " ").replace(/["“”]/g, ""));
  sender = sender.replace(/\s*\(\d+\)$/, "").replace(/\s+\d{1,3}$/, "");
  // A Gmail thread lists its people, "moi" (me) among them: keep the others.
  const people = sender.split(/\s*[,、]\s*/).filter((name) => name && !/^(moi|me|myself|自分)$/i.test(name));
  if (people.length) sender = people.join(", ");
  if (!sender) sender = raw.match(/[\w.+-]+@(?:[\w-]+\.)+\w+/)?.[0] ?? "";
  return shorten(sender, 60);
}

/** One email from the cells of an inbox row (sender, "subject - snippet", extras). */
function rowToEmail(cells: string[], received: string): RawEmail | null {
  if (!cells.length) return null;
  // A Gmail row keeps "Subject - snippet" in one cell; when the row brought
  // menu text along, the sender is the cell just before the subject.
  let at = cells.findIndex((cell, i) => i > 0 && / [-–] /.test(cell) && cell.length > 12);
  if (at < 0) {
    if (cells.length === 1) at = 0;
    else {
      at = 1;
      for (let i = 2; i < cells.length; i++) if (cells[i].length > cells[at].length) at = i;
    }
  }
  let sender = at > 0 ? cells[at - 1] : "";
  let main = cells[at];
  if (sender.length > 60) {
    main = `${sender} - ${main}`;
    sender = "";
  }
  const extra = cells.slice(at + 1).join(" · ");
  const split = main.match(/^(.+?) [-–] (.+)$/);
  const subject = split ? split[1] : main;
  const snippet = split ? split[2] : extra;
  return {
    sender: cleanSender(sender),
    subject: shorten(subject, 200),
    snippet: shorten(split && extra ? `${snippet} · ${extra}` : snippet, 400),
    received: squash(received),
  };
}

/** Inbox rows: cells separated by tabs or line breaks, each row ending on its date. */
function parseRows(text: string): RawEmail[] {
  const cells = text.split(/\n|\t/).map(cleanCell).filter(Boolean);
  if (!cells.some(isDateCell)) {
    // No date column: one line per email.
    return text
      .split("\n")
      .map((line) => line.split("\t").map(cleanCell).filter(Boolean))
      .map((row) => rowToEmail(row, ""))
      .filter((email): email is RawEmail => email !== null);
  }

  const groups: { cells: string[]; date: string }[] = [];
  let current: string[] = [];
  for (const cell of cells) {
    if (isDateCell(cell)) {
      if (current.length) groups.push({ cells: current, date: cell });
      current = [];
    } else current.push(cell);
  }
  const tail = current;

  // Outlook lists the preview after the date: when most rows start with a
  // long line followed by a short one, that long line is the previous
  // email's preview.
  const outlookLike =
    groups.length > 1 &&
    groups.slice(1).filter((g) => g.cells.length >= 3 && g.cells[0].length > 40 && g.cells[1].length <= 40).length >=
      (groups.length - 1) / 2;
  if (outlookLike) {
    for (let i = 1; i < groups.length; i++) {
      const g = groups[i];
      if (g.cells.length >= 3 && g.cells[0].length > 40) groups[i - 1].cells.push(g.cells.shift()!);
    }
  }

  // Outlook rows read in order: sender, subject, then the preview.
  const outlookRow = (cells: string[], date: string): RawEmail => ({
    sender: cleanSender(cells.length > 1 ? cells[cells.length >= 3 ? cells.length - 3 : 0] : ""),
    subject: shorten(cells.length > 1 ? cells[cells.length >= 3 ? cells.length - 2 : 1] : cells[0], 200),
    snippet: shorten(cells.length >= 3 ? cells[cells.length - 1] : "", 400),
    received: squash(date),
  });
  const emails = groups
    .map((g) => (outlookLike ? outlookRow(g.cells, g.date) : rowToEmail(g.cells, g.date)))
    .filter((email): email is RawEmail => email !== null);
  if (tail.length) {
    if (outlookLike && emails.length && tail.length === 1) {
      const last = emails[emails.length - 1];
      last.snippet = shorten(squash(`${last.snippet} ${tail[0]}`), 400);
    } else {
      const email = rowToEmail(tail, "");
      if (email && (email.subject.length > 3 || email.sender)) emails.push(email);
    }
  }
  return emails;
}

const HEADER =
  /^(de|from|exp[ée]diteur|objet|subject|sujet|date|envoy[ée]|sent|re[çc]u|received|[àa]|to|cc|cci|bcc|r[ée]pondre [àa]|reply-to|差出人|送信者|件名|日付|送信日時|受信日時|宛先)\s*[:：]\s*(.*)$/i;
const FROM_KEYS = /^(de|from|expediteur|差出人|送信者)$/;
const SUBJECT_KEYS = /^(objet|subject|sujet|件名)$/;
const DATE_KEYS = /^(date|envoy|sent|recu|received|日付|送信日時|受信日時)/;

/** Whole emails, with "De :", "Objet :", "Date :" (or 差出人 / 件名 / 日付) lines. */
function parseHeaders(text: string): RawEmail[] {
  const emails: RawEmail[] = [];
  let current: RawEmail | null = null;
  let body: string[] = [];
  const flush = () => {
    if (current && (current.sender || current.subject)) {
      emails.push({
        sender: cleanSender(current.sender),
        subject: shorten(current.subject, 200),
        snippet: shorten(body.join(" "), 400),
        received: squash(current.received),
      });
    }
    current = null;
    body = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^-{2,}.*(original|origine|forwarded|transf[ée]r[ée]|転送|元のメッセージ).*$/i.test(line)) {
      flush();
      continue;
    }
    const header = line.match(HEADER);
    if (header) {
      const key = fold(header[1]);
      const value = header[2].trim();
      if (FROM_KEYS.test(key)) {
        if (current?.sender) flush();
        current ??= { sender: "", subject: "", snippet: "", received: "" };
        current.sender = value;
      } else {
        current ??= { sender: "", subject: "", snippet: "", received: "" };
        if (SUBJECT_KEYS.test(key)) current.subject = value;
        else if (DATE_KEYS.test(key)) current.received = value;
      }
      continue;
    }
    // "Le lun. 14 oct. à 10:12, X a écrit :" (or 「2026年10月14日(火) 10:12 X <x@…>:」)
    // opens a quoted older message.
    if (/^(le|on)\s.+(a [ée]crit|wrote)\s*:?$/i.test(line) || /^\d{4}年\d{1,2}月\d{1,2}日.*[:：]$/.test(line)) {
      flush();
      continue;
    }
    if (line.startsWith(">")) continue;
    if (current) body.push(line);
  }
  flush();
  return emails;
}

/** Every email found in what was pasted. Never throws. */
export function parseEmails(input: string): RawEmail[] {
  const text = (input ?? "").replace(/\r\n?/g, "\n").replace(/ /g, " ").trim();
  if (!text) return [];
  try {
    const lines = text.split("\n");
    const hasFrom = lines.some((line) => /^(de|from|exp[ée]diteur|差出人|送信者)\s*[:：]/i.test(line.trim()));
    const hasSubject = lines.some((line) => /^(objet|subject|sujet|件名)\s*[:：]/i.test(line.trim()));
    if (hasFrom && hasSubject) {
      const emails = parseHeaders(text);
      if (emails.length) return emails;
    }
    const rows = parseRows(text);
    if (rows.length) return rows;
  } catch {
    // Fall through to the simplest reading.
  }
  return text
    .split("\n")
    .map((line) => squash(line))
    .filter((line) => line.length > 3 && /\p{L}{2,}/u.test(line))
    .map((line) => ({ sender: "", subject: shorten(line, 200), snippet: "", received: "" }));
}

// ---------------------------------------------------------------- classing

// Matched on lower-case text without accents. Japanese has no word
// boundaries, so its alternatives come without \b.
const RX = {
  otp: /(code (de |d')?(verification|validation|connexion|securite|confirmation|acces|activation|authentification)|verification code|security code|login code|sign[- ]in code|one[- ]time|\botp\b|\b2fa\b|double authentification|deux facteurs|two[- ]factor|votre code|your code|code temporaire|code unique|usage unique|認証コード|確認コード|ワンタイムパスワード|セキュリティコード|ログインコード|認証番号|確認番号)/,
  security: /(nouvelle connexion|connexion (depuis|sur|inhabituelle|detectee)|new sign[- ]?in|sign[- ]in (attempt|from|detected)|alerte de securite|security alert|mot de passe (a ete )?(modifie|change)|password (was |has been )?(changed|reset)|reinitialis|reset your password|activite inhabituelle|unusual (activity|sign)|nouvel appareil|appareil inconnu|new device|新しいログイン|ログインがありました|不審なログイン|ログイン通知|パスワード(が|を)?(変更|再設定)|新しい端末|新しいデバイス|セキュリティ通知|セキュリティアラート)/,
  account: /(compte (a ete |est )?(suspendu|bloque|desactive|verrouille|restreint|ferme)|account (has been |is |was )?(suspended|locked|disabled|restricted|closed)|acces (suspendu|bloque)|service (suspendu|coupe)|suspension de|アカウント(が|を)?(停止|凍結|ロック|無効)|利用停止)/,
  terms: /(conditions (generales|d'utilisation|de service|de vente)|terms (of service|of use|and conditions)|politique de confidentialite|privacy (policy|notice)|nos conditions|our terms|\bcgu\b|\bcgv\b|nouvelles conditions|利用規約|プライバシーポリシー|規約の改定|規約変更|個人情報の取り扱い)/,
  contract: /(contrat|contract|\bsignature|a signer|signer (le|la|votre|ce)|please sign|sign the|docusign|yousign|\bdevis\b|\bquote\b|proposition commerciale|bon de commande|avenant|\bbail\b|lettre de mission|agreement|\bnda\b|契約書|ご契約|署名|見積(もり|書)|発注書|注文書|覚書|秘密保持)/,
  bank: /(banque|\bbank|virement|transfer|prelevement|direct debit|releve|statement|carte bancaire|credit card|debit card|\biban\b|\brib\b|paiement|payment|facture|invoice|impaye|unpaid|decouvert|overdraft|\bsolde\b|remboursement|refund|\bpret\b|\bloan\b|echeancier|cotisation|\burssaf\b|impots|\bdgfip\b|tresor public|\bcic\b|credit agricole|\bbnp\b|societe generale|\blcl\b|caisse d'epargne|banque populaire|banque postale|boursorama|boursobank|\bqonto\b|revolut|\bn26\b|paypal|stripe|銀行|振込|振り込み|口座|引き落とし|引落|口座振替|明細|クレジットカード|請求書|ご請求|支払い|支払|お支払|入金|返金|ローン|税金)/,
  bankIssue: /(rejete|\brejet\b|refuse|declined|failed|echec|echoue|impaye|unpaid|decouvert|overdraft|insuffisant|insufficient|retard de paiement|late payment|mise en demeure|relance|a regler|a payer|reste a payer|en attente de paiement|payment (due|required)|past due|exigible|regularis|settle|未払い|延滞|残高不足|支払期限|お支払いください|お支払いのお願い|督促|未納|できませんでした)/,
  bankFailure: /(rejete|\brejet\b|refuse|declined|failed|echec|echoue|impaye|unpaid|decouvert|overdraft|insuffisant|insufficient|retard de paiement|late payment|mise en demeure|past due|regularis|未払い|延滞|残高不足|督促|未納|できませんでした|決済(に)?失敗)/,
  request: /(merci de (nous |me )?(transmettre|fournir|envoyer|retourner|faire parvenir)|documents? a (fournir|transmettre|envoyer)|pieces? (justificatives?|a fournir)|please (send|provide|submit)|could you (send|provide)|documents? (needed|required)|(書類|資料|給与明細|証明書)を?(ご)?(送付|提出|送って|お送り)|ご提出(ください|をお願い)|提出してください|送っていただけ|ご返送)/,
  paid: /(paiement (recu|confirme|accepte|effectue|reussi)|payment (received|confirmed|successful|succeeded)|(virement|prelevement) (recu|effectue|execute)|a bien ete (recu|effectue|debite)|merci pour votre paiement|thank you for your payment|recu de paiement|\breceipt\b|votre recu|お支払い(が)?完了|支払い完了|入金(を)?確認|ご入金ありがとう|決済完了|領収書|お支払いありがとう)/,
  invoice: /(facture|invoice|prelevement|direct debit|echeancier|cotisation|請求書|引き落とし|引落|口座振替)/,
  reply: /(vous a repondu|a repondu a votre|replied to your|から返信|が返信しました)/,
  notOtp: /(code promo|promo code|coupon|reduction|remise|cadeau|parrainage|referral|discount|クーポン|割引コード|プロモーションコード|紹介コード)/,
  alert: /(alerte|\balert\b|incident|\bpanne\b|outage|\bdown\b|hors service|interruption|echec|echoue|\bfailed\b|failure|\berreur\b|\berror\b|critique|critical|indisponible|unavailable|anomalie|障害|エラー|失敗|緊急|警告)/,
  expiry: /(expire|expiration|expirera|arrive a (son )?echeance|renouvel|\brenew|abonnement|subscription|nom de domaine|\bdomain\b|certificat|certificate|attestation|periode d'essai|essai gratuit se termine|trial (ends|expires|is ending)|fin de votre (essai|abonnement)|carte (va )?expir|有効期限|期限切れ|更新(の)?(お知らせ|手続き)|自動更新|ドメイン|証明書|サブスクリプション|定期購読|無料体験(が)?終了|トライアル)/,
  deadline: /(date limite|echeance|deadline|avant le|au plus tard|dernier delai|d'ici le|jusqu'au|due (date|by|on)|action requise|action required|a faire avant|\brappel\b|reminder|\burgent|dernier rappel|rendez-vous|\brdv\b|convocation|entretien|\bmeeting\b|reunion|invitation ?:|a valider|merci de (valider|confirmer|repondre|nous (envoyer|transmettre|retourner))|pouvez-vous|pourriez-vous|could you|please (confirm|reply|review|send)|appointment|期限|締め切り|締切|までに|〆切|リマインダー|リマインド|至急|要返信|ご確認ください|ご返信ください|ご回答|ご連絡ください|面接|面談|説明会|予約日)/,
  // Someone proposing to meet. Proposals only ("on se voit ?", "are you
  // free…?", 「お茶しませんか」): a reminder of an appointment already
  // booked, or minutes of a past meeting, are something else.
  meeting: /(on se (voit|retrouve|cale)|(et si on|si on) se (voyait|retrouvait|voit)|se voir (cette|la semaine|bientot|jeudi|vendredi|samedi|dimanche|lundi|mardi|mercredi|demain|ce)|tu (es|serais) (dispo|libre)|vous (etes|seriez) (disponible|libre)s?|(prendre|boire) un (cafe|verre|the)|un (cafe|verre|dej|dejeuner|diner) (ensemble|cette|jeudi|vendredi|samedi|dimanche|lundi|mardi|mercredi|demain|ce)|tu viens (dejeuner|diner|manger|prendre)|(dejeuner|diner) ensemble|caler (un|une) (rdv|rendez-vous|creneau|point|appel|visio)|un (petit )?point (rapide|telephonique|en visio)|meet (up|for|on|at)|catch up|(are|would) you (be )?(free|available)|grab (a )?(coffee|lunch|drink|bite)|(quick|short) call|(schedule|set up|arrange) (a|our) (call|meeting|chat)|come (over )?for (lunch|dinner|coffee|tea)|fancy a (coffee|drink|lunch)|shall we meet|let'?s meet|would you like to meet|打ち合わせ(を|の)?(お願い|させて|できますか|しませんか|いかが)|お茶しませんか|お茶でも|ランチ(しませんか|でも|に行きませんか)|会いませんか|会えますか|会えない[？?]|来ない[？?]|ご都合(は|の良い|いかが|を教え)|都合を教えて|日程調整|日程のご相談|お時間(いただけ|ありますか|をいただけ)|一緒に(食べ|ご飯|ランチ|お茶))/,
  minutes: /(compte[- ]rendu|suite a (notre|la|votre) (reunion|rencontre|rendez-vous|visite)|following (our|the) (meeting|call)|meeting (notes|minutes)|議事録|先日の打ち合わせ|打ち合わせのお礼)/,
  newsletter: /(newsletter|lettre d'information|infolettre|\bdigest\b|au sommaire|a la une|top (stories|articles)|weekly roundup|vos actualites|\bwebinar|webinaire|\bpodcast|se desabonner|se desinscrire|unsubscribe|desinscription|view (this email )?in (your )?browser|version en ligne|lettre de la semaine|edition du|in this issue|ニュースレター|メルマガ|メールマガジン|配信停止|購読解除|ダイジェスト|ウェビナー|今号)/,
  jobs: /(offres? d'emploi|job alert|alerte emploi|nouvelles offres|new jobs|jobs? (for you|you may|matching)|new job offers|\brecrute|is hiring|we're hiring|postulez|apply now|apply today|candidats? recommandes|linkedin jobs|\bindeed\b|glassdoor|welcome to the jungle|hellowork|\bmonster\b|\bapec\b|cadremploi|jobteaser|求人|転職|スカウト|採用情報|応募しましょう|リクナビ|マイナビ|ビズリーチ)/,
  promo: /(\bpromo|promotion|offre (speciale|exclusive|limitee|du moment)|\bsoldes\b|\bsale\b|reduction|\bremise\b|-\s?\d{1,2}\s?%|\d{1,2}\s?% (de reduction|off|sur|offerts?)|code promo|\bcoupon|black friday|cyber monday|vente privee|bons? plans?|\bdeals?\b|\bgratuit|livraison offerte|free shipping|derniers? jours?|last (chance|day)|ne manquez pas|don't miss|decouvrez (nos|notre|la nouvelle)|nouvelle collection|new collection|nouveautes|recommande pour vous|recommended for you|vous pourriez aimer|you might like|\bofferts?\b|cadeau|セール|割引|\d{1,2}\s?[%％]\s?(オフ|off)|キャンペーン|送料無料|新作|お得|特典|最終日)/,
  social: /(a aime|a commente|vous a mentionne|nouvelles? notifications?|new notifications?|a partage|liked your|commented on|mentioned you|new followers?|nouveaux? abonnes?|a consulte votre profil|viewed your profile|apparaissez dans|appeared in \d+ searches|invitation a (se connecter|rejoindre)|wants to connect|souhaite (se connecter|rejoindre votre reseau)|work anniversary|\bfacebook\b|\binstagram\b|\btiktok\b|pinterest|\bquora\b|\breddit\b|\blinkedin\b|\byoutube\b|\bmeetup\b|\bstrava\b|いいね|コメントしました|フォローしました|メンションしました|友達リクエスト|つながり申請|プロフィールを見た|検索に表示)/,
  confirmation: /(confirmation|confirme|a bien ete|bien recu|bien enregistre|\brecu\b|receipt|votre commande|your order|commande n|order #|\bexpedie|shipped|\blivree?\b|delivered|livraison|delivery|reservation|booking|inscription|registration|bienvenue|welcome|merci pour votre|thank you for your|ご注文|注文確認|発送(の)?(お知らせ|完了)|配達|お届け|予約(が)?(完了|確定)|ご予約ありがとう|登録完了|ご登録ありがとう|受付完了|承りました|ようこそ)/,
  update: /(compte[- ]rendu|\bcr\b|point (hebdo|d'avancement|projet|d'equipe)|mise a jour|\bupdate|rapport|\breport\b|recapitulatif|\brecap|\bstatus\b|\bstatut\b|avancement|\bsprint\b|deploiement|\bdeploy|\brelease|nouvelle version|changelog|ordre du jour|議事録|報告|レポート|進捗|定例|アップデート|リリース|お知らせ)/,
  noreply: /(no-?reply|ne-?pas-?repondre|donotreply|notifications?@|news@|newsletter@|marketing@)/,
  replyPrefix: /^(re|rep|ref|aw|sv|返信)\s*[:：]/,
};

function cleanSubject(subject: string): string {
  return squash(
    subject
      .replace(/^(?:(?:re|rép|rep|ré|réf|ref|tr|fwd?|fw|aw|sv|wg|返信|転送)\s*[:：]\s*)+/i, "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ""),
  );
}

// ---------------------------------------------------------------- the words, per language

type Words = {
  unknownSender: string;
  theSender: string;
  noSubject: string;
  separator: string;
  due: (date: string) => string;
  action: (kind: Kind, a: { who: string; by: string; date: string; sum: string; t: string; contract: boolean }) => string;
  otp: (masked: string) => string;
  security: string;
  terms: (date: string) => string;
};

const IS_SIGNATURE = /(signature|a signer|signer|sign|署名|サイン)/;
const IS_QUOTE = /(devis|quote|見積)/;
const IS_ACCOUNT = (t: string) => RX.account.test(t);
const IS_DEPLOY = /(deploiement|deploy|build|デプロイ)/;
const IS_DOMAIN = /(nom de domaine|\bdomaine\b|\bdomain\b|ドメイン)/;
const IS_ATTESTATION = /(attestation|certificate|証明書)/;
const IS_CARD = /(carte|card|カード)/;
const IS_SUBSCRIPTION = /(abonnement|subscription|essai|trial|サブスクリプション|定期購読|トライアル)/;
const IS_APPOINTMENT = /(rendez-vous|\brdv\b|convocation|entretien|meeting|reunion|invitation|appointment|予約|面談|面接|会議|打ち合わせ|説明会)/;

const WORDS: Record<Lang, Words> = {
  fr: {
    unknownSender: "Expéditeur inconnu",
    theSender: "l'expéditeur",
    noSubject: "(sans objet)",
    separator: `${NBSP}: `,
    due(date) {
      if (!date) return "";
      const d = fold(date);
      if (/^(aujourd'hui|today|ce soir|tonight)$/.test(d)) return ` ${date}`;
      if (/^(dans|in) /.test(d)) return ` ${date}`;
      if (/^fin /.test(d)) return ` d'ici la ${date}`;
      if (/^(demain|apres-demain|tomorrow|end of)/.test(d)) return ` d'ici ${date}`;
      if (new RegExp(`^(${DAY_FR}|${DAY_EN})$`).test(d)) return ` avant ${date}`;
      return ` avant le ${date}`;
    },
    action(kind, { who, by, date, sum, t, contract }) {
      switch (kind) {
        case "meeting":
          return `Caler ce rendez-vous avec ${who}${date ? ` (${date})` : ""}.`;
        case "client":
          return `Répondre à ${who}${contract ? " et envoyer le document demandé" : ""}${by}.`;
        case "contract":
          if (IS_SIGNATURE.test(t)) return `Relire et signer le document${by}.`;
          if (IS_QUOTE.test(t)) return `Valider ou négocier le devis${by}.`;
          return `Relire le contrat et répondre${by}.`;
        case "bank":
          if (RX.bankFailure.test(t)) return `Régulariser le paiement${sum}${by}, depuis l'espace client officiel (pas via le lien de l'e-mail).`;
          if (RX.bankIssue.test(t)) return `Régler${sum || " le montant dû"}${by}, depuis l'espace client officiel.`;
          return `Vérifier le montant${sum} et la date du paiement${by}.`;
        case "alert":
          if (IS_ACCOUNT(t)) return "Rétablir l'accès depuis le site officiel du service, jamais via le lien reçu.";
          if (IS_DEPLOY.test(t)) return "Corriger puis relancer le déploiement.";
          return "Vérifier l'incident et prévenir la personne concernée.";
        case "expiry":
          if (IS_DOMAIN.test(t)) return `Renouveler le nom de domaine${by}.`;
          if (IS_ATTESTATION.test(t)) return `Envoyer ou renouveler l'attestation${by}.`;
          if (IS_CARD.test(t)) return `Mettre à jour la carte${by}.`;
          if (IS_SUBSCRIPTION.test(t)) return `Renouveler ou résilier l'abonnement${by}.`;
          return `Renouveler${by || " avant l'échéance"}.`;
        case "deadline":
          if (IS_APPOINTMENT.test(t)) return `Confirmer le rendez-vous${date ? ` (${date})` : ""}.`;
          if (RX.request.test(t)) return `Envoyer les documents demandés à ${who}${by}.`;
          return `Traiter${by || " aujourd'hui"}.`;
        default:
          return "";
      }
    },
    otp: (masked) => `Code de vérification reçu${masked ? ` (${masked})` : ""}${NBSP}: à ne jamais partager.`,
    security: `Connexion ou changement signalé sur le compte${NBSP}: si ce n'était pas vous, changez le mot de passe.`,
    terms: (date) => `Mise à jour des conditions ou de la confidentialité${date ? ` (en vigueur${NBSP}: ${date})` : ""}.`,
  },
  en: {
    unknownSender: "Unknown sender",
    theSender: "the sender",
    noSubject: "(no subject)",
    separator: ": ",
    due(date) {
      if (!date) return "";
      const d = fold(date);
      if (/^(aujourd'hui|today|ce soir|tonight)$/.test(d)) return ` ${date}`;
      if (/^(dans|in) /.test(d)) return ` ${date}`;
      if (/^(fin |end of)/.test(d)) return ` by the ${date.replace(/^end of (the )?/i, "end of the ")}`;
      if (/^(demain|apres-demain|tomorrow)/.test(d)) return ` by ${date}`;
      if (new RegExp(`^(${DAY_FR}|${DAY_EN})$`).test(d)) return ` before ${date}`;
      return ` by ${date}`;
    },
    action(kind, { who, by, date, sum, t, contract }) {
      switch (kind) {
        case "meeting":
          return `Set up this meeting with ${who}${date ? ` (${date})` : ""}.`;
        case "client":
          return `Reply to ${who}${contract ? " and send the requested document" : ""}${by}.`;
        case "contract":
          if (IS_SIGNATURE.test(t)) return `Review and sign the document${by}.`;
          if (IS_QUOTE.test(t)) return `Approve or negotiate the quote${by}.`;
          return `Review the contract and reply${by}.`;
        case "bank":
          if (RX.bankFailure.test(t)) return `Settle the payment${sum}${by}, from the official customer area (not through the email's link).`;
          if (RX.bankIssue.test(t)) return `Pay${sum || " the amount due"}${by}, from the official customer area.`;
          return `Check the amount${sum} and the payment date${by}.`;
        case "alert":
          if (IS_ACCOUNT(t)) return "Restore access from the service's official website, never through the link you received.";
          if (IS_DEPLOY.test(t)) return "Fix it, then run the deployment again.";
          return "Check the incident and let the person concerned know.";
        case "expiry":
          if (IS_DOMAIN.test(t)) return `Renew the domain name${by}.`;
          if (IS_ATTESTATION.test(t)) return `Send or renew the certificate${by}.`;
          if (IS_CARD.test(t)) return `Update the card${by}.`;
          if (IS_SUBSCRIPTION.test(t)) return `Renew or cancel the subscription${by}.`;
          return `Renew${by || " before it expires"}.`;
        case "deadline":
          if (IS_APPOINTMENT.test(t)) return `Confirm the appointment${date ? ` (${date})` : ""}.`;
          if (RX.request.test(t)) return `Send the requested documents to ${who}${by}.`;
          return `Deal with it${by || " today"}.`;
        default:
          return "";
      }
    },
    otp: (masked) => `Verification code received${masked ? ` (${masked})` : ""}: never share it.`,
    security: "A sign-in or a change was reported on the account: if it wasn't you, change the password.",
    terms: (date) => `Update to the terms or the privacy policy${date ? ` (effective: ${date})` : ""}.`,
  },
  ja: {
    unknownSender: "差出人不明",
    theSender: "差出人",
    noSubject: "（件名なし）",
    separator: "：",
    due: (date) => (date ? `（${date}まで）` : ""),
    action(kind, { who, by, date, sum, t, contract }) {
      const amount = sum.trim();
      switch (kind) {
        case "meeting":
          return `${who}との約束を調整する${date ? `（${date}）` : ""}。`;
        case "client":
          return `${who}に返信する${contract ? "（依頼された書類も送る）" : ""}${by}。`;
        case "contract":
          if (IS_SIGNATURE.test(t)) return `書類を確認して署名する${by}。`;
          if (IS_QUOTE.test(t)) return `見積もりを承認するか交渉する${by}。`;
          return `契約書を確認して返信する${by}。`;
        case "bank":
          if (RX.bankFailure.test(t))
            return `${amount ? `${amount}の` : ""}支払いを済ませる${by}。メールのリンクではなく、公式の会員ページから手続きしてください。`;
          if (RX.bankIssue.test(t)) return `${amount ? `${amount}を` : "請求額を"}支払う${by}。公式の会員ページから手続きしてください。`;
          return `金額${amount ? `（${amount}）` : ""}と支払日を確認する${by}。`;
        case "alert":
          if (IS_ACCOUNT(t)) return "受け取ったリンクではなく、サービスの公式サイトからアクセスを回復してください。";
          if (IS_DEPLOY.test(t)) return "修正してから、デプロイをやり直す。";
          return "障害の内容を確認し、関係者に知らせる。";
        case "expiry":
          if (IS_DOMAIN.test(t)) return `ドメインを更新する${by}。`;
          if (IS_ATTESTATION.test(t)) return `証明書を送るか更新する${by}。`;
          if (IS_CARD.test(t)) return `カード情報を更新する${by}。`;
          if (IS_SUBSCRIPTION.test(t)) return `サブスクリプションを更新または解約する${by}。`;
          return `期限が切れる前に更新する${by}。`;
        case "deadline":
          if (IS_APPOINTMENT.test(t)) return `予定を確定する${date ? `（${date}）` : ""}。`;
          if (RX.request.test(t)) return `${who}に依頼された書類を送る${by}。`;
          return `対応する${by || "（今日中）"}。`;
        default:
          return "";
      }
    },
    otp: (masked) => `確認コードを受信${masked ? `（${masked}）` : ""}：絶対に人に教えないでください。`,
    security: "アカウントでログインまたは変更が検出されました。心当たりがなければ、パスワードを変更してください。",
    terms: (date) => `利用規約またはプライバシーポリシーの更新${date ? `（適用日：${date}）` : ""}。`,
  },
};

const shortName = (sender: string, words: Words) => sender.replace(/\s*[,;、].*$/, "") || words.theSender;

function oneLine(email: RawEmail, words: Words): string {
  const subject = cleanSubject(email.subject) || words.noSubject;
  const sentence = squash(email.snippet).match(/^[^.!?。！？]{3,160}[.!?。！？]?/u)?.[0]?.trim() ?? "";
  const add = subject.length < 60 && sentence && !fold(subject).includes(fold(sentence).slice(0, 18));
  // "On se voit ? Ça fait longtemps !", not "On se voit ? : Ça fait…".
  const separator = /[。！？]$/.test(subject) ? "" : /[.!?]$/.test(subject) ? " " : words.separator;
  return shorten(add ? `${subject}${separator}${sentence}` : subject, 160);
}

function followLine(kind: Kind, email: RawEmail, date: string, words: Words): string {
  switch (kind) {
    case "otp": {
      // No lookbehind: iPhones before iOS 16.4 can't parse one.
      const code = `${email.subject} ${email.snippet}`.match(/(?:^|\D)(\d{4,8})(?!\d)/)?.[1];
      return words.otp(code ? `${code.slice(0, 2)}${"•".repeat(code.length - 2)}` : "");
    }
    case "security":
      return words.security;
    case "terms":
      return words.terms(date);
    default:
      return oneLine(email, words);
  }
}

/** Which section an email belongs to, in order of precedence. */
function decide(email: RawEmail, t: string, limit: boolean): [Category, Kind] {
  const subject = fold(email.subject.trim());
  const automated = RX.noreply.test(fold(email.sender));
  const noiseKind: Kind | null = RX.jobs.test(t)
    ? "jobs"
    : RX.promo.test(t)
      ? "promo"
      : RX.newsletter.test(t)
        ? "newsletter"
        : RX.social.test(t)
          ? "social"
          : null;
  const marketing = noiseKind === "promo" || noiseKind === "newsletter";
  const isReply = !automated && (RX.replyPrefix.test(subject) || RX.reply.test(t));
  const contract = RX.contract.test(t) && !marketing;
  const bank = RX.bank.test(t);
  const bankIssue = bank && RX.bankIssue.test(t) && !marketing;
  // A person proposing to meet — never a mailing, never minutes of a meeting already held.
  const meeting = !automated && !noiseKind && RX.meeting.test(t) && !RX.minutes.test(t);
  // Signals strong enough to keep an email out of the noise even when it
  // also looks like a mailing ("Re:", a contract, a rejected payment).
  const strong = isReply || contract || bankIssue || RX.account.test(t) || (RX.expiry.test(t) && !noiseKind);

  if (RX.otp.test(t) && !RX.notOtp.test(t) && !contract) return ["follow", "otp"];
  if (RX.account.test(t)) return ["priority", "alert"];
  if (noiseKind && !strong) return ["noise", noiseKind];
  if (RX.security.test(t)) return ["follow", "security"];
  if (RX.terms.test(t)) return ["follow", "terms"];
  if (meeting) return ["priority", "meeting"];
  if (isReply) return ["priority", "client"];
  if (contract) return ["priority", "contract"];
  // "Merci de nous transmettre les relevés avant le 15 novembre": a request
  // for documents, not a payment, even when it names bank papers.
  if (RX.request.test(t) && !bankIssue && (limit || RX.deadline.test(t))) return ["priority", "deadline"];
  if (bank && RX.paid.test(t) && !bankIssue) return ["follow", "confirmation"];
  if (bank && (bankIssue || limit || RX.invoice.test(t))) return ["priority", "bank"];
  if (RX.alert.test(t)) return ["priority", "alert"];
  if (RX.expiry.test(t)) return ["priority", "expiry"];
  if (RX.deadline.test(t) || limit) return ["priority", "deadline"];
  if (RX.confirmation.test(t)) return ["follow", "confirmation"];
  if (RX.update.test(t) || bank) return ["follow", "update"];
  return ["info", "other"];
}

const AMOUNT = /(\d[\d\s.,]*\d\s?(?:€|eur\b|euros?|円)|\d\s?(?:€|eur\b|euros?|円)|[$£¥]\s?\d[\d.,]*)/i;

/** Classes one email, finds its date and writes its line and next step. */
export function classifyEmail(email: RawEmail, lang: Lang = "fr"): TriageEmail {
  const words = WORDS[lang];
  const t = fold(`${email.sender} ${email.subject} ${email.snippet}`);
  const { date, limit } = findDate(`${email.subject} ${email.snippet}`);
  const [category, kind] = decide(email, t, limit);
  const amount = `${email.subject} ${email.snippet}`.match(AMOUNT)?.[1];
  const who = shortName(email.sender, words);
  const subject = cleanSubject(email.subject);
  const joiner = /[。！？]$/.test(subject) ? "" : /[.!?]$/.test(subject) ? " " : lang === "ja" ? "。" : ". ";

  const summary = category === "follow" ? followLine(kind, email, date, words) : oneLine(email, words);
  return {
    ...email,
    sender: email.sender || words.unknownSender,
    category,
    kind,
    summary,
    deadline: category === "priority" || kind === "terms" ? date : "",
    action:
      category === "priority"
        ? words.action(kind, { who, by: words.due(date), date, sum: amount ? ` ${squash(amount)}` : "", t, contract: RX.contract.test(t) })
        : "",
    // "Camille : On se voit cette semaine ? Un café jeudi soir…": who, then what
    // they wrote — what the request form's "Décrire en une phrase" reads.
    meetingText:
      kind === "meeting"
        ? shorten(`${email.sender ? `${who}${words.separator}` : ""}${subject}${subject && email.snippet ? joiner : ""}${email.snippet}`, 300)
        : "",
  };
}

// ---------------------------------------------------------------- the brief

export function buildBrief(emails: TriageEmail[], lang: Lang = "fr", now = new Date()): Brief {
  const of = (category: Category) => emails.filter((email) => email.category === category);
  const grouped = (items: TriageEmail[], kinds: Kind[]): BriefGroup[] =>
    kinds
      .map((kind) => ({ kind, label: KIND_LABEL[lang][kind], items: items.filter((email) => email.kind === kind) }))
      .filter((group) => group.items.length > 0);

  // Closest deadline first; an alert with no date is for today.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const when = (email: TriageEmail) =>
    email.deadline ? deadlineTime(email.deadline, now) : email.kind === "alert" ? today : Infinity;
  const priority = of("priority").sort((a, b) => when(a) - when(b));
  const follow = [...of("follow"), ...of("info")];
  const noise = of("noise");
  return {
    emails,
    counts: {
      total: emails.length,
      actions: priority.length,
      info: follow.length,
      noise: noise.length,
      meetings: emails.filter((email) => email.kind === "meeting").length,
      // Rough reading time spared: a minute per email you no longer open,
      // half a minute per information reduced to one line.
      minutesSaved: Math.round(noise.length + priority.length + follow.length * 0.5),
    },
    // Meetings first (the part Ittsui acts on), then the group holding the
    // most urgent email.
    priorities: grouped(priority, KINDS.priority).sort((a, b) =>
      a.kind === "meeting" ? -1 : b.kind === "meeting" ? 1 : Math.min(...a.items.map(when)) - Math.min(...b.items.map(when)),
    ),
    follow: grouped(follow, [...KINDS.follow, "other"]),
    noise: grouped(noise, KINDS.noise),
  };
}

/** The whole local pipeline: pasted text in, brief out. Never throws. */
export function triage(input: string, lang: Lang = "fr", now = new Date()): Brief {
  return buildBrief(parseEmails(input).slice(0, 300).map((email) => classifyEmail(email, lang)), lang, now);
}
