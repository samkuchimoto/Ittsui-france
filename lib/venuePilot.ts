// /lib/venuePilot.ts
// The venue partner pilot's terms in each language: what a venue gets, what
// a verified visit is, the fee and how it is settled, how to stop. One text
// for the city landing pages (CityLanding.tsx) and /partenaires.
//
// The fee is the 2026-10-23 brief's hypothesis, €1.50 per verified visit,
// the same in every city until evidence says otherwise. A visit is verified
// by the codes of lib/partnerPilot.ts; statements and payment are handled
// by hand until volume justifies more. Partner venues are only proposed in
// Paris so far (matching is by French postal code): elsewhere a venue joins
// a pilot that hasn't started, and the page says so.
// No runtime imports: safe in the browser and on the server.

type Lang = "fr" | "en" | "ja" | "es" | "he";

export const VENUE_PILOT: Record<Lang, { benefit: string; live: string; notYet: string; terms: string[] }> = {
  fr: {
    benefit:
      "Ittsui propose votre lieu en premier aux personnes qui retrouvent un proche dans le quartier, pendant les heures creuses que vous choisissez, avec « Partenaire · votre avantage ».",
    live: "Déjà en place à Paris.",
    notYet: "Pas encore en place à {city} : les lieux qui s'inscrivent maintenant ouvrent le pilote, et rien n'est facturé avant une visite vérifiée.",
    terms: [
      "Vous choisissez vos heures creuses et un petit avantage (un café offert, par exemple), modifiables ou suspendus à tout moment.",
      "Une visite vérifiée : les deux personnes montrent un code de 4 caractères au comptoir, et vous le validez le jour même sur votre page partenaire. Sans code validé, rien n'est facturé.",
      "Prix du pilote : 1,50 € par visite vérifiée, rien d'autre. Ni abonnement, ni frais d'inscription.",
      "Chaque mois, vous recevez la liste des visites vérifiées : 7 jours pour en contester une, puis 30 jours pour payer par virement.",
      "Sans engagement : vous arrêtez quand vous voulez ; seules les visites déjà vérifiées sont dues.",
    ],
  },
  en: {
    benefit:
      "Ittsui proposes your place first to people meeting someone close nearby, during the quiet hours you choose, labelled “Partner · your perk”.",
    live: "Live in Paris now.",
    notYet: "Not live in {city} yet: the venues that join now open the pilot there, and nothing is charged before a verified visit.",
    terms: [
      "You choose your quiet hours and one small perk (a coffee, for example), and can change or pause them at any time.",
      "A verified visit: the two people show a 4-character code at your counter, and you validate it on your partner page on the day. No validated code, no charge.",
      "Pilot price: €1.50 per verified visit (or the equivalent in your currency), nothing else. No subscription, no sign-up fee.",
      "Each month you get the list of verified visits: 7 days to contest any of them, then 30 days to pay by bank transfer.",
      "No commitment: stop whenever you like; only visits already verified are due.",
    ],
  },
  ja: {
    benefit:
      "近くで大切な人と会う人たちに、お店が選んだ空いている時間帯、あなたのお店を「提携店・特典」として最初に提案します。",
    live: "パリではすでに実施中です。",
    notYet: "{city}ではまだ始まっていません。今参加するお店から{city}での試験運用を始め、確認済みの来店があるまで料金は一切かかりません。",
    terms: [
      "空いている時間帯と、ちょっとした特典（コーヒー1杯など）はお店が決め、いつでも変更・停止できます。",
      "確認済みの来店：おふたりがレジで4文字のコードを見せ、お店が当日、提携店ページで確認します。確認されたコードがなければ、料金は発生しません。",
      "試験運用の料金：確認済みの来店1件につき1.50ユーロ（またはお客様の通貨での相当額）のみ。月額料金も登録料もありません。",
      "毎月、確認済みの来店の一覧をお送りします。7日以内なら異議を申し立てられ、その後30日以内に銀行振込でお支払いいただきます。",
      "契約の縛りはありません。いつでもやめられ、お支払いは確認済みの来店分のみです。",
    ],
  },
  es: {
    benefit:
      "Ittsui propone tu lugar primero a quienes se ven con alguien cercano en la zona, en los horarios tranquilos que tú elijas, con la etiqueta “Aliado · tu beneficio”.",
    live: "Ya funciona en París.",
    notYet: "Todavía no funciona en {city}: los lugares que se unan ahora abren ahí el piloto, y no se cobra nada antes de una visita verificada.",
    terms: [
      "Tú eliges tus horarios tranquilos y un pequeño beneficio (un café, por ejemplo), y puedes cambiarlos o pausarlos cuando quieras.",
      "Una visita verificada: las dos personas muestran un código de 4 caracteres en tu caja y tú lo validas ese mismo día en tu página de aliado. Sin código validado, no se cobra.",
      "Precio del piloto: 1.50 € por visita verificada (o su equivalente en pesos), nada más. Sin suscripción ni costo de inscripción.",
      "Cada mes recibes la lista de visitas verificadas: tienes 7 días para objetar cualquiera y luego 30 días para pagar por transferencia.",
      "Sin compromiso: dejas el piloto cuando quieras; solo se pagan las visitas ya verificadas.",
    ],
  },
  he: {
    benefit:
      'Ittsui מציעה את המקום שלכם ראשון לאנשים שנפגשים עם מישהו קרוב באזור, בשעות השקטות שתבחרו, עם התווית "שותף · ההטבה שלכם".',
    live: "כבר פועל בפריז.",
    notYet: "עדיין לא פועל ב{city}: המקומות שמצטרפים עכשיו פותחים שם את הפיילוט, ולא נגבה כלום לפני ביקור מאומת.",
    terms: [
      "אתם בוחרים את השעות השקטות והטבה קטנה (קפה, למשל), ואפשר לשנות או להשהות אותן בכל רגע.",
      "ביקור מאומת: שני האנשים מציגים בקופה קוד בן 4 תווים, ואתם מאשרים אותו באותו יום בדף השותף שלכם. בלי קוד מאושר, אין חיוב.",
      "מחיר הפיילוט: 1.50 אירו לכל ביקור מאומת (או השווי בשקלים), וזהו. בלי מנוי ובלי דמי הצטרפות.",
      "בכל חודש מקבלים את רשימת הביקורים המאומתים: 7 ימים לערער על ביקור, ואז 30 יום לתשלום בהעברה בנקאית.",
      "בלי התחייבות: אפשר להפסיק מתי שרוצים; משלמים רק על ביקורים שכבר אומתו.",
    ],
  },
};
