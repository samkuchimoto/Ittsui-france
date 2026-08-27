// /lib/mascots.config.ts
// Central registry for the Ittsui character universe (Kokoro & Hikari as
// the core pair, plus Sora/Tao, Ren/Yuki, and the extended cast) — the
// full 2D illustrated cast, by explicit product decision, not a
// code-drawn abstraction.
//
// IMPORTANT — image assets are not yet in this repo. `imageSrc` below
// points at where each character's exported cutout must be placed
// (`/public/images/mascots/{id}.png` or `.png`/`.webp`, transparent
// background, consistent canvas size) for <MascotAvatar> to render it.
// Nothing currently exists at those paths — per explicit direction, this
// stays a plain <Image>, with no code-drawn placeholder shape standing in
// for the real character art, so a page using this today will show a
// broken image until the actual file is dropped in at the path below.

export type CharacterId =
  | "kokoro"
  | "hikari"
  | "sora"
  | "tao"
  | "ren"
  | "yuki"
  | "mochi"
  | "pika"
  | "nami"
  | "milo"
  | "chika"
  | "bao"
  | "kumachan";

export interface MascotPalette {
  primary: string;
  secondary: string;
}

export interface MascotConfig {
  id: CharacterId;
  name: string;
  species: string;
  trait: string;
  description: string;
  tags: [string, string];
  category: "core" | "extended";
  imageSrc: string;
  palette: MascotPalette;
  // Optional per-mood art (idle/success/empty) — the "conditional image
  // swap" alternative to a Rive/Lottie state machine, per explicit
  // direction to stay static-assets-only. No character has any of these
  // yet; MascotAvatar already falls back to `imageSrc` for any mood with
  // no entry here, so this is purely additive whenever art for a specific
  // mood actually exists.
  states?: Partial<Record<"idle" | "success" | "empty", string>>;
}

export const MASCOTS: Record<CharacterId, MascotConfig> = {
  kokoro: {
    id: "kokoro",
    name: "Kokoro",
    species: "bear",
    trait: "The Steady One",
    description: "Calm, reliable and always there. He listens more than he speaks but his presence reassures.",
    tags: ["Anchor", "Trust"],
    category: "core",
    imageSrc: "/images/mascots/kokoro.png",
    palette: { primary: "#8B6F47", secondary: "#F0E6D6" },
  },
  hikari: {
    id: "hikari",
    name: "Hikari",
    species: "rabbit",
    trait: "The Bright One",
    description: "Energetic, optimistic and expressive. She brings light, laughter and spontaneity everywhere.",
    tags: ["Joy", "Energy"],
    category: "core",
    imageSrc: "/images/mascots/hikari.png",
    palette: { primary: "#E8A0A8", secondary: "#FCEEF0" },
  },
  sora: {
    id: "sora",
    name: "Sora",
    species: "cat",
    trait: "The Dreamer",
    description: "Thoughtful, imaginative and artistic. He sees the world differently.",
    tags: ["Creativity", "Calm"],
    category: "core",
    imageSrc: "/images/mascots/sora.png",
    palette: { primary: "#6B7B6E", secondary: "#E9EDE9" },
  },
  tao: {
    id: "tao",
    name: "Tao",
    species: "shiba inu",
    trait: "The Adventurer",
    description: "Curious, brave and loves new experiences. Always ready to go!",
    tags: ["Curiosity", "Freedom"],
    category: "core",
    imageSrc: "/images/mascots/tao.png",
    palette: { primary: "#D19A5A", secondary: "#F7E9D6" },
  },
  ren: {
    id: "ren",
    name: "Ren",
    species: "panda",
    trait: "The Thinker",
    description: "Logical, wise and observant. He loves to understand how things work.",
    tags: ["Wisdom", "Logic"],
    category: "core",
    imageSrc: "/images/mascots/ren.png",
    palette: { primary: "#3E4A5C", secondary: "#E4E7EB" },
  },
  yuki: {
    id: "yuki",
    name: "Yuki",
    species: "penguin",
    trait: "The Cheerleader",
    description: "Encouraging, supportive and positive. She lifts everyone's spirits.",
    tags: ["Support", "Optimism"],
    category: "core",
    imageSrc: "/images/mascots/yuki.png",
    palette: { primary: "#7093A8", secondary: "#E9F0F4" },
  },
  mochi: {
    id: "mochi",
    name: "Mochi",
    species: "mochi spirit",
    trait: "The Little Joy",
    description: "Sweet, innocent and full of wonder. Everyone's little happiness.",
    tags: ["Innocence", "Delight"],
    category: "extended",
    imageSrc: "/images/mascots/mochi.png",
    palette: { primary: "#C9BFA8", secondary: "#F7F4EC" },
  },
  pika: {
    id: "pika",
    name: "Pika",
    species: "chick",
    trait: "The Messenger",
    description: "Fast, diligent and always on the move. Delivers with care.",
    tags: ["Diligence", "Speed"],
    category: "extended",
    imageSrc: "/images/mascots/pika.png",
    palette: { primary: "#E8C468", secondary: "#FBF2DC" },
  },
  nami: {
    id: "nami",
    name: "Nami",
    species: "otter",
    trait: "The Zen One",
    description: "Peaceful, patient and grounded. Loves the simple things.",
    tags: ["Peace", "Patience"],
    category: "extended",
    imageSrc: "/images/mascots/nami.png",
    palette: { primary: "#9C7B54", secondary: "#F1E8DA" },
  },
  milo: {
    id: "milo",
    name: "Milo",
    species: "dinosaur",
    trait: "The Builder",
    description: "Practical, helpful and loves to create things that last.",
    tags: ["Growth", "Reliability"],
    category: "extended",
    imageSrc: "/images/mascots/milo.png",
    palette: { primary: "#7A9B76", secondary: "#E9F0E8" },
  },
  chika: {
    id: "chika",
    name: "Chika",
    species: "fox",
    trait: "The Planner",
    description: "Organized, smart and loves lists. Keeps everything on track.",
    tags: ["Order", "Strategy"],
    category: "extended",
    imageSrc: "/images/mascots/chika.png",
    palette: { primary: "#C97A4A", secondary: "#F5E4D8" },
  },
  bao: {
    id: "bao",
    name: "Bao",
    species: "dog",
    trait: "The Artist",
    description: "Creative, sensitive and sees beauty in every detail.",
    tags: ["Art", "Inspiration"],
    category: "extended",
    imageSrc: "/images/mascots/bao.png",
    palette: { primary: "#CBB89A", secondary: "#F6F1E8" },
  },
  kumachan: {
    id: "kumachan",
    name: "Kuma-chan",
    species: "bear",
    trait: "The Heart",
    description: "Warm, kind and full of love. The emotional center of the group.",
    tags: ["Love", "Kindness"],
    category: "extended",
    imageSrc: "/images/mascots/kumachan.png",
    palette: { primary: "#6B4A35", secondary: "#EBE0D6" },
  },
};

// Named pairs, matching the poster's own groupings. Kept as a lookup
// (rather than deriving pairs from category alone) since "core" has three
// pairs, not one, and the extended cast's members aren't paired at all in
// the source material — Kuma-chan/Mochi here is this codebase's own
// pairing for the "famille" relationship kind, not from the poster.
export const MASCOT_PAIRS = {
  primary: ["kokoro", "hikari"],
  friends: ["sora", "tao"],
  family: ["kumachan", "mochi"],
} satisfies Record<string, [CharacterId, CharacterId]>;

export type MascotPairId = keyof typeof MASCOT_PAIRS;

// Kokoro & Hikari are the default fallback pair for any empty state that
// doesn't otherwise know which relationship it's representing.
export const DEFAULT_PAIR: [CharacterId, CharacterId] = MASCOT_PAIRS.primary;

// Matches the existing "ami" / "partenaire" / "famille" relationship-kind
// values already used in the setup flow (kept as a plain string union here
// rather than importing that page's local type, to keep this a dependency-
// free config file) — lets any relationship picker resolve straight to a
// pair without hardcoding the mapping at each call site.
export type RelationshipKind = "ami" | "partenaire" | "famille";

export const RELATIONSHIP_PAIR: Record<RelationshipKind, MascotPairId> = {
  ami: "friends",
  partenaire: "primary",
  famille: "family",
};
