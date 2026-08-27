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
  // At least one of these two is always present while a pair is pending
  // (enforced by /api/invite-partner's Zod refine) — same reasoning as
  // MeetingRequest/Contact's identical shape (2026-08-25 real-user
  // finding: real people know a phone number, not an email). Both get
  // cleared on decline (see activate-pending-pair's data-minimization
  // comment) — invitedPhone is exactly as identifying as invitedEmail
  // once someone's declined, so it's deleted the same way.
  invitedEmail?: string; // set while pending; the email the invite was sent to
  invitedPhone?: string;
  expiresAt?: string; // ISO date; pending invites older than this are dead
  agreedDay: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  agreedWindowStart: string; // e.g. "15:00"
  agreedWindowEnd: string; // e.g. "17:00"
  // Optional, read-side default "weekly" (every pair created before this
  // field existed keeps its exact current behavior). Reuses agreedDay/
  // agreedWindowStart/agreedWindowEnd exactly as-is for "which day, what
  // time" — "monthly"/"yearly" only change HOW OFTEN that day actually
  // gets a new proposal, via weekly-propose/route.ts's isCadenceDue(),
  // not a separate calendar-date schedule.
  cadence?: "weekly" | "monthly" | "yearly";
  // Set from the "C'est qui, pour vous ?" picker in setup — was local-only
  // UI state until the mascot pair needed to know which relationship this
  // actually is (see lib/mascots.config.ts's RELATIONSHIP_PAIR). Optional:
  // absent on any pair created before this field existed, or if a future
  // caller genuinely doesn't know — MascotPair falls back to the default
  // pair rather than requiring it.
  relationshipKind?: "ami" | "partenaire" | "famille";
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

// A user's own address-book-style contact list — not a messaging system,
// just enough to pick a recipient for a MeetingRequest without retyping
// their details every time. At least one of email/phone always exists
// (enforced by /api/contacts' Zod refine, same shape as MeetingRequest's
// identical invariant) — both optional at the type level rather than a
// discriminated union, since every consumer already treats "no email" as
// a real, handled case (2026-08-25: real people often only know a
// friend's phone number, not their email).
export interface Contact {
  id: string;
  name: string;
  email?: string; // lowercased
  phone?: string; // stored as typed, not normalized — compared via lib/phoneShareLinks.ts's normalizer where dedup/matching needs it
  createdAt: string; // ISO date
}

// "cancelled" added 2026-08-27 — real feedback: a sender had no way to
// withdraw a pending request at all, so an accumulating list of stale
// "en attente" proposals to the same person was the only possible state,
// directly contradicting the product's own "one proposal, one decision"
// promise (see /api/meeting-requests/cancel/route.ts).
export type MeetingRequestStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled";

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
  // At least one of these two is always present (enforced by
  // /api/meeting-requests/create's Zod schema), never both required — real
  // people overwhelmingly know a friend's phone number, not their email
  // (2026-08-25 real-user test: asking for an email as the very first
  // field caused an under-10-second abandonment). recipientPhone is never
  // used to send anything server-side (no SMS provider exists in this
  // app) — it exists so the sender can be handed a share-this-link-
  // yourself flow (lib/shareLink.ts) instead of a dead end.
  recipientEmail?: string; // lowercased
  recipientPhone?: string;
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

// Ittsui Partenaires — real booking infrastructure for venues that
// directly onboard (see app/partenaires/page.tsx), deliberately NOT
// modeled as recurring weekly windows (like Pair's agreedDay/
// agreedWindowStart/agreedWindowEnd) — a recurring slot would need
// separate tracking of which specific date-instance of "every Tuesday
// 15h-17h" is already taken, which is real complexity for no real
// benefit at this scale. A flat list of specific, one-off open slots
// makes "is this slot already booked" an unambiguous yes/no with no
// extra bookkeeping.
export type VenuePartnerStatus = "pending_review" | "active" | "rejected";
export type VenuePartnerCategory = "cafe" | "restaurant" | "museum" | "autre";

export interface VenuePartnerSlot {
  id: string; // stable per-slot id — how a booking references exactly which slot it filled
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  booked: boolean;
}

export interface VenuePartner {
  id: string;
  venueName: string;
  category: VenuePartnerCategory;
  address: string;
  postalCode?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
  status: VenuePartnerStatus;
  // Only ever set once, at approval — the bearer secret for this
  // venue's own "manage my availability" link (app/partenaires/[id]/gerer),
  // same trust model as every other bearer link in this app (an
  // unguessable token IS the authorization, no separate login system
  // for venue owners).
  manageToken?: string;
  slots?: VenuePartnerSlot[];
  createdAt: string;
}

// "Envoyer un geste" — a real, distinct relationship touchpoint from the
// meeting-request flow: a physical gesture instead of a rendez-vous.
// Framed deliberately as "send something", not "gift shop" — one
// relationship action alongside a café or a walk, not a storefront.
// Three modes, not a product category:
//   - "own": something the sender already has (a book, an object with
//     history) — Ittsui arranges nothing, this is pure zero-API intent
//     capture; delivery is the sender's own problem to solve (hand it
//     over, mail it themselves), same honesty boundary as the rest of
//     this feature.
//   - "curated": a small, deliberately non-Amazon list of gesture types
//     (see lib/giftLinks.ts's CURATED_ITEM_LABEL) — each links out to one
//     real, well-known French merchant homepage to finish the gesture,
//     never a fabricated specific-product deep link.
//   - "suggested": Ittsui picks one curated item for the sender instead
//     of asking them to choose — genuinely just decision-load removal
//     (a deterministic pick, reshuffleable), not a claim that Ittsui
//     knows anything personal about the recipient it doesn't actually
//     have data for.
// `status` only ever tracks "the sender was notified/pointed somewhere,"
// never "delivered" — this app has no real purchase/delivery API
// partnership (see lib/giftLinks.ts and docs/three-fronts-and-gifting.md
// for why Amazon/Deliveroo/Uber Direct specifically aren't it).
export type GiftMode = "own" | "curated" | "suggested";
export type CuratedGiftItem = "fleurs" | "livre" | "chocolat" | "plante" | "bougie" | "papeterie" | "repas";
export type GiftGestureStatus = "sent";

export interface GiftGesture {
  id: string;
  senderName: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  mode: GiftMode;
  itemDescription?: string; // "own" mode: sender's free-text description of the object itself
  item?: CuratedGiftItem; // "curated"/"suggested" mode: which gesture type was picked
  note?: string;
  status: GiftGestureStatus;
  createdAt: string;
}

export type VenueBookingStatus = "confirmed" | "cancelled";

export interface VenueBooking {
  id: string;
  venuePartnerId: string;
  venueName: string;
  venueAddress: string;
  slotId: string;
  date: string;
  time: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  status: VenueBookingStatus;
  createdAt: string;
}
