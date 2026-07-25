"""Employment ROI — resume tweak effort vs salary/stability value."""

from __future__ import annotations

from datetime import date


def score(opportunity, profile, overlap_count: int = 0) -> float:
    inputs = opportunity.roi_inputs or {}
    effort = float(inputs.get("effort_estimate", 0.3))
    value = float(inputs.get("value_estimate", 0.65))
    # Jobs: lower effort is better relative to value
    base = value * (1.0 - 0.5 * effort) + 0.12 * min(overlap_count, 5)

    if opportunity.deadline:
        days = (opportunity.deadline - date.today()).days
        if 0 <= days <= 5:
            base += 0.1

    ambition = (profile.ambition_vector or {}).get("confidence_scores") or {}
    base += 0.08 * float(ambition.get("employment", 0))
    return round(max(0.0, min(base, 1.0)), 4)
