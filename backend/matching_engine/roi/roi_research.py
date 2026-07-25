"""Research / funding ROI — months of application effort vs years of funding value."""

from __future__ import annotations

from datetime import date


def score(opportunity, profile, overlap_count: int = 0) -> float:
    inputs = opportunity.roi_inputs or {}
    effort = float(inputs.get("effort_estimate", 0.6))
    value = float(inputs.get("value_estimate", 0.7))
    # High value for high effort is still good for fellowships; penalize low value/high effort
    base = value * (1.0 - 0.35 * effort) + 0.15 * min(overlap_count, 4)

    if opportunity.deadline:
        days = (opportunity.deadline - date.today()).days
        if 0 <= days <= 7:
            base += 0.12
        elif 0 <= days <= 21:
            base += 0.06

    if opportunity.verified or opportunity.status == "live":
        base += 0.08

    ambition = (profile.ambition_vector or {}).get("confidence_scores") or {}
    base += 0.1 * float(ambition.get("research", 0))

    return round(max(0.0, min(base, 1.0)), 4)
