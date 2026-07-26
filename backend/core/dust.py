"""Dust — structured profile proposals from free-text (assistive, not autonomous).

Without an LLM key, uses intent + keyword rules so casual phrasing works offline.
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
    ("fully funded", "fully funded"),
    ("fully-funded", "fully funded"),
    ("no fee", "fully funded"),
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
    ("fieldwork", "fieldwork"),
    ("finance", "finance"),
    ("audit", "audit"),
    ("legal", "legal"),
    ("health", "health"),
]

# Longer needles first for type detection
TYPE_KEYWORDS: list[tuple[str, str]] = [
    ("research fellowship", OpportunityType.RESEARCH),
    ("fellowship", OpportunityType.RESEARCH),
    ("research grant", OpportunityType.RESEARCH),
    ("research", OpportunityType.RESEARCH),
    ("grant", OpportunityType.RESEARCH),
    ("innovation", OpportunityType.RESEARCH),
    ("scholarship", OpportunityType.ACADEMIC),
    ("short course", OpportunityType.ACADEMIC),
    ("phd", OpportunityType.ACADEMIC),
    ("degree", OpportunityType.ACADEMIC),
    ("course", OpportunityType.ACADEMIC),
    ("employment", OpportunityType.EMPLOYMENT),
    (r"\bfull[- ]?time\b", OpportunityType.EMPLOYMENT),
    (r"\bpart[- ]?time\b", OpportunityType.EMPLOYMENT),
    (r"\bjobs?\b", OpportunityType.EMPLOYMENT),
    (r"\bwork\b", OpportunityType.EMPLOYMENT),
    ("career", OpportunityType.EMPLOYMENT),
    ("hiring", OpportunityType.EMPLOYMENT),
    (r"\bgigs?\b", OpportunityType.EMPLOYMENT),
    ("internship", OpportunityType.EXPERIENTIAL),
    ("intern", OpportunityType.EXPERIENTIAL),
    ("attachment", OpportunityType.EXPERIENTIAL),
    ("apprentice", OpportunityType.EXPERIENTIAL),
    ("placement", OpportunityType.EXPERIENTIAL),
    ("conference", OpportunityType.PROFESSIONAL_DEV),
    ("mentorship", OpportunityType.PROFESSIONAL_DEV),
    ("mentor", OpportunityType.PROFESSIONAL_DEV),
    ("webinar", OpportunityType.PROFESSIONAL_DEV),
    ("volunteer", OpportunityType.SOCIAL_IMPACT),
    ("civic", OpportunityType.SOCIAL_IMPACT),
    ("nonprofit", OpportunityType.SOCIAL_IMPACT),
    ("advocacy", OpportunityType.SOCIAL_IMPACT),
    ("startup", OpportunityType.ENTREPRENEURSHIP),
    ("accelerator", OpportunityType.ENTREPRENEURSHIP),
    ("pitch", OpportunityType.ENTREPRENEURSHIP),
    ("residency", OpportunityType.CULTURAL_EXCHANGE),
    ("exchange", OpportunityType.CULTURAL_EXCHANGE),
    ("creative", OpportunityType.CULTURAL_EXCHANGE),
]

# Casual compound intents — run before simple keyword scan
INTENT_RULES: list[tuple[str, dict]] = [
    (
        r"\bfree\s+(?:jobs?|work|employment|gigs?)\b",
        {"types": [OpportunityType.EMPLOYMENT], "tags": ["fully funded"]},
    ),
    (
        r"\b(?:unpaid|no[- ]pay)\s+(?:jobs?|work|internship|attachment)\b",
        {"types": [OpportunityType.EXPERIENTIAL], "tags": ["unpaid"]},
    ),
    (
        r"\b(?:paid|paying)\s+(?:jobs?|internship|attachment)\b",
        {"types": [OpportunityType.EMPLOYMENT], "tags": ["paid"]},
    ),
    (
        r"\b(?:want|need|looking for|get me|find me|hook me up with)\s+(?:a\s+|an\s+|some\s+)?(?:free\s+)?(?:jobs?|work)\b",
        {"types": [OpportunityType.EMPLOYMENT], "tags": []},
    ),
    (
        r"\b(?:want|need|looking for)\s+(?:a\s+|an\s+)?(?:jobs?|work)\b",
        {"types": [OpportunityType.EMPLOYMENT], "tags": []},
    ),
    (
        r"\b(?:want|need|looking for)\s+(?:a\s+|an\s+)?(?:internship|intern)\b",
        {"types": [OpportunityType.EXPERIENTIAL], "tags": ["internship"]},
    ),
    (
        r"\b(?:want|need|looking for)\s+(?:a\s+|an\s+)?attachment\b",
        {"types": [OpportunityType.EXPERIENTIAL], "tags": ["attachment"]},
    ),
    (
        r"\b(?:want|need|looking for)\s+(?:a\s+|an\s+)?(?:grant|fellowship|funding)\b",
        {"types": [OpportunityType.RESEARCH], "tags": ["funding"]},
    ),
    (
        r"\b(?:want|need|looking for)\s+(?:a\s+|an\s+)?(?:scholarship|course)\b",
        {"types": [OpportunityType.ACADEMIC], "tags": ["scholarship"]},
    ),
    (
        r"\b(?:want|need|looking for)\s+(?:a\s+|an\s+)?(?:mentor|mentorship)\b",
        {"types": [OpportunityType.PROFESSIONAL_DEV], "tags": ["mentorship"]},
    ),
    (
        r"\bremote\s+(?:jobs?|work|internship)\b",
        {"types": [OpportunityType.EMPLOYMENT], "tags": ["remote work"]},
    ),
]

EDU_PATTERNS: list[tuple[str, str]] = [
    (r"\bph\.?d\b|\bdoctoral\b", "phd"),
    (r"\bmaster'?s\b|\bmsc\b|\bma\b", "master's"),
    (r"\bbachelor'?s\b|\bbsc\b|\bba\b|\bundergraduate\b|\bbcom\b", "bachelor's"),
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
        r"\b(?:in|from|based in|living in)\s+([a-z][a-z\s-]{1,40}?)(?:\s*[,.]|\s+(?:looking|want|seeking|interested|for|and)\b|$)",
        lower,
    )
    if m:
        loc = m.group(1).strip(" .,!")
        # avoid swallowing opportunity words as "locations"
        if loc in {"a", "an", "the", "job", "work", "grant", "fellowship"}:
            return None
        if len(loc) >= 2:
            return loc.title()
    return None


def _extract_education(lower: str) -> str | None:
    for pattern, label in EDU_PATTERNS:
        if re.search(pattern, lower):
            return label
    return None


def _needle_hits(needle: str, lower: str) -> bool:
    if needle.startswith(r"\b") or "\\" in needle:
        return bool(re.search(needle, lower, flags=re.IGNORECASE))
    return needle in lower


def _extract_tags(lower: str, existing: set[str]) -> list[str]:
    add_tags: list[str] = []
    seen = set(existing)
    for needle, tag in TAG_KEYWORDS:
        if _needle_hits(needle, lower) and tag.lower() not in seen:
            add_tags.append(tag)
            seen.add(tag.lower())
    for m in re.finditer(
        r"(?:into|interested in|looking for|studying|want|need)\s+(?:a\s+|an\s+|some\s+)?([a-z0-9][\w\s-]{1,40})",
        lower,
    ):
        phrase = m.group(1).strip(" .,!")
        phrase = re.sub(
            r"\s+(fellowships?|grants?|jobs?|work|internships?|attachments?|opportunities?)$",
            "",
            phrase,
        ).strip()
        # drop trailing place clauses: "attachment in nairobi" → "attachment"
        phrase = re.split(r"\s+in\s+", phrase, maxsplit=1)[0].strip()
        if phrase in {"a", "an", "the", "free", "paid", "remote"}:
            continue
        if len(phrase) >= 3 and phrase.lower() not in seen:
            add_tags.append(phrase)
            seen.add(phrase.lower())
    # "free job/work" → fully funded preference
    if re.search(r"\bfree\b", lower) and re.search(r"\b(jobs?|work|employment)\b", lower):
        if "fully funded" not in seen:
            add_tags.append("fully funded")
            seen.add("fully funded")
    return add_tags


def _extract_types(lower: str, existing: set[str]) -> list[str]:
    enable: list[str] = []
    seen = set(existing)
    for needle, opp_type in TYPE_KEYWORDS:
        if _needle_hits(needle, lower) and opp_type not in seen:
            enable.append(opp_type)
            seen.add(opp_type)
    return enable


def _apply_intent_rules(lower: str, existing_types: set[str], existing_tags: set[str]):
    enable: list[str] = []
    tags: list[str] = []
    seen_t = set(existing_types)
    seen_g = set(existing_tags)
    matched_any = False
    for pattern, payload in INTENT_RULES:
        if re.search(pattern, lower, flags=re.IGNORECASE):
            matched_any = True
            for t in payload.get("types", []):
                if t not in seen_t:
                    enable.append(t)
                    seen_t.add(t)
            for g in payload.get("tags", []):
                if g.lower() not in seen_g:
                    tags.append(g)
                    seen_g.add(g.lower())
    return enable, tags, matched_any


def _understood_types(lower: str) -> list[str]:
    """Types mentioned even if already on the profile."""
    found: list[str] = []
    seen: set[str] = set()
    for needle, opp_type in TYPE_KEYWORDS:
        if _needle_hits(needle, lower) and opp_type not in seen:
            found.append(opp_type)
            seen.add(opp_type)
    for pattern, payload in INTENT_RULES:
        if re.search(pattern, lower, flags=re.IGNORECASE):
            for t in payload.get("types", []):
                if t not in seen:
                    found.append(t)
                    seen.add(t)
    return found


def _snippet(text: str, n: int = 48) -> str:
    t = " ".join((text or "").split())
    if len(t) <= n:
        return t
    return t[: n - 1] + "…"


def _helpful_fallback(message: str, lower: str, understood: list[str]) -> str:
    quoted = _snippet(message) or "that"
    if understood:
        labels = [TYPE_LABELS.get(t, t) for t in understood]
        return (
            f"I caught “{quoted}” as pointing at {', '.join(labels)} — "
            "those are already on your trail. Tell me what to add "
            "(a tag like “fully funded”, a location, or another type) and I’ll propose it."
        )
    if re.search(r"\b(want|need|looking|find|get)\b", lower):
        return (
            f"I heard “{quoted}.” Name the kind of listing — "
            "a job, attachment, grant, scholarship, or mentorship — "
            "and I’ll propose a concrete trail change."
        )
    if len(lower.split()) <= 3:
        return (
            f"“{quoted}” is a bit thin for a trail change. "
            "Try something like “I want a job in Nairobi” or “add funding / fellowships.”"
        )
    return (
        f"I couldn’t lock a profile change from “{quoted}” yet. "
        "Say what to turn on (job, grant, attachment…) or a tag to add, and I’ll propose it — "
        "nothing saves until you confirm."
    )


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
    intent_types, intent_tags, intent_hit = _apply_intent_rules(
        lower, existing_types, existing_tags
    )
    add_tags = _extract_tags(lower, existing_tags)
    enable_types = _extract_types(lower, existing_types)

    # merge intent extras
    for t in intent_types:
        if t not in enable_types:
            enable_types.append(t)
    for g in intent_tags:
        if g.lower() not in {x.lower() for x in add_tags}:
            add_tags.append(g)

    sparse = _profile_is_sparse(profile)
    mode = "build" if sparse else "edit"
    understood = _understood_types(lower)

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
                "reply": _helpful_fallback(text, lower, understood),
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

    # Incremental edit — nothing new to write
    if not add_tags and not enable_types and not location and not education:
        return {
            "reply": _helpful_fallback(text, lower, understood),
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
    profile_patch: dict = {}
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

    # Soft constraint note for "free job" style intents
    note = ""
    if intent_hit and any("fully funded" in t.lower() for t in add_tags):
        note = " I’ll prioritize fully-funded / no-fee listings where we can."

    reply = (
        "Here's what I'd change — "
        + "; ".join(parts)
        + "."
        + note
        + " Confirm before I apply anything — nothing is saved until you do."
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
