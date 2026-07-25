"""Thin re-exports — prefer matching_engine for new code."""

from matching_engine.engine import (
    opportunity_matches_profile,
    promote_match_state,
    recompute_matches_for_profile,
)
from matching_engine.why_summary import normalize_tags, overlapping_tags

__all__ = [
    "normalize_tags",
    "overlapping_tags",
    "opportunity_matches_profile",
    "promote_match_state",
    "recompute_matches_for_profile",
]
