// /lib/proposalMessage.ts
// The text that actually lands in someone's WhatsApp or SMS when a
// rendez-vous is shared by hand.
//
// Why this exists: the two delivery channels were telling the recipient
// completely different things about the same proposal. The email named
// the sender, the venue, the street address, the date and the time, and
// offered a calendar link (see /api/meeting-requests/create). The
// WhatsApp/SMS message said:
//
//     "Je te propose un rendez-vous sur Ittsui : <lien>"
//
// — no name, no place, no date, no time. Which is backwards, twice over.
// WhatsApp reaches ~67% of French internet users (Statista Q3 2024, the
// figure lib/phoneShareLinks.ts is already built around), so it is the
// bigger channel; and it is the channel used for phone-only requests,
// which are precisely the ones the recipient can accept in one tap with
// no account at all (see /api/meeting-requests/respond's trust boundary).
// The lowest-friction path carried the least information, and asked the
// recipient to open an unknown link from an unknown brand to find out
// what it even was.
//
// A message that states the proposal is also the product demo. Someone
// who never signs up still sees, in their own messaging app, exactly
// what Ittsui does: one specific place, one specific time, answer in a
// tap.
//
// Two things this deliberately does not do. It does not claim "Ittsui
// nous propose" for an ad-hoc request — the sender chose that venue and
// time themselves in /request/new, and attributing their choice to the
// product would be a small lie in the one message meant to build trust.
// And it joins the venue with an em dash instead of a preposition:
// "au Café de Flore" is right, "au Jardin du Luxembourg" is right,
// "au Maison de la Radio" is not, and this has no gender data for a
// free-text venue name someone typed in.

const FRENCH_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/**
 * "2026-09-20" -> "samedi 20 septembre".
 * Returns the input unchanged if it isn't a parseable ISO date — the
 * message degrades to showing the raw value rather than "Invalid Date".
 */
export function frenchDateLabel(isoDate: string): string {
  // Parsed as local midnight, not UTC: `new Date("2026-09-20")` is UTC
  // midnight, which renders as the 19th for anyone behind UTC and would
  // silently name the wrong day.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return isoDate;
  return FRENCH_DATE.format(date);
}

/** "15:30" -> "15h30", "20:00" -> "20h". French reads the round hour bare. */
export function frenchTimeLabel(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  return match[2] === "00" ? `${Number(match[1])}h` : `${Number(match[1])}h${match[2]}`;
}

/**
 * The share text for a one-off rendez-vous proposed through /request/new.
 *
 * `noAccountNeeded` is the phone-only case, where the unguessable link is
 * itself the authorization and the recipient really can answer without
 * signing in to anything. It is false for an email-addressed request,
 * which does require a Google sign-in to accept — promising "sans compte"
 * there would be the exact kind of claim that costs trust at the moment
 * it is being asked for.
 */
export function meetingRequestShareText({
  recipientName,
  venueName,
  date,
  time,
  noAccountNeeded,
}: {
  recipientName: string;
  venueName: string;
  date: string;
  time: string;
  noAccountNeeded: boolean;
}): string {
  const name = recipientName.trim();
  const when = `${frenchDateLabel(date)} à ${frenchTimeLabel(time)}`;
  const where = venueName.trim() ? ` — ${venueName.trim()}` : "";
  const tail = noAccountNeeded ? "Réponds en un tap, sans compte à créer :" : "Tu peux répondre ici :";
  // The clause is capitalised when it opens the message and lowercase
  // when a greeting precedes it — without this, a request sent with no
  // recipient name started mid-sentence: "je te propose qu'on...".
  const proposal = `${name ? "je" : "Je"} te propose qu'on se retrouve ${when}${where}.`;
  return `${name ? `Salut ${name}, ` : ""}${proposal} Tu es partant(e) ? ${tail}`;
}
