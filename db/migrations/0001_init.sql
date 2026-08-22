-- 0001_init.sql
-- Initial Postgres schema. This database exists alongside the live
-- Firestore-backed app (see lib/firebaseAdmin.ts, app/api/**), not in
-- place of it -- nothing here is wired into the running app yet. Firestore
-- remains the actual source of truth for the app today.
--
-- Design carries forward the app's real, current relationship model
-- (Pair/Week/VenueOption in lib/types.ts) plus Community, a new N-member
-- entity distinct from a Pair, sharing the same recurring-slot /
-- propose-confirm-swap-skip rhythm rather than inventing a second one.
--
-- Key decision, logged rather than assumed obvious: a community instance
-- is "confirmed" when EVERY member has responded to the same option --
-- the direct generalization of a Pair's existing "both people must agree"
-- rule to N people, not a new voting/quorum model. Worth revisiting if a
-- large community makes unanimous agreement impractical in practice.

-- ============================================================
-- Users -- mirrors Firebase Auth uid (text, not a serial id, since it
-- must match the string uid Firebase issues).
-- ============================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Firebase uid
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Pairs -- existing 1-on-1 relationship, unchanged concept from Firestore.
-- ============================================================
CREATE TABLE pairs (
  id TEXT PRIMARY KEY, -- mirrors the Firestore document id, not a new id space
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'declined', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pair_members (
  pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (pair_id, user_id)
);

-- ============================================================
-- Communities -- new: N members, not 2. Members self-label the community
-- and its recurring slot (e.g. "Diner du chabbat", "Priere du vendredi",
-- "Repas de famille du dimanche") -- deliberately no built-in category or
-- religion-specific field; the mechanic is generic, the label is theirs.
-- ============================================================
CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL, -- user-chosen display name, French UI, stored as-is
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE community_members (
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- ============================================================
-- Recurring slots -- the "when, every week" concept both Pair and
-- Community share. Exactly one of pair_id / community_id is set, never
-- both, never neither -- enforced below, not just assumed by convention.
-- Any member (of either owner type) may propose an edit to day/time/
-- location; that's an application-level permission check (every member
-- id is already resolvable via pair_members/community_members), not
-- something encoded as a separate column here.
-- ============================================================
CREATE TABLE recurring_slots (
  id TEXT PRIMARY KEY,
  pair_id TEXT REFERENCES pairs(id) ON DELETE CASCADE,
  community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
  agreed_day TEXT NOT NULL CHECK (agreed_day IN ('mon','tue','wed','thu','fri','sat','sun')),
  window_start TEXT NOT NULL, -- "HH:MM", Europe/Paris wall-clock -- see lib/timezone.ts's reasoning for why this is never stored as a bare UTC instant
  window_end TEXT NOT NULL,
  notify_days_before INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL REFERENCES users(id), -- who last proposed/edited this slot
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exactly_one_owner CHECK (
    (pair_id IS NOT NULL AND community_id IS NULL) OR
    (pair_id IS NULL AND community_id IS NOT NULL)
  )
);

-- ============================================================
-- Slot instances -- one per actual week a proposal goes out, generalizing
-- Firestore's Week/VenueOption shape. optionB is nullable, same as today
-- (a single-option proposal is the common case; two options is the
-- swap-comparison UI already in DashboardClient.tsx).
-- ============================================================
CREATE TABLE slot_instances (
  id TEXT PRIMARY KEY,
  recurring_slot_id TEXT NOT NULL REFERENCES recurring_slots(id) ON DELETE CASCADE,
  week_of DATE NOT NULL, -- Monday of that week, Europe/Paris calendar
  status TEXT NOT NULL CHECK (status IN ('proposed', 'confirmed', 'cancelled')),
  option_a_venue_name TEXT,
  option_a_venue_address TEXT,
  option_a_venue_type TEXT,
  option_b_venue_name TEXT,
  option_b_venue_address TEXT,
  option_b_venue_type TEXT,
  proposed_time TIMESTAMPTZ NOT NULL,
  confirmation_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_slot_id, week_of)
);

-- ============================================================
-- Responses -- generalizes Firestore's Week.responses map ({userId:
-- response}) into real rows. Works identically for a 2-row Pair instance
-- and an N-row Community instance -- this table, not a new voting system,
-- is what makes "reuse the existing confirm/swap/skip rhythm" true for
-- communities: confirmation is still just "every member responded yes to
-- the same option," now checked by counting rows instead of checking two
-- known keys.
-- ============================================================
CREATE TABLE slot_instance_responses (
  slot_instance_id TEXT NOT NULL REFERENCES slot_instances(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'A', 'B')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (slot_instance_id, user_id)
);

CREATE INDEX idx_recurring_slots_pair ON recurring_slots(pair_id) WHERE pair_id IS NOT NULL;
CREATE INDEX idx_recurring_slots_community ON recurring_slots(community_id) WHERE community_id IS NOT NULL;
CREATE INDEX idx_slot_instances_recurring_slot ON slot_instances(recurring_slot_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_pair_members_user ON pair_members(user_id);
