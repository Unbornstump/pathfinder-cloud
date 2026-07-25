"""Stage 1 — binary eligibility filter."""

from __future__ import annotations

from datetime import date

from core.models import OpportunityStatus
from user_vector.hard_constraints import get_constraints


def passes_eligibility(opportunity, profile) -> bool:
    if opportunity.status == OpportunityStatus.EXPIRED:
        return False
    # Unverified can still show in this phase but live is preferred; allow both
    if opportunity.status not in (
        OpportunityStatus.LIVE,
        OpportunityStatus.UNVERIFIED,
    ):
        return False

    if opportunity.deadline and opportunity.deadline < date.today():
        return False

    rules = opportunity.eligibility_rules or {}
    constraints = get_constraints(profile)

    allowed_citizenship = [str(c).upper() for c in (rules.get("citizenship") or []) if c]
    user_citizenship = constraints.get("citizenship") or ""
    if allowed_citizenship and user_citizenship:
        if user_citizenship not in allowed_citizenship:
            return False

    required_locations = [str(l).lower() for l in (rules.get("location") or []) if l]
    user_loc = (constraints.get("location") or "").lower()
    if required_locations and user_loc:
        if not any(loc in user_loc or user_loc in loc for loc in required_locations):
            return False

    if rules.get("budget_required") and constraints.get("budget") in (0, "0", None, ""):
        # Only reject when user explicitly has zero budget recorded
        if "budget" in (profile.hard_constraints or {}):
            return False

    return True


def category_preference_ok(opportunity, profile) -> bool:
    """
    Soft preference: desired_types filters when set.
    Empty desired_types allows all categories (ambition can widen).
    """
    desired = {
        str(t).strip().lower()
        for t in (profile.desired_types or [])
        if str(t).strip()
    }
    if not desired:
        return True
    return opportunity.category.lower() in desired
