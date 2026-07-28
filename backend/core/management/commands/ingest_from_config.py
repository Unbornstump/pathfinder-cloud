from django.core.management.base import BaseCommand

from ingestion.pipeline import run_ingest


class Command(BaseCommand):
    help = "Ingest opportunities from enabled sources in ingestion/config/sources.yaml"

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            nargs="*",
            help="Optional source ids to run (forces run even if disabled)",
        )
        parser.add_argument(
            "--no-normalize",
            action="store_true",
            help="Skip dedup/expiry pass after ingest",
        )

    def handle(self, *args, **options):
        only = options.get("only")
        summary = run_ingest(only_ids=only, normalize=not options.get("no_normalize"))
        self.stdout.write(
            self.style.SUCCESS(
                f"Ingest complete: {summary['created']} created, "
                f"{summary['merged']} merged across {len(summary['sources'])} sources."
            )
        )
        for src in summary["sources"]:
            mark = "ok" if src["ok"] else "FAIL"
            self.stdout.write(
                f"  [{mark}] {src['source_id']}: {src['rows_fetched']} rows"
                + (f" — {src['error']}" if src.get("error") else "")
            )
        if summary.get("normalize"):
            n = summary["normalize"]
            self.stdout.write(
                f"Normalize: kept={n['kept']}, removed_dupes={n['removed_dupes']}, "
                f"expired={n['expired']}, refreshed={n['refreshed']}."
            )
