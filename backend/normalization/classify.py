"""Rules-based listing classifier — structured fields without an LLM key.

When DUST_LLM_API_KEY / SCOUT_LLM_API_KEY is set, callers may swap in a model;
this module keeps offline demos and CSV ingest productive.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from core.models import OpportunityCategory

CATEGORY_HINTS: list[tuple[str, str]] = [
    (r"\bfellowship\b|\bresearch grant\b|\bproposal\b", OpportunityCategory.RESEARCH),
    (r"\bscholarship\b|\bshort course\b|\btuition\b", OpportunityCategory.ACADEMIC),
    (r"\battachment\b|\binternship\b|\bintern\b", OpportunityCategory.EXPERIENTIAL),
    (r"\bmentor\b|\bconference\b|\bwebinar\b", OpportunityCategory.PROFESSIONAL_DEV),
    (r"\bvolunteer\b|\bcivic\b|\badvocacy\b", OpportunityCategory.SOCIAL_IMPACT),
    (r"\baccelerator\b|\bpitch\b|\bstartup\b", OpportunityCategory.ENTREPRENEURSHIP),
    (r"\bresidency\b|\bexchange\b|\bartist\b", OpportunityCategory.CULTURAL_EXCHANGE),
    (r"\bjob\b|\bhiring\b|\bassociate\b|\bemployment\b|\bcareer\b", OpportunityCategory.EMPLOYMENT),
]

FUNDING_HINTS: list[tuple[str, str]] = [
    (r"\bfully[- ]funded\b|\bno fee\b|\bfree\b", "fully funded"),
    (r"\bpartial(ly)?[- ]funded\b|\bstipend\b", "partial"),
    (r"\bproposal required\b|\bwrite a proposal\b", "requires proposal"),
    (r"\bunpaid\b|\bunfunded\b", "unfunded"),
]


def classify_raw_listing(raw: dict) -> dict:
    """
    Normalize a raw ingested dict into Opportunity-shaped fields.
    Expected raw keys: title, description, organization, location, url, source, source_id, deadline?
    """
    title = (raw.get("title") or "").strip()
    body = f"{title} {raw.get('description') or ''} {raw.get('requirements') or ''}".lower()

    category = raw.get("category")
    if not category:
        category = OpportunityCategory.EMPLOYMENT
        for pattern, cat in CATEGORY_HINTS:
            if re.search(pattern, body):
                category = cat
                break

    funding = None
    for pattern, label in FUNDING_HINTS:
        if re.search(pattern, body):
            funding = label
            break

    tags = list(raw.get("tags") or [])
    if funding and funding not in tags:
        tags.append(funding)
    for word in ("fellowship", "grant", "internship", "attachment", "scholarship", "remote"):
        if word in body and word not in {t.lower() for t in tags}:
            tags.append(word)

    deadline = raw.get("deadline")
    if isinstance(deadline, str):
        try:
            deadline = date.fromisoformat(deadline[:10])
        except ValueError:
            deadline = date.today() + timedelta(days=30)
    if deadline is None:
        deadline = date.today() + timedelta(days=30)

    return {
        "title": title or "Untitled listing",
        "description": (raw.get("description") or "").strip() or title,
        "organization": (raw.get("organization") or raw.get("source") or "").strip(),
        "location": (raw.get("location") or "").strip() or "Unspecified",
        "requirements": (raw.get("requirements") or "").strip(),
        "category": category,
        "tags": tags,
        "deadline": deadline,
        "source_type": raw.get("source_type") or "scrape",
        "source_id": raw.get("source_id") or f"{raw.get('source', 'ext')}:{hash(title) & 0xFFFF:x}",
        "eligibility_rules": raw.get("eligibility_rules")
        or {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": raw.get("roi_inputs")
        or {"effort_estimate": 0.4, "value_estimate": 0.55},
        "why_summary": raw.get("why_summary")
        or f"Classified as {category} from {raw.get('source') or 'external source'}.",
        "verified": bool(raw.get("verified", False)),
        "funding_status": funding,
    }
