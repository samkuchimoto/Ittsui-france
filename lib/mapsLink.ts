// /lib/mapsLink.ts
// Real, one-tap itinerary links for a venue that Ittsui already knows the
// name and address of.
//
// Direct user feedback, verbatim: "Curiosite il veut savoir" and "Adress
// not / Je rentre" — seeing a real street address shifts someone from
// reading a proposal to picturing the trip, and the app was ending that
// thought at a line of static text. This is the smallest honest way to
// finish it: hand the address to a mapping app the user already has,
// rather than reproducing transit times, opening hours or a price level
// Ittsui has no live data source for.
//
// Both builders are pure URL construction against each service's
// documented public query format — no API key, no request at render time,
// nothing to rate-limit or to go stale. Google Maps' /maps/search/?api=1
// form is its own documented URL API; Citymapper's /directions endpoint
// takes a free-text destination the same way its web app does.
//
// Deliberately NOT here: a fabricated "5 min à pied de la station X" or a
// budget figure. Neither is derivable from a name and an address, and
// inventing one is the same class of mistake as inventing a venue photo
// (see app/page.tsx's "Envoyer une attention" comment).

/** "Café de Flore" + "172 Bd Saint-Germain, 75006 Paris" -> one query string. */
function venueQuery(name: string, address?: string): string {
  return [name, address].filter(Boolean).join(", ");
}

/** Opens the venue's place card in Google Maps (web or the native app). */
export function googleMapsLink(name: string, address?: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueQuery(name, address))}`;
}

/** Public-transit directions to the venue, in Citymapper. */
export function citymapperLink(name: string, address?: string): string {
  return `https://citymapper.com/directions?endname=${encodeURIComponent(name)}&endaddress=${encodeURIComponent(
    venueQuery(name, address),
  )}`;
}
