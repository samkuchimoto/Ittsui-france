"""
LangGraph recommendation pipeline (Task 4.1).

This is the piece that used to be a single inline Groq call inside
Next.js's /api/weekly-propose. It moves here so it can run ahead of time
(during precompute) against a richer candidate pool, instead of blocking
a user-facing request.

Graph shape (conceptual — nodes below are stubs to fill in against the
real venues/embeddings tables):

    retrieve_candidates -> score_candidates -> pick_and_explain

  1. retrieve_candidates
     pgvector similarity search over `venues.ambiance_embedding`, seeded
     by an embedding of the pair's preference profile (venue types +
     dietary filters + free-text vibe notes, if any), pre-filtered by:
       - geographic proximity (PostGIS distance or a lat/lng bounding box
         around the pair's meetup point)
       - dietary tag overlap for cafe/restaurant types
       - excludes `last_venue_ids` (no repeats within N weeks)

  2. score_candidates
     re-ranks the shortlist using: past duo feedback (thumbs up/down on
     previous proposals for this pair, and aggregate ratings for the
     venue), and current weather context (an outdoor park pick is
     down-weighted on a forecast-rain Saturday).

  3. pick_and_explain
     the LLM step: given the top-K re-ranked candidates, pick one and
     write the one-line French confirmation text (this replaces the
     Groq prompt that used to live in weekly-propose/route.ts).

None of the three nodes below call a real embedding/LLM/weather API yet —
each raises NotImplementedError with a comment on what real call goes
there, so this stays honest about being a scaffold rather than a working
integration.
"""

from __future__ import annotations

from dataclasses import dataclass

import asyncpg


@dataclass
class RecommendationResult:
    venue_id: str
    venue_name: str
    venue_address: str
    confirmation_text: str


async def run_recommendation_graph(
    *,
    pair_id: str,
    venue_type_prefs: list[str],
    dietary_filters: list[str],
    last_venue_ids: list[str],
    lat: float | None,
    lng: float | None,
    pg_pool: asyncpg.Pool,
) -> RecommendationResult:
    candidates = await _retrieve_candidates(
        pair_id=pair_id,
        venue_type_prefs=venue_type_prefs,
        dietary_filters=dietary_filters,
        last_venue_ids=last_venue_ids,
        lat=lat,
        lng=lng,
        pg_pool=pg_pool,
    )
    ranked = await _score_candidates(pair_id=pair_id, candidates=candidates, pg_pool=pg_pool)
    return await _pick_and_explain(pair_id=pair_id, ranked=ranked)


async def _retrieve_candidates(
    *,
    pair_id: str,
    venue_type_prefs: list[str],
    dietary_filters: list[str],
    last_venue_ids: list[str],
    lat: float | None,
    lng: float | None,
    pg_pool: asyncpg.Pool,
) -> list[dict]:
    """
    Real implementation: embed the pair's preference profile (a sentence
    like "café calme, vegetarien, quartier Paris 6e"), then:

        select id, name, address, type
        from venues
        where type = any($1)
          and id != all($2)                       -- last_venue_ids
          and ST_DWithin(location, $3, $4)         -- geo proximity (PostGIS)
        order by ambiance_embedding <=> $5         -- pgvector cosine distance
        limit 12
    """
    raise NotImplementedError("wire up embedding call + pgvector query against the venues table")


async def _score_candidates(*, pair_id: str, candidates: list[dict], pg_pool: asyncpg.Pool) -> list[dict]:
    """
    Real implementation: pull this pair's feedback history
    (`select venue_id, rating from duo_feedback where pair_id = $1`),
    boost/penalize venues by past rating, and apply a weather adjustment
    for outdoor types (call a weather API keyed to the meetup date/window,
    down-weight `park`-type candidates on a rain forecast).
    """
    raise NotImplementedError("wire up feedback join + weather-adjusted re-ranking")


async def _pick_and_explain(*, pair_id: str, ranked: list[dict]) -> RecommendationResult:
    """
    Real implementation: same shape as the Groq call that used to live in
    weekly-propose/route.ts — one LLM call, top-K candidates in, a single
    venue_id + one-line French confirmation text out. Runs here now
    instead of in the request path, so a slow LLM call can't threaten the
    18:00 deadline.
    """
    raise NotImplementedError("wire up the ranking LLM call against `ranked`")
