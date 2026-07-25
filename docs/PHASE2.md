# Pathfinder / Alo alo — Opportunity Compass status

This document tracks the eight-category personal intelligence architecture.
Phase "compass" (current) ships schema-wide, config-driven ingestion (CSV path live),
three-stage matching, research-wedge Moves, and tiered landing honesty.

## Done in this phase

| Item | Status |
|---|---|
| Eight `category` values on one `Opportunity` table | Done |
| User vectors: `hard_constraints`, `readiness_vector`, `ambition_vector` | Done (JSON; short onboarding unchanged) |
| `SignalLog` + continuous ambition updates on save/apply/dismiss | Done |
| `Match` with eligibility / ROI / per-user `why_summary` / `surfaced_as` | Done |
| `Move` as its own object (not an Opportunity flag) | Done |
| Ingestion packages + `sources.yaml` + CSV adapter | Done (API/scrape stubs) |
| Dedup + expiry (`normalize_opportunities`) | Done for ingested + seeded rows |
| Per-category ROI files (research, employment, experiential) | Done |
| Surface API: `/api/matches/`, `/api/moves/`, dismiss | Done |
| Landing tiers + `/moves` + `/how-it-works` | Done |

## Product wedge

| Stage | Focus |
|---|---|
| **Now** | Research & innovation + funding/fellowships (Tier 2) + employment & experiential (Tier 1) |
| **Next** | Live scrapers for 1–2 fellowship aggregators; tighten eligibility with real constraints |
| **Then** | Professional dev, social impact, entrepreneurship, cultural exchange (Tier 3 → Tier 2) |

## Layer map

```
ingestion/ → normalization/ → matching_engine/ (+ user_vector/) → surface/ → React
```

Management commands:

- `ingest_from_config` — run enabled YAML sources
- `normalize_opportunities` — dedup + expiry
- `recompute_matches` — stages 1–3 + research Moves
- `process_signals` — refresh ambition_vector
- `seed_opportunities` — demo data

## Trust blockers (still required before marketing as a full aggregator)

1. Broader dedup across more source wording variants
2. Continuous re-verification beyond deadline expiry (HTTP 404 / closed notices)
3. Deadline display always in the user’s local timezone (API already emits `deadline_local` + `deadline_tz`)

## Out of scope until wedge is trusted

- Real Eventbrite / LinkedIn / Reddit adapters
- Celery beat (commands are Celery-ready wrappers later)
- `/for-employers`, `/for-universities`
- Flutter client

## Naming

Use identically in code and copy: `Opportunity`, `Move`, `category`, `ambition_vector`,
`hard_constraints`, `why_summary`.
