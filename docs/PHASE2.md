# Pathfinder / Alo alo — Opportunity Compass status

This document tracks the eight-category personal intelligence architecture.
Phase "compass" ships schema-wide, config-driven ingestion (CSV + live multi-source
crawlers), three-stage matching, research-wedge Moves, and tiered landing honesty.

## Done in this phase

| Item | Status |
|---|---|
| Eight `category` values on one `Opportunity` table | Done |
| User vectors: `hard_constraints`, `readiness_vector`, `ambition_vector` | Done (JSON; short onboarding unchanged) |
| `SignalLog` + continuous ambition updates on save/apply/dismiss | Done |
| `Match` with eligibility / ROI / per-user `why_summary` / `surfaced_as` | Done |
| `Move` as its own object (not an Opportunity flag) | Done |
| Ingestion packages + `sources.yaml` + CSV adapter | Done |
| Live adapters: Opportunity Desk RSS, university feeds/pages, Greenhouse/Lever ATS, Crossref | Done |
| Celery Beat schedule (combined ingest every 6h) + Redis via docker-compose | Done |
| `IngestionRun` + `/api/ingestion/status/` per-source freshness | Done |
| Dedup + expiry (`normalize_opportunities`) | Done for ingested + seeded rows |
| Per-category ROI files (research, employment, experiential) | Done |
| Surface API: `/api/matches/`, `/api/moves/`, dismiss | Done |
| Landing tiers + `/moves` + `/how-it-works` | Done |

## Product wedge

| Stage | Focus |
|---|---|
| **Now** | Research & innovation + funding/fellowships (Tier 2) + employment & experiential (Tier 1) |
| **Next** | Tighten eligibility with real constraints; HTTP re-verification of closed listings |
| **Then** | Professional dev, social impact, entrepreneurship, cultural exchange (Tier 3 → Tier 2) |

## Layer map

```
ingestion/ → normalization/ → matching_engine/ (+ user_vector/) → surface/ → React
```

Management commands:

- `ingest_from_config` — run enabled YAML sources (+ normalize)
- `normalize_opportunities` — dedup + expiry
- `recompute_matches` — stages 1–3 + research Moves
- `process_signals` — refresh ambition_vector
- `seed_opportunities` — demo data

### Live ingest + Celery

```bash
# from repo root
docker compose up -d redis
cd backend
pip install -r requirements.txt
# optional but required for Crossref:
# set CROSSREF_MAILTO=you@example.com in backend/.env

py manage.py migrate
py manage.py ingest_from_config

# scheduled (from backend/, Redis must be up)
celery -A config worker -l info
celery -A config beat -l info
```

Enabled live sources (see `ingestion/config/sources.yaml`):

- `opportunity_desk_scrape` — RSS
- `university_pages_scrape` — RSS + HTML link harvest
- `ats_boards_scrape` — Greenhouse / Lever public JSON
- `crossref_api` — Works API (needs `CROSSREF_MAILTO`)
- `seed_csv_research` — CSV baseline

## Trust blockers (still required before marketing as a full aggregator)

1. Broader dedup across more source wording variants
2. Continuous re-verification beyond deadline expiry (HTTP 404 / closed notices)
3. Deadline display always in the user’s local timezone (API already emits `deadline_local` + `deadline_tz`)

## Out of scope until wedge is trusted

- Real Eventbrite / LinkedIn / Reddit adapters
- `/for-employers`, `/for-universities`
- Flutter client

## Naming

Use identically in code and copy: `Opportunity`, `Move`, `category`, `ambition_vector`,
`hard_constraints`, `why_summary`.
