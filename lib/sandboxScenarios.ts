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

export function scenarioFor(id: DuoContext): SandboxScenario {
  return SANDBOX_SCENARIOS.find((s) => s.id === id) ?? SANDBOX_SCENARIOS[0];
}
