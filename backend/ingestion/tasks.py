"""Celery tasks for scheduled ingestion."""

from __future__ import annotations

from celery import shared_task


@shared_task(name="ingestion.tasks.ingest_sources")
def ingest_sources(only_ids=None):
    from ingestion.pipeline import run_ingest

    return run_ingest(only_ids=only_ids, normalize=True)
