"""Generate Move rows for the research wedge — relationship actions, not listings."""

from __future__ import annotations

from core.models import Move, MoveType, OpportunityCategory


def _org_name(opportunity) -> str:
    if opportunity.organization:
        return opportunity.organization
    # Infer a short org-ish label from title
    title = opportunity.title or "the program team"
    return title.split("—")[0].split("-")[0].strip()[:80] or "the program team"


def generate_moves_for_profile(profile, matches: list) -> list:
    """
    For research matches above a ROI threshold, ensure intro + follow-up Moves exist.
    """
    created = []
    for match in matches:
        opp = match.opportunity if hasattr(match, "opportunity") else match.get("opportunity")
        score = match.roi_score if hasattr(match, "roi_score") else match.get("roi_score", 0)
        if not opp or opp.category != OpportunityCategory.RESEARCH:
            continue
        if score < 0.35:
            continue

        org = _org_name(opp)
        templates = [
            (
                MoveType.INTRO_MESSAGE,
                org,
                (
                    f"Hi — I'm exploring {opp.title}. Your work at {org} lines up with my "
                    f"interest in {(profile.interest_tags or ['research'])[0]}. "
                    f"Would you have 15 minutes for a short intro call?"
                ),
            ),
            (
                MoveType.NETWORKING_TARGET,
                org,
                (
                    f"Follow {org} program officers / alumni on LinkedIn and note one specific "
                    f"project from their last cohort before you apply to {opp.title}."
                ),
            ),
            (
                MoveType.FOLLOW_UP,
                org,
                (
                    f"After you submit {opp.title}, send a two-line thank-you to the contact "
                    f"at {org} referencing one detail from the brief — not a generic nudge."
                ),
            ),
        ]

        for move_type, target, text in templates:
            exists = Move.objects.filter(
                profile=profile,
                trigger_opportunity=opp,
                move_type=move_type,
            ).exists()
            if exists:
                continue
            move = Move.objects.create(
                profile=profile,
                trigger_opportunity=opp,
                move_type=move_type,
                target_person_or_org=target,
                suggested_action_text=text,
            )
            created.append(move)
    return created
