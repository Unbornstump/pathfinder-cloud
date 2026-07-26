"""Build match feed payloads for the surface API."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from matching_engine.engine import recompute_matches_for_profile
from matching_engine.why_summary import overlapping_tags


def deadline_local_iso(opportunity) -> str | None:
    if not opportunity.deadline:
        return None
    tz_name = opportunity.deadline_tz or "Africa/Nairobi"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    # End of day in source timezone
    dt = datetime(
        opportunity.deadline.year,
        opportunity.deadline.month,
        opportunity.deadline.day,
        23,
        59,
        59,
        tzinfo=tz,
    )
    return dt.isoformat()


def serialize_match(match, profile, interest_counts: dict | None = None) -> dict:
    opp = match.opportunity
    interest_counts = interest_counts or {}
    return {
        "id": opp.id,
        "match_id": match.id,
        "title": opp.title,
        "description": opp.description,
        "category": opp.category,
        "intent": opp.intent,
        "tags": opp.tags,
        "location": opp.location,
        "organization": opp.organization,
        "requirements": opp.requirements,
        "why_summary": match.why_summary or opp.why_summary,
        "deadline": opp.deadline.isoformat() if opp.deadline else None,
        "deadline_local": deadline_local_iso(opp),
        "deadline_tz": opp.deadline_tz,
        "source_type": opp.source_type,
        "status": opp.status,
        "verified": opp.verified or opp.status == "live",
        "created_at": opp.created_at.isoformat() if opp.created_at else None,
        "overlapping_tags": overlapping_tags(profile, opp),
        "match_state": match.state,
        "eligibility_pass": match.eligibility_pass,
        "roi_score": match.roi_score,
        "surfaced_as": match.surfaced_as,
        "interest_count": interest_counts.get(opp.id, 0),
    }


def build_match_feed(profile) -> list[dict]:
    from django.db.models import Count

    from core.models import Match

    matches = recompute_matches_for_profile(profile)
    opp_ids = [m.opportunity_id for m in matches]
    interest_counts = dict(
        Match.objects.filter(opportunity_id__in=opp_ids)
        .exclude(profile=profile)
        .values("opportunity")
        .annotate(c=Count("id"))
        .values_list("opportunity", "c")
    )
    return [serialize_match(m, profile, interest_counts) for m in matches]


def serialize_listing(opp, *, badge: str = "trending", interest_count: int = 0) -> dict:
    """Public listing card shape for trending / ambient feeds."""
    return {
        "id": opp.id,
        "title": opp.title,
        "description": opp.description,
        "category": opp.category,
        "intent": opp.intent,
        "tags": opp.tags or [],
        "location": opp.location,
        "organization": opp.organization,
        "deadline": opp.deadline.isoformat() if opp.deadline else None,
        "deadline_local": deadline_local_iso(opp),
        "source_type": opp.source_type,
        "verified": opp.verified or opp.status == "live",
        "updated_at": opp.updated_at.isoformat() if opp.updated_at else None,
        "interest_count": interest_count,
        "badge": badge,
        "meta": _listing_meta(opp),
    }


def _listing_meta(opp) -> str:
    bits = []
    if opp.deadline:
        bits.append(f"Closes {opp.deadline.strftime('%b %d')}")
    if opp.organization:
        bits.append(opp.organization)
    return " · ".join(bits)


def build_trending_feed(profile, limit: int = 8) -> list[dict]:
    """Live listings not already matched to this user — ambient 'Trending'."""
    from django.db.models import Count

    from core.models import Match, Opportunity, OpportunityStatus

    matched_ids = set(
        Match.objects.filter(profile=profile)
        .exclude(state="dismissed")
        .values_list("opportunity_id", flat=True)
    )
    qs = (
        Opportunity.objects.filter(status__in=[OpportunityStatus.LIVE, OpportunityStatus.UNVERIFIED])
        .exclude(id__in=matched_ids)
        .order_by("-updated_at", "-created_at")[: limit * 3]
    )
    interest_counts = dict(
        Match.objects.filter(opportunity__in=qs)
        .exclude(profile=profile)
        .values("opportunity")
        .annotate(c=Count("id"))
        .values_list("opportunity", "c")
    )
    desired = {str(t).lower() for t in (profile.desired_types or []) if t}
    ranked = sorted(
        qs,
        key=lambda o: (
            1 if o.category in desired else 0,
            interest_counts.get(o.id, 0),
            o.updated_at.timestamp() if o.updated_at else 0,
        ),
        reverse=True,
    )[:limit]
    return [
        serialize_listing(
            o,
            badge="trending",
            interest_count=interest_counts.get(o.id, 0),
        )
        for o in ranked
    ]


def ingestion_status() -> dict:
    from core.models import Opportunity

    latest = (
        Opportunity.objects.exclude(status="expired")
        .order_by("-updated_at")
        .values_list("updated_at", flat=True)
        .first()
    )
    count = Opportunity.objects.exclude(status="expired").count()
    return {
        "last_scraped_at": latest.isoformat() if latest else None,
        "live_count": count,
    }


def serialize_move(move) -> dict:
    return {
        "id": move.id,
        "move_type": move.move_type,
        "target_person_or_org": move.target_person_or_org,
        "suggested_action_text": move.suggested_action_text,
        "trigger_opportunity_id": move.trigger_opportunity_id,
        "trigger_opportunity_title": (
            move.trigger_opportunity.title if move.trigger_opportunity_id else None
        ),
        "created_at": move.created_at.isoformat() if move.created_at else None,
    }
