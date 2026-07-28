"""Celery app for Pathfinder ingest workers."""

from __future__ import annotations

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("pathfinder")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Combined ingest every 6 hours — adapters self-limit via max_items
app.conf.beat_schedule = {
    "ingest-all-sources-every-6h": {
        "task": "ingestion.tasks.ingest_sources",
        "schedule": crontab(minute=15, hour="*/6"),
    },
}
