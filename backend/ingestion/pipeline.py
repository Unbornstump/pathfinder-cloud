"""Shared ingest pipeline used by management command and Celery."""

from __future__ import annotations

import logging
import traceback

from django.utils import timezone

from ingestion.runner import iter_enabled_sources
from normalization.dedup import dedupe_queryset
from normalization.expiry import run_expiry_pass
from normalization.upsert import upsert_raw

logger = logging.getLogger(__name__)


def run_ingest(only_ids: list[str] | None = None, *, normalize: bool = True) -> dict:
    """
    Run enabled (or selected) sources, upsert rows, log IngestionRun per source.
    Returns summary dict.
    """
    from core.models import IngestionRun

    created = merged = 0
    source_summaries = []

    for entry, rows in iter_enabled_sources(only_ids=only_ids):
        sid = entry.get("id") or entry.get("adapter") or "unknown"
        started = timezone.now()
        ok = True
        err = ""
        try:
            for raw in rows:
                _, action = upsert_raw(raw)
                if action == "created":
                    created += 1
                else:
                    merged += 1
        except Exception as exc:  # noqa: BLE001
            ok = False
            err = f"{exc}\n{traceback.format_exc()[-800:]}"
            logger.exception("Ingest failed for source %s", sid)

        finished = timezone.now()
        IngestionRun.objects.create(
            source_id=sid,
            started_at=started,
            finished_at=finished,
            ok=ok,
            rows_fetched=len(rows) if ok else 0,
            error=err[:2000],
        )
        source_summaries.append(
            {
                "source_id": sid,
                "ok": ok,
                "rows_fetched": len(rows) if ok else 0,
                "error": err[:200] if err else "",
            }
        )

    normalize_result = None
    if normalize:
        kept, removed = dedupe_queryset()
        expiry = run_expiry_pass()
        normalize_result = {
            "kept": kept,
            "removed_dupes": removed,
            "expired": expiry.get("expired", 0),
            "refreshed": expiry.get("refreshed", 0),
        }

    return {
        "created": created,
        "merged": merged,
        "sources": source_summaries,
        "normalize": normalize_result,
    }
