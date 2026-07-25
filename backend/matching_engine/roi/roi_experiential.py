"""Experiential ROI — hours invested vs graduation/skill credit."""

from __future__ import annotations

from datetime import date


def score(opportunity, profile, overlap_count: int = 0) -> float:
    inputs = opportunity.roi_inputs or {}
    effort = float(inputs.get("effort_estimate", 0.35))
    value = float(inputs.get("value_estimate", 0.55))
    base = value * (1.0 - 0.4 * effort) + 0.1 * min(overlap_count, 4)

    readiness = profile.readiness_vector or {}
    course_load = str(readiness.get("course_load") or "").lower()
    if course_load in ("heavy", "high") and effort > 0.5:
        base -= 0.15

    if opportunity.deadline:
        days = (opportunity.deadline - date.today()).days
        if 0 <= days <= 14:
            base += 0.08

    ambition = (profile.ambition_vector or {}).get("confidence_scores") or {}
    base += 0.08 * float(ambition.get("experiential", 0))
    return round(max(0.0, min(base, 1.0)), 4)
