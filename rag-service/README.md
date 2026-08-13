# Ittsui RAG Intelligence Service

Conceptual architecture for Task 4.1 — a decoupled FastAPI microservice
that precomputes each pair's weekly venue proposal ahead of time, so the
Next.js app's read is a cache hit instead of a live pick.

## What's real here vs. what's a stub

**Real / runnable shape:**
- FastAPI app structure, both endpoints (`GET /proposals/{pair_id}`,
  `POST /internal/precompute`), the Redis-then-Postgres read path, the
  upsert-on-precompute write path, the pgvector/PostGIS schema.

**Stubbed, deliberately (see `langgraph_pipeline.py` docstrings for the
exact call to wire up in each):**
- `_retrieve_candidates` — the pgvector similarity query + embedding call
- `_score_candidates` — the feedback-history + weather-adjustment re-rank
- `_pick_and_explain` — the LLM call that picks one venue and writes the
  French confirmation line (this is where the Groq call that used to live
  in `weekly-propose/route.ts` moves to)

This is intentional: wiring those three against your actual embeddings
provider, weather API, and LLM choice is a real decision that shouldn't
be guessed at in a scaffold. The interfaces and where they fit in the
pipeline are the deliverable here.

## Open decision: how `pairs_cache` and `venues` get populated

This service does **not** read Firestore directly (different database
engine, and coupling a Python service to Firestore Admin SDK credentials
is exactly the kind of coupling this decoupling is meant to avoid). Two
honest options, not decided for you:

1. **Export/webhook**: Next.js's `/api/invite-partner` and
   `/api/activate-pending-pair` routes POST a small payload to this
   service on pair create/update, keeping `pairs_cache` in sync.
2. **Scheduled sync job**: a small script (`sync_pairs.py`, not yet
   written) run on a cron, pulling active pairs from Firestore via the
   Admin SDK and upserting into `pairs_cache`.

Given the "decoupled" framing in the brief, (1) is the more consistent
choice, but it means touching the existing `/api/invite-partner` and
`/api/activate-pending-pair` routes to add the webhook call — which
wasn't in scope for this pass, since the brief's guardrails only
authorized touching `app/page.tsx` and `app/setup/page.tsx` on the
frontend. Flagging this now rather than silently wiring it in.

`venues` and its `ambiance_embedding` column need a one-time backfill
from whatever venue source you're using (the brief doesn't specify one —
the existing Next.js app reads a Firestore `venues` collection with no
embeddings; that data would need to be exported and embedded once to
seed this table).

## Deployment

Not a Vercel function — this needs a long-lived Postgres connection pool
and (for the scheduler) a persistent process, so it belongs on Fly.io,
Render, or Cloud Run with a min-instance ≥ 1. Suggested shape:

```
uvicorn main:app --host 0.0.0.0 --port 8000
```

Scheduling `/internal/precompute`: either an external cron platform
(Render Cron Job / Cloud Scheduler) hitting the endpoint with
`for_day=<whatever's due next>` about an hour before Next.js's own daily
`/api/weekly-propose` cron fires, or an in-process APScheduler job if you
want it self-contained. Not wired up here — pick one when you deploy.

## Env vars

- `DATABASE_URL` — Postgres connection string (pgvector + PostGIS enabled)
- `REDIS_URL` — Redis connection string
- (once `_pick_and_explain` is filled in) whatever LLM provider key you choose
