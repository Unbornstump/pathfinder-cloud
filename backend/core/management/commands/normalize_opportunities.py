from django.core.management.base import BaseCommand

from normalization.dedup import dedupe_queryset
from normalization.expiry import run_expiry_pass


class Command(BaseCommand):
    help = "Run deduplication and expiry checks on Opportunity rows"

    def handle(self, *args, **options):
        kept, removed = dedupe_queryset()
        expiry = run_expiry_pass()
        self.stdout.write(
            self.style.SUCCESS(
                f"Normalize: kept={kept}, removed_dupes={removed}, "
                f"expired={expiry['expired']}, refreshed={expiry['refreshed']}."
            )
        )
