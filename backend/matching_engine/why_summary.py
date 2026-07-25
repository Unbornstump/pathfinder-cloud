"""Stage 3 — per-user why_summary grounded in profile situation."""

from __future__ import annotations


def normalize_tags(tags) -> set[str]:
    if not tags:
        return set()
    return {str(t).strip().lower() for t in tags if str(t).strip()}


def overlapping_tags(profile, opportunity) -> list[str]:
    user_tags = normalize_tags(profile.interest_tags)
    opp_tags = normalize_tags(opportunity.tags)
    overlap = user_tags & opp_tags
    ordered = []
    for tag in profile.interest_tags or []:
        key = str(tag).strip().lower()
        if key in overlap and str(tag).strip() not in ordered:
            ordered.append(str(tag).strip())
    return ordered


def generate_why_summary(opportunity, profile) -> str:
    overlap = overlapping_tags(profile, opportunity)
    location = (profile.location or "").strip()
    name_bit = (profile.name or "").split(" ")[0] if profile.name else "you"

    if opportunity.why_summary and overlap:
        tags_bit = ", ".join(overlap[:3])
        return f"{opportunity.why_summary} Fits {name_bit} on {tags_bit}."

    if opportunity.why_summary:
        if location:
            return f"{opportunity.why_summary} Matched with your base in {location}."
        return opportunity.why_summary

    if overlap:
        tags_bit = ", ".join(overlap[:3])
        return (
            f"Because your profile signals {tags_bit}, this "
            f"{opportunity.category.replace('_', ' ')} opportunity is in range."
        )

    ambition = (profile.ambition_vector or {}).get("inferred_categories") or []
    if opportunity.category in ambition[:3]:
        return (
            f"Your recent activity leans toward "
            f"{opportunity.category.replace('_', ' ')} — this is worth a closer look."
        )

    return f"Aligned with your interests in {opportunity.category.replace('_', ' ')}."
