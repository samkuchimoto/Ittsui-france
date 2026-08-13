"""
Ittsui RAG Intelligence Service
================================
Decoupled FastAPI microservice that picks each pair's weekly venue and
writes a ready-to-serve proposal to Postgres + Redis *before* Next.js
needs it, so the read path Next.js hits stays sub-10ms.

This is a conceptual architecture / reference scaffold (Task 4.1), not a
finished production service. See rag-service/README.md for what's real
vs. stubbed, and for the deployment story: this runs as its OWN service
(Fly.io / Render / Cloud Run — not a Vercel function, since it needs a
long-lived Postgres connection pool and a scheduler), with its OWN
Postgres+pgvector instance. It does not share Firestore with the Next.js
app — venues, embeddings and feedback live here.

SCOPE NOTE: the brief names this "Friday recommendations" because most
pairs land on Fri/Sat/Sun. The scheduler is written generically — it
precomputes for whichever `agreed_day` is coming up next, one hour ahead
of Next.js's daily read — so it isn't hardcoded to only run on Fridays.
That generalization is a deliberate deviation worth flagging rather than
silently baking in a Friday-only assumption that breaks for a pair whose
ritual is on a Tuesday.

Endpoints
---------
GET  /health
GET  /proposals/{pair_id}?week_of=YYYY-MM-DD   <- what Next.js's primary
                                                    route calls. Redis-first,
                                                    Postgres on cache miss.
POST /internal/precompute?for_day=fri          <- called by the scheduler
                                                    (or manually, or by a
                                                    cron platform) one hour
                                                    before that day's
                                                    proposal window opens.
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta
from typing import Literal

import asyncpg
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from langgraph_pipeline import run_recommendation_graph

DATABASE_URL = os.environ["DATABASE_URL"]  # postgres://... (pgvector extension enabled)
REDIS_URL = os.environ["REDIS_URL"]
CACHE_TTL_SECONDS = 60 * 60 * 24 * 3  # 3 days — a proposal is only ever needed same-week

Day = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

app = FastAPI(title="Ittsui RAG Intelligence Service")

_pg_pool: asyncpg.Pool | None = None
_redis: redis.Redis | None = None


@app.on_event("startup")
async def startup() -> None:
    global _pg_pool, _redis
    _pg_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    _redis = redis.from_url(REDIS_URL, decode_responses=True)


@app.on_event("shutdown")
async def shutdown() -> None:
    if _pg_pool:
        await _pg_pool.close()
    if _redis:
        await _redis.aclose()


class Proposal(BaseModel):
    pair_id: str
    week_of: str  # ISO date, Monday of that week
    venue_id: str
    venue_name: str
    venue_address: str
    confirmation_text: str
    generated_at: str


def cache_key(pair_id: str, week_of: str) -> str:
    return f"proposal:{pair_id}:{week_of}"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/proposals/{pair_id}", response_model=Proposal)
async def get_proposal(pair_id: str, week_of: str = Query(..., description="ISO date, Monday of the target week")):
    """
    Primary read path for Next.js. Redis-first; falls back to Postgres on
    a cache miss (e.g. Redis evicted it, or this is being called slightly
    ahead of the precompute job). Raises 404 if nothing has been computed
    yet — Next.js's fallback rule engine handles that case, this service
    does not compute on-demand in the read path (that would defeat the
    whole point of precomputing).
    """
    assert _redis is not None and _pg_pool is not None

    key = cache_key(pair_id, week_of)
    cached = await _redis.get(key)
    if cached:
        return Proposal(**json.loads(cached))

    async with _pg_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            select pair_id, week_of, venue_id, venue_name, venue_address,
                   confirmation_text, generated_at
            from proposals
            where pair_id = $1 and week_of = $2
            """,
            pair_id,
            week_of,
        )

    if row is None:
        raise HTTPException(status_code=404, detail="no precomputed proposal for this pair/week")

    proposal = Proposal(
        pair_id=row["pair_id"],
        week_of=str(row["week_of"]),
        venue_id=row["venue_id"],
        venue_name=row["venue_name"],
        venue_address=row["venue_address"],
        confirmation_text=row["confirmation_text"],
        generated_at=row["generated_at"].isoformat(),
    )
    # Warm the cache for the next read (this Redis miss was probably a cold
    # start or an eviction, not the common case).
    await _redis.set(key, proposal.model_dump_json(), ex=CACHE_TTL_SECONDS)
    return proposal


@app.post("/internal/precompute")
async def precompute(for_day: Day = Query(..., description="agreedDay value to precompute proposals for")):
    """
    Batch job. Intended trigger: a scheduled task (Cloud Scheduler / Render
    cron / APScheduler running in-process — see README) firing one hour
    before Next.js's daily `/api/weekly-propose` cron reads for that day.
    Idempotent: re-running for a pair/week that's already computed just
    overwrites with a fresh pick, it does not error.
    """
    assert _pg_pool is not None and _redis is not None

    week_of = _monday_of_this_week().isoformat()

    async with _pg_pool.acquire() as conn:
        pairs = await conn.fetch(
            """
            select id, venue_type_prefs, dietary_filters, last_venue_ids, meetup_lat, meetup_lng
            from pairs_cache
            where agreed_day = $1 and status = 'active'
            """,
            for_day,
        )

    computed = 0
    failed: list[str] = []

    for pair in pairs:
        try:
            result = await run_recommendation_graph(
                pair_id=pair["id"],
                venue_type_prefs=pair["venue_type_prefs"],
                dietary_filters=pair["dietary_filters"],
                last_venue_ids=pair["last_venue_ids"],
                lat=pair["meetup_lat"],
                lng=pair["meetup_lng"],
                pg_pool=_pg_pool,
            )
        except Exception as exc:  # noqa: BLE001 — a single pair's failure must not sink the batch
            failed.append(pair["id"])
            continue

        proposal = Proposal(
            pair_id=pair["id"],
            week_of=week_of,
            venue_id=result.venue_id,
            venue_name=result.venue_name,
            venue_address=result.venue_address,
            confirmation_text=result.confirmation_text,
            generated_at=datetime.utcnow().isoformat(),
        )

        async with _pg_pool.acquire() as conn:
            await conn.execute(
                """
                insert into proposals (pair_id, week_of, venue_id, venue_name, venue_address, confirmation_text, generated_at)
                values ($1, $2, $3, $4, $5, $6, $7)
                on conflict (pair_id, week_of) do update
                set venue_id = excluded.venue_id,
                    venue_name = excluded.venue_name,
                    venue_address = excluded.venue_address,
                    confirmation_text = excluded.confirmation_text,
                    generated_at = excluded.generated_at
                """,
                proposal.pair_id,
                proposal.week_of,
                proposal.venue_id,
                proposal.venue_name,
                proposal.venue_address,
                proposal.confirmation_text,
                datetime.utcnow(),
            )
        await _redis.set(cache_key(proposal.pair_id, proposal.week_of), proposal.model_dump_json(), ex=CACHE_TTL_SECONDS)
        computed += 1

    return {"for_day": for_day, "week_of": week_of, "computed": computed, "failed": failed}


def _monday_of_this_week() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())
