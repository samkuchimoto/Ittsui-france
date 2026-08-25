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
  // Orthogonal to `status`: a paused pair is still "active" (both people
  // stay connected, the schedule/preferences are kept exactly as set) —
  // it just stops generating new weekly proposals until resumed. A
  // separate boolean rather than a new PairStatus value on purpose: status
  // drives real relationship bookkeeping elsewhere (SetupClient's "does
  // this person already have an active pair" redirect, invite-partner's
  // dedupe query) that shouldn't have to also reason about "paused" as a
  // distinct relationship state — it isn't one, it's a toggle on an
  // otherwise-unchanged active pair. Optional/absent === not paused, so
  // every pair created before this field existed reads correctly.
  paused?: boolean;
  preferences: Preferences;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled";
  createdAt: string; // ISO date
  // Real delivery record for the invite email, not an assumption — set by
  // invite-partner/route.ts right after actually attempting to send it.
  partnerEmailSent?: boolean;
  inviteSentAt?: string; // ISO date
  // Set once, the first time the invite link is actually loaded — see
  // api/mark-invite-opened/route.ts. Absent means "not opened yet", not
  // "unknown"; every pair created after this field existed can trust that.
  inviteOpenedAt?: string; // ISO date
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
  // Real delivery record, not an assumption — what notifyBothUsers()
  // actually managed to send at each stage (weekly-propose/route.ts on
  // "proposed", rsvp/route.ts on "confirmed"), per recipient. Optional:
  // absent on any week from before this existed.
  notificationLog?: {
    event: "proposed" | "confirmed";
    sentAt: string; // ISO
    results: { userId: string; status: "push" | "email" | "failed" | "no-recipient" }[];
  }[];
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

// A user's own address-book-style contact list (name + email) — not a
// messaging system, just enough to pick a recipient for a MeetingRequest
// without retyping their details every time.
export interface Contact {
  id: string;
  name: string;
  email: string; // lowercased
  createdAt: string; // ISO date
}

export type MeetingRequestStatus = "pending" | "accepted" | "declined" | "expired";

// A one-off rendezvous proposal sent to a contact by email — the ad-hoc
// counterpart to Pair's permanent, recurring weekly bond. Same
// invite-by-email/accept-in-app shape as Pair (see /api/invite-partner,
// /api/activate-pending-pair), generalized to any contact and a single
// specific venue/date/time instead of a standing weekly agreement.
export interface MeetingRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string | null;
  recipientName: string; // name the sender gave for the recipient
  recipientEmail: string; // lowercased
  recipientId?: string; // set once the recipient signs in and accepts
  venueName: string;
  venueAddress: string;
  // Optional — lets both the sender's and recipient's views show the same
  // AI mood illustration (with its mandatory disclosure badge) DiscoveryGrid
  // already uses for venue-type preferences elsewhere in the app, rather
  // than inventing a second image mechanism. Never a photo of the specific
  // address itself (this app has no real per-address photo source) — see
  // app/api/ai-venue-mood/route.ts's own reasoning for why that distinction
  // is what makes the feature honest.
  venueType?: VenueType;
  date: string; // "YYYY-MM-DD", Europe/Paris calendar date
  time: string; // "HH:MM", Europe/Paris wall-clock
  status: MeetingRequestStatus;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date — same 14-day window as a Pair invite
  respondedAt?: string; // ISO date
  recipientEmailSent?: boolean; // real delivery record, not an assumption
}
