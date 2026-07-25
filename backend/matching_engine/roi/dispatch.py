"""Dispatch ROI by category — never one shared formula."""

from __future__ import annotations

from matching_engine.roi import roi_employment, roi_experiential, roi_research


def default_score(opportunity, profile, overlap_count: int = 0) -> float:
    inputs = opportunity.roi_inputs or {}
    effort = float(inputs.get("effort_estimate", 0.5))
    value = float(inputs.get("value_estimate", 0.5))
    return round(max(0.0, min(value * (1.0 - 0.4 * effort) + 0.08 * overlap_count, 1.0)), 4)


DISPATCH = {
    "research": roi_research.score,
    "employment": roi_employment.score,
    "experiential": roi_experiential.score,
}


def score_roi(opportunity, profile, overlap_count: int = 0) -> float:
    fn = DISPATCH.get(opportunity.category, default_score)
    return fn(opportunity, profile, overlap_count)
