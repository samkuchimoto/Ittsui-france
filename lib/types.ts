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
  preferences: Preferences;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled";
  createdAt: string; // ISO date
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
  responses: {
    [userId: string]: "yes" | "no" | null;
  };
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
