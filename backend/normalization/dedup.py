"""Deduplicate opportunities by source_id and fuzzy title+org+deadline."""

from __future__ import annotations

import re

from django.db.models import Q

from core.models import Opportunity


def _norm_text(value: str) -> str:
    value = (value or "").lower().strip()
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    # Drop common mirror suffixes
    for noise in ("opportunity desk mirror", "mirror", "repost"):
        value = value.replace(noise, "").strip()
    return value


def fuzzy_key(title: str, organization: str, deadline) -> str:
    d = deadline.isoformat() if hasattr(deadline, "isoformat") else str(deadline or "")
    return f"{_norm_text(title)}|{_norm_text(organization)}|{d}"


def find_duplicate(raw: dict, exclude_id: int | None = None) -> Opportunity | None:
    source_id = (raw.get("source_id") or "").strip()
    qs = Opportunity.objects.all()
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    if source_id:
        hit = qs.filter(source_id=source_id).first()
        if hit:
            return hit

    title = raw.get("title") or ""
    org = raw.get("organization") or ""
    deadline = raw.get("deadline")
    key = fuzzy_key(title, org, deadline)
    if not key.startswith("|"):
        for opp in qs.filter(Q(title__icontains=_norm_text(title)[:40]) | Q(organization__iexact=org)):
            if fuzzy_key(opp.title, opp.organization, opp.deadline) == key:
                return opp
            # Near-match: same org + same deadline + high title overlap
            if org and opp.organization and _norm_text(org) == _norm_text(opp.organization):
                if str(opp.deadline or "") == str(deadline or ""):
                    a = set(_norm_text(title).split())
                    b = set(_norm_text(opp.title).split())
                    if a and b and len(a & b) / max(len(a | b), 1) >= 0.6:
                        return opp
    return None


def merge_into_canonical(canonical: Opportunity, raw: dict) -> Opportunity:
    """Keep canonical; enrich blank fields from raw."""
    changed = False
    for field in ("description", "organization", "location", "requirements", "why_summary", "source_url"):
        if not getattr(canonical, field, None) and raw.get(field):
            setattr(canonical, field, raw[field])
            changed = True
    if raw.get("tags"):
        existing = list(canonical.tags or [])
        for t in raw["tags"]:
            if t not in existing:
                existing.append(t)
        if existing != canonical.tags:
            canonical.tags = existing
            changed = True
    if changed:
        canonical.save()
    return canonical


def dedupe_queryset() -> tuple[int, int]:
    """Collapse existing DB duplicates. Returns (kept, removed)."""
    seen_source: dict[str, Opportunity] = {}
    seen_fuzzy: dict[str, Opportunity] = {}
    removed = 0
    kept = 0
    for opp in Opportunity.objects.order_by("id"):
        kept += 1
        if opp.source_id:
            if opp.source_id in seen_source:
                merge_into_canonical(
                    seen_source[opp.source_id],
                    {
                        "description": opp.description,
                        "organization": opp.organization,
                        "location": opp.location,
                        "requirements": opp.requirements,
                        "why_summary": opp.why_summary,
                        "tags": opp.tags,
                    },
                )
                opp.delete()
                removed += 1
                kept -= 1
                continue
            seen_source[opp.source_id] = opp

        key = fuzzy_key(opp.title, opp.organization, opp.deadline)
        if key in seen_fuzzy and seen_fuzzy[key].pk != opp.pk:
            merge_into_canonical(
                seen_fuzzy[key],
                {
                    "description": opp.description,
                    "organization": opp.organization,
                    "location": opp.location,
                    "requirements": opp.requirements,
                    "why_summary": opp.why_summary,
                    "tags": opp.tags,
                },
            )
            opp.delete()
            removed += 1
            kept -= 1
            continue
        seen_fuzzy[key] = opp
    return kept, removed
