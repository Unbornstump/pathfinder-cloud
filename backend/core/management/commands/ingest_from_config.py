from django.core.management.base import BaseCommand

from ingestion.runner import run_enabled_sources
from normalization.upsert import upsert_raw


class Command(BaseCommand):
    help = "Ingest opportunities from enabled sources in ingestion/config/sources.yaml"

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            nargs="*",
            help="Optional source ids to run (forces run even if disabled)",
        )

    def handle(self, *args, **options):
        only = options.get("only")
        rows = run_enabled_sources(only_ids=only)
        created = merged = 0
        for raw in rows:
            _, action = upsert_raw(raw)
            if action == "created":
                created += 1
            else:
                merged += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Ingest complete: {len(rows)} rows -> {created} created, {merged} merged."
            )
        )
