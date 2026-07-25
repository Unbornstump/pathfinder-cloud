"""Persist raw ingest rows through category tagging + dedup."""

from __future__ import annotations

from datetime import date, datetime

from django.utils import timezone

from core.models import Opportunity, OpportunitySourceType, OpportunityStatus
from normalization.category_tagger import infer_category, infer_intent
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
    Returns (opportunity, action) where action is created|merged|updated.
    """
    category = infer_category(
        title=raw.get("title", ""),
        tags=raw.get("tags") or [],
        hint=raw.get("category", ""),
    )
    deadline = _parse_deadline(raw.get("deadline"))
    payload = {
        "title": raw.get("title", "").strip(),
        "description": raw.get("description") or "",
        "category": category,
        "intent": raw.get("intent") or infer_intent(category),
        "organization": raw.get("organization") or "",
        "tags": list(raw.get("tags") or []),
        "location": raw.get("location") or "",
        "requirements": raw.get("requirements") or "",
        "why_summary": raw.get("why_summary") or "",
        "deadline": deadline,
        "source_type": raw.get("source_type") or OpportunitySourceType.MANUAL,
        "source_id": (raw.get("source_id") or "").strip(),
        "eligibility_rules": raw.get("eligibility_rules") or {},
        "roi_inputs": raw.get("roi_inputs") or {"effort_estimate": 0.5, "value_estimate": 0.5},
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
