// Shared types — the state machine's shape, used across frontend + API routes

export type VenueType = "cafe" | "restaurant" | "home" | "park" | "museum";

export type DietaryFilter =
  | "casher"
  | "halal"
  | "vegetarien"
  | "bio"
  | "antillais"
  | string; // open list — user can add custom tags

export interface Preferences {
  venueTypes: VenueType[]; // multi-select
  dietaryFilters: DietaryFilter[]; // multi-select, open list
}

export type WeekStatus = "proposed" | "confirmed" | "cancelled";

export type PairStatus = "pending" | "active" | "declined" | "expired" | "cancelled";

export interface Pair {
  id: string;
  userIds: string[]; // 1 while pending (inviter only), 2 once active
  status: PairStatus;
  partnerName: string; // name the inviter gave for the invited person
  invitedEmail?: string; // set while pending; the email the invite was sent to
  expiresAt?: string; // ISO date; pending invites older than this are dead
  agreedDay: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  agreedWindowStart: string; // e.g. "15:00"
  agreedWindowEnd: string; // e.g. "17:00"
  // Days before agreedDay that the weekly proposal notification should go
  // out. Optional, defaults to 0 (same day) read-side — lets e.g. a
  // Saturday-afternoon meeting notify on Thursday instead of Saturday,
  // without touching agreedDay/agreedWindowStart/agreedWindowEnd, which
  // already fully describe the meeting itself.
  notifyDaysBefore?: number;
  // 5-digit French postal code for where this pair actually meets.
  // Optional, read-side default is "no preference" (Paris-only static
  // catalog, existing behavior) — see weekly-propose/route.ts's
  // departmentFromPostalCode(). Real nationwide venue coverage still needs
  // a live venues data source; this only unlocks the handful of major
  // metros that are honestly hardcoded today.
  postalCode?: string;
  preferences: Preferences;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled";
  createdAt: string; // ISO date
}

export interface VenueOption {
  venueId: string;
  venueName: string;
  venueAddress: string;
  // Optional, additive — lets the dashboard show a real photo instead of
  // plain text. Populated by the Firestore and static tiers of the venue
  // pipeline (weekly-propose/route.ts), which know the type; left unset by
  // the RAG tier's response shape, and by any week proposed before this
  // field existed — both read-side as "no confident photo," not an error.
  venueType?: VenueType;
}

export interface Week {
  id: string;
  pairId: string;
  weekOf: string; // ISO date, Monday of that week
  venueName: string;
  venueAddress?: string;
  confirmationText: string; // Groq-generated one-liner, e.g. "Café X, dimanche 15h30"
  proposedTime: string; // ISO datetime
  status: WeekStatus;
  // "yes"/"no" is the single-option path (unchanged, legacy-compatible).
  // "A"/"B" is used only when optionB is present — each person votes for
  // whichever option they want; it only confirms if both pick the same one.
  responses: {
    [userId: string]: "yes" | "no" | "A" | "B" | null;
  };
  optionA?: VenueOption; // present when a second real candidate was available
  optionB?: VenueOption; // absent -> falls back to the single-option yes/no flow
}

export interface User {
  id: string;
  email: string;
  pushToken?: string;
  notificationPrefs: {
    pushEnabled: boolean;
    emailEnabled: boolean;
  };
}
