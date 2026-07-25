from django.core.management.base import BaseCommand

from core.models import UserProfile
from user_vector.signal_processor import recompute_ambition_vector


class Command(BaseCommand):
    help = "Refresh ambition_vector from SignalLog for all (or one) profiles"

    def add_arguments(self, parser):
        parser.add_argument("--username", help="Limit to one user")

    def handle(self, *args, **options):
        qs = UserProfile.objects.select_related("user").all()
        username = options.get("username")
        if username:
            qs = qs.filter(user__username=username)
        for profile in qs:
            vector = recompute_ambition_vector(profile)
            cats = vector.get("inferred_categories") or []
            self.stdout.write(f"  {profile}: {cats[:5]}")
        self.stdout.write(self.style.SUCCESS("Ambition vectors updated."))
