"""Orchestrate stages 1–3 and upsert Match rows."""

from __future__ import annotations

from core.models import Match, MatchState, Notification, Opportunity, SurfacedAs
from matching_engine.eligibility import category_preference_ok, passes_eligibility
from matching_engine.moves.move_generator import generate_moves_for_profile
from matching_engine.roi.dispatch import score_roi
from matching_engine.why_summary import generate_why_summary, normalize_tags, overlapping_tags


def tag_overlap_ok(opportunity, profile) -> bool:
    user_tags = normalize_tags(profile.interest_tags)
    opp_tags = normalize_tags(opportunity.tags)
    if not user_tags or not opp_tags:
        # Allow ambition-led discovery when tags incomplete but category preferred
        ambition = (profile.ambition_vector or {}).get("inferred_categories") or []
        if opportunity.category in ambition[:4]:
            return True
        if not user_tags:
            return False
        return False
    return bool(user_tags & opp_tags)


def recompute_matches_for_profile(profile) -> list[Match]:
    opportunities = Opportunity.objects.exclude(status="expired")
    results: list[Match] = []

    for opp in opportunities:
        eligible = passes_eligibility(opp, profile)
        if not eligible:
            continue
        if not category_preference_ok(opp, profile):
            # Still allow if ambition strongly signals this category
            confidence = ((profile.ambition_vector or {}).get("confidence_scores") or {}).get(
                opp.category, 0
            )
            if confidence < 0.4:
                continue
        if not tag_overlap_ok(opp, profile):
            continue

        overlap = overlapping_tags(profile, opp)
        roi = score_roi(opp, profile, overlap_count=len(overlap))
        why = generate_why_summary(opp, profile)

        match, created = Match.objects.get_or_create(
            profile=profile,
            opportunity=opp,
            defaults={
                "state": MatchState.SEEN,
                "eligibility_pass": True,
                "roi_score": roi,
                "why_summary": why,
                "surfaced_as": SurfacedAs.LISTING,
            },
        )
        if match.state == MatchState.DISMISSED:
            continue

        if not created:
            match.eligibility_pass = True
            match.roi_score = roi
            match.why_summary = why
            match.surfaced_as = SurfacedAs.LISTING
            match.save(
                update_fields=[
                    "eligibility_pass",
                    "roi_score",
                    "why_summary",
                    "surfaced_as",
                    "updated_at",
                ]
            )
        else:
            deadline_bit = ""
            if opp.deadline:
                deadline_bit = f" closes on {opp.deadline.isoformat()}"
            Notification.objects.create(
                profile=profile,
                opportunity=opp,
                message=f"New match: {opp.title}{deadline_bit}",
            )

        results.append(match)

    results.sort(key=lambda m: m.roi_score, reverse=True)
    generate_moves_for_profile(profile, results)
    return results


# Compat helpers used by views/serializers
def promote_match_state(current: str, new: str) -> str:
    rank = {
        MatchState.DISMISSED: 0,
        MatchState.SEEN: 1,
        MatchState.SAVED: 2,
        MatchState.APPLIED: 3,
    }
    if new == MatchState.DISMISSED:
        return MatchState.DISMISSED
    if rank.get(new, 0) >= rank.get(current, 0):
        return new
    return current


def opportunity_matches_profile(opportunity, profile) -> bool:
    if not passes_eligibility(opportunity, profile):
        return False
    if not category_preference_ok(opportunity, profile):
        confidence = ((profile.ambition_vector or {}).get("confidence_scores") or {}).get(
            opportunity.category, 0
        )
        if confidence < 0.4:
            return False
    return tag_overlap_ok(opportunity, profile)
