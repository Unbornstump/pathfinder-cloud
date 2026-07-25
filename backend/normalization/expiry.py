"""Expiry detection — deadline passed flips status to expired."""

from __future__ import annotations

from datetime import date

from django.utils import timezone

from core.models import Opportunity, OpportunityStatus


def expire_past_deadlines(today: date | None = None) -> int:
    today = today or date.today()
    qs = Opportunity.objects.filter(
        deadline__isnull=False,
        deadline__lt=today,
    ).exclude(status=OpportunityStatus.EXPIRED)
    count = qs.count()
    qs.update(status=OpportunityStatus.EXPIRED)
    return count


def touch_verified(opportunity: Opportunity) -> None:
    opportunity.last_verified_at = timezone.now()
    if opportunity.status != OpportunityStatus.EXPIRED:
        if opportunity.deadline and opportunity.deadline < date.today():
            opportunity.status = OpportunityStatus.EXPIRED
        elif opportunity.verified or opportunity.status == OpportunityStatus.LIVE:
            opportunity.status = OpportunityStatus.LIVE
    opportunity.save(update_fields=["last_verified_at", "status", "updated_at"])


def run_expiry_pass() -> dict:
    expired = expire_past_deadlines()
    # Re-verify live rows with future deadlines: stamp last_verified_at
    now = timezone.now()
    refreshed = Opportunity.objects.filter(
        status=OpportunityStatus.LIVE,
        deadline__gte=date.today(),
    ).update(last_verified_at=now)
    return {"expired": expired, "refreshed": refreshed}
