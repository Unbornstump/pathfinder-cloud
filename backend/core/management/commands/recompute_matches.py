from django.core.management.base import BaseCommand

from core.models import UserProfile
from matching_engine.engine import recompute_matches_for_profile


class Command(BaseCommand):
    help = "Recompute Match rows (eligibility, ROI, why_summary) and research Moves"

    def add_arguments(self, parser):
        parser.add_argument("--username", help="Limit to one user")

    def handle(self, *args, **options):
        qs = UserProfile.objects.select_related("user").all()
        username = options.get("username")
        if username:
            qs = qs.filter(user__username=username)
        total_matches = 0
        for profile in qs:
            matches = recompute_matches_for_profile(profile)
            total_matches += len(matches)
            self.stdout.write(f"  {profile}: {len(matches)} matches")
        self.stdout.write(self.style.SUCCESS(f"Done. {total_matches} match rows across profiles."))
