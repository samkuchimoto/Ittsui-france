-- Ittsui RAG service schema. Separate Postgres instance from the app's
-- Firestore — this database exists only for this microservice.

create extension if not exists vector;
create extension if not exists postgis; -- for ST_DWithin geo filtering

-- Read-optimized mirror of the pair fields this service actually needs.
-- Kept in sync via a small webhook/export from the Next.js app on pair
-- create/update — NOT a live join against Firestore (different database
-- engines). Exact sync mechanism is a follow-up decision, flagged in
-- README.md rather than guessed at here.
create table if not exists pairs_cache (
  id text primary key,
  agreed_day text not null,
  status text not null,
  venue_type_prefs text[] not null default '{}',
  dietary_filters text[] not null default '{}',
  last_venue_ids text[] not null default '{}',
  meetup_lat double precision,
  meetup_lng double precision,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pairs_cache_agreed_day on pairs_cache (agreed_day) where status = 'active';

create table if not exists venues (
  id text primary key,
  name text not null,
  address text not null,
  type text not null, -- cafe | restaurant | home | park | museum
  dietary_tags text[] not null default '{}',
  location geography(Point, 4326),
  ambiance_embedding vector(1536), -- one embedding per venue, computed offline from photos/description
  updated_at timestamptz not null default now()
);
create index if not exists idx_venues_type on venues (type);
create index if not exists idx_venues_embedding on venues using ivfflat (ambiance_embedding vector_cosine_ops) with (lists = 100);

create table if not exists duo_feedback (
  id bigserial primary key,
  pair_id text not null references pairs_cache (id),
  venue_id text not null references venues (id),
  rating smallint, -- -1 (skipped/disliked) | 1 (confirmed and enjoyed), nullable while unrated
  created_at timestamptz not null default now()
);
create index if not exists idx_duo_feedback_pair on duo_feedback (pair_id);

-- The precomputed output this service serves. One row per pair per week.
create table if not exists proposals (
  pair_id text not null,
  week_of date not null,
  venue_id text not null,
  venue_name text not null,
  venue_address text not null,
  confirmation_text text not null,
  generated_at timestamptz not null default now(),
  primary key (pair_id, week_of)
);
