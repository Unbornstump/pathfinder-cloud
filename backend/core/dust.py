"""Dust — structured profile proposals from free-text (assistive, not autonomous).

Without an LLM key, uses keyword rules so the product works offline.
Env: SCOUT_LLM_API_KEY (legacy) or DUST_LLM_API_KEY for a future model swap.
"""

from __future__ import annotations

import re

from django.conf import settings

from .models import OpportunityType

TAG_KEYWORDS: list[tuple[str, str]] = [
    ("research fellowship", "fellowship"),
    ("fellowship", "fellowship"),
    ("scholarship", "scholarship"),
    ("grant", "grant"),
    ("funding", "funding"),
    ("biotech", "biotech"),
    ("biotechnology", "biotech"),
    ("biology", "biology"),
    ("public health", "public health"),
    ("climate", "climate"),
    ("policy", "policy"),
    ("software engineering", "software engineering"),
    ("software", "software engineering"),
    ("backend", "backend"),
    ("frontend", "frontend"),
    ("python", "python"),
    ("react", "react"),
    ("data science", "data science"),
    ("machine learning", "machine learning"),
    ("ai ", "artificial intelligence"),
    ("remote", "remote work"),
    ("startup", "startup"),
    ("entrepreneur", "entrepreneurship"),
    ("accelerator", "accelerator"),
    ("internship", "internship"),
    ("attachment", "attachment"),
    ("volunteer", "volunteering"),
    ("civic", "civic"),
    ("mentorship", "mentorship"),
    ("conference", "conference"),
    ("residency", "residency"),
    ("exchange", "exchange"),
    ("phd", "phd"),
    ("masters", "master's"),
    ("mba", "mba"),
]

TYPE_KEYWORDS: list[tuple[str, str]] = [
    ("fellowship", OpportunityType.RESEARCH),
    ("research", OpportunityType.RESEARCH),
    ("grant", OpportunityType.RESEARCH),
    ("innovation", OpportunityType.RESEARCH),
    ("scholarship", OpportunityType.ACADEMIC),
    ("phd", OpportunityType.ACADEMIC),
    ("degree", OpportunityType.ACADEMIC),
    ("course", OpportunityType.ACADEMIC),
    ("job", OpportunityType.EMPLOYMENT),
    ("career", OpportunityType.EMPLOYMENT),
    ("hiring", OpportunityType.EMPLOYMENT),
    ("internship", OpportunityType.EXPERIENTIAL),
    ("attachment", OpportunityType.EXPERIENTIAL),
    ("apprentice", OpportunityType.EXPERIENTIAL),
    ("conference", OpportunityType.PROFESSIONAL_DEV),
    ("mentorship", OpportunityType.PROFESSIONAL_DEV),
    ("webinar", OpportunityType.PROFESSIONAL_DEV),
    ("volunteer", OpportunityType.SOCIAL_IMPACT),
    ("civic", OpportunityType.SOCIAL_IMPACT),
    ("nonprofit", OpportunityType.SOCIAL_IMPACT),
    ("startup", OpportunityType.ENTREPRENEURSHIP),
    ("accelerator", OpportunityType.ENTREPRENEURSHIP),
    ("pitch", OpportunityType.ENTREPRENEURSHIP),
    ("residency", OpportunityType.CULTURAL_EXCHANGE),
    ("exchange", OpportunityType.CULTURAL_EXCHANGE),
    ("creative", OpportunityType.CULTURAL_EXCHANGE),
]

EDU_PATTERNS: list[tuple[str, str]] = [
    (r"\bph\.?d\b|\bdoctoral\b", "phd"),
    (r"\bmaster'?s\b|\bmsc\b|\bma\b", "master's"),
    (r"\bbachelor'?s\b|\bbsc\b|\bba\b|\bundergraduate\b", "bachelor's"),
    (r"\bgraduate\b", "graduate"),
    (r"\bdiploma\b", "diploma"),
    (r"\bhigh school\b|\bsecondary\b", "secondary"),
]

TYPE_LABELS = {c.value: c.label for c in OpportunityType}


def _profile_is_sparse(profile) -> bool:
    tags = profile.interest_tags or []
    types = profile.desired_types or []
    return not (
        (profile.location or "").strip()
        or (profile.education_level or "").strip()
        or tags
        or types
        or profile.onboarding_complete
    )


def _extract_location(lower: str) -> str | None:
    m = re.search(
        r"\b(?:in|from|based in|living in)\s+([a-z][a-z\s-]{1,40}?)(?:\s*[,.]|\s+(?:looking|want|seeking|interested|for)\b|$)",
        lower,
    )
    if m:
        loc = m.group(1).strip(" .,!")
        if len(loc) >= 2:
            return loc.title()
    return None


def _extract_education(lower: str) -> str | None:
    for pattern, label in EDU_PATTERNS:
        if re.search(pattern, lower):
            return label
    return None


def _extract_tags(lower: str, existing: set[str]) -> list[str]:
    add_tags: list[str] = []
    seen = set(existing)
    for needle, tag in TAG_KEYWORDS:
        if needle in lower and tag.lower() not in seen:
            add_tags.append(tag)
            seen.add(tag.lower())
    for m in re.finditer(
        r"(?:into|interested in|looking for|studying)\s+([a-z0-9][\w\s-]{1,40})",
        lower,
    ):
        phrase = m.group(1).strip(" .,!")
        # trim trailing opportunity words
        phrase = re.sub(
            r"\s+(fellowships?|grants?|jobs?|internships?|opportunities?)$",
            "",
            phrase,
        ).strip()
        if len(phrase) >= 3 and phrase not in seen:
            add_tags.append(phrase)
            seen.add(phrase)
    return add_tags


def _extract_types(lower: str, existing: set[str]) -> list[str]:
    enable: list[str] = []
    seen = set(existing)
    for needle, opp_type in TYPE_KEYWORDS:
        if needle in lower and opp_type not in seen:
            enable.append(opp_type)
            seen.add(opp_type)
    return enable


def suggest_from_message(message: str, profile) -> dict:
    text = (message or "").strip()
    lower = text.lower()
    llm_configured = bool(
        getattr(settings, "DUST_LLM_API_KEY", "")
        or getattr(settings, "SCOUT_LLM_API_KEY", "")
    )

    existing_tags = {str(t).strip().lower() for t in (profile.interest_tags or [])}
    existing_types = {str(t).strip().lower() for t in (profile.desired_types or [])}

    location = _extract_location(lower)
    education = _extract_education(lower)
    add_tags = _extract_tags(lower, existing_tags)
    enable_types = _extract_types(lower, existing_types)

    sparse = _profile_is_sparse(profile)
    mode = "build" if sparse else "edit"

    if mode == "build":
        profile_patch = {
            "location": location or "",
            "education_level": education or "",
            "interest_tags": add_tags,
            "desired_types": enable_types,
        }
        has_any = any(
            [
                profile_patch["location"],
                profile_patch["education_level"],
                profile_patch["interest_tags"],
                profile_patch["desired_types"],
            ]
        )
        if not has_any:
            return {
                "reply": (
                    "Tell me a bit more — for example: "
                    "“I'm a biology graduate in Meru, looking for research fellowships.”"
                ),
                "mode": mode,
                "suggestions": {
                    "add_tags": [],
                    "enable_types": [],
                    "disable_types": [],
                    "profile_patch": None,
                },
                "engine": "rules",
                "llm_configured": llm_configured,
            }

        parts = []
        if profile_patch["location"]:
            parts.append(f"location: {profile_patch['location']}")
        if profile_patch["education_level"]:
            parts.append(f"education: {profile_patch['education_level']}")
        if profile_patch["interest_tags"]:
            parts.append("tags: " + ", ".join(profile_patch["interest_tags"]))
        if profile_patch["desired_types"]:
            labels = [TYPE_LABELS.get(t, t) for t in profile_patch["desired_types"]]
            parts.append("types: " + ", ".join(labels))

        reply = (
            "Here's a full profile I'd start you with — "
            + "; ".join(parts)
            + ". Nothing is saved until you confirm."
        )
        return {
            "reply": reply,
            "mode": mode,
            "suggestions": {
                "add_tags": add_tags,
                "enable_types": enable_types,
                "disable_types": [],
                "profile_patch": profile_patch,
            },
            "engine": "rules",
            "llm_configured": llm_configured,
        }

    # Incremental edit
    if not add_tags and not enable_types and not location and not education:
        return {
            "reply": (
                "I couldn't pull out a concrete change yet. "
                "Try “add biotech” or “I want research fellowships.”"
            ),
            "mode": mode,
            "suggestions": {
                "add_tags": [],
                "enable_types": [],
                "disable_types": [],
                "profile_patch": None,
            },
            "engine": "rules",
            "llm_configured": llm_configured,
        }

    parts = []
    profile_patch = {}
    if location and location.lower() != (profile.location or "").lower():
        profile_patch["location"] = location
        parts.append(f"set location to {location}")
    if education and education.lower() != (profile.education_level or "").lower():
        profile_patch["education_level"] = education
        parts.append(f"set education to {education}")
    if add_tags:
        parts.append("add tags: " + ", ".join(add_tags))
    if enable_types:
        labels = [TYPE_LABELS.get(t, t) for t in enable_types]
        parts.append("turn on: " + ", ".join(labels))

    reply = (
        "Here's what I'd change — "
        + "; ".join(parts)
        + ". Confirm before I apply anything."
    )
    return {
        "reply": reply,
        "mode": mode,
        "suggestions": {
            "add_tags": add_tags,
            "enable_types": enable_types,
            "disable_types": [],
            "profile_patch": profile_patch or None,
        },
        "engine": "rules",
        "llm_configured": llm_configured,
    }
