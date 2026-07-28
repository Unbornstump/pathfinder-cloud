"""Persist raw ingest rows through category tagging + dedup."""

from __future__ import annotations

from datetime import date, datetime

from django.utils import timezone

from core.models import Opportunity, OpportunitySourceType, OpportunityStatus
from normalization.category_tagger import infer_category, infer_intent
from normalization.classify import classify_raw_listing
from normalization.dedup import find_duplicate, merge_into_canonical


def _parse_deadline(value):
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def upsert_raw(raw: dict) -> tuple[Opportunity, str]:
    """
    Insert or merge one raw opportunity dict.
    Runs rules-based classification first, then dedup.
    Returns (opportunity, action) where action is created|merged|updated.
    """
    classified = classify_raw_listing(raw)
    category = infer_category(
        title=classified.get("title", ""),
        tags=classified.get("tags") or [],
        hint=classified.get("category", ""),
    )
    deadline = _parse_deadline(classified.get("deadline"))
    payload = {
        "title": classified.get("title", "").strip(),
        "description": classified.get("description") or "",
        "category": category,
        "intent": classified.get("intent") or infer_intent(category),
        "organization": classified.get("organization") or "",
        "tags": list(classified.get("tags") or []),
        "location": classified.get("location") or "",
        "requirements": classified.get("requirements") or "",
        "why_summary": classified.get("why_summary") or "",
        "deadline": deadline,
        "source_type": classified.get("source_type") or OpportunitySourceType.MANUAL,
        "source_id": (classified.get("source_id") or "").strip(),
        "source_url": (classified.get("source_url") or "").strip()[:500],
        "eligibility_rules": classified.get("eligibility_rules") or {},
        "roi_inputs": classified.get("roi_inputs")
        or {"effort_estimate": 0.5, "value_estimate": 0.5},
        "status": raw.get("status") or OpportunityStatus.UNVERIFIED,
    }
    if payload["status"] == OpportunityStatus.LIVE:
        payload["verified"] = True
        payload["last_verified_at"] = timezone.now()

    dup = find_duplicate(payload)
    if dup:
        merge_into_canonical(dup, payload)
        return dup, "merged"

    opp = Opportunity.objects.create(**payload)
    return opp, "created"
