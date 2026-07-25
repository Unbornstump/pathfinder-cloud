"""Map free-text tags / titles onto OpportunityCategory + IntentBucket."""

from __future__ import annotations

from core.models import CATEGORY_DEFAULT_INTENT, IntentBucket, OpportunityCategory

TAG_HINTS = {
    OpportunityCategory.RESEARCH: {
        "fellowship",
        "grant",
        "research",
        "innovation",
        "phd",
        "funding",
    },
    OpportunityCategory.EMPLOYMENT: {
        "job",
        "career",
        "hiring",
        "engineer",
        "developer",
        "remote",
    },
    OpportunityCategory.EXPERIENTIAL: {
        "internship",
        "intern",
        "attachment",
        "apprentice",
        "shadowing",
    },
    OpportunityCategory.ACADEMIC: {
        "scholarship",
        "degree",
        "course",
        "study",
        "tuition",
    },
    OpportunityCategory.PROFESSIONAL_DEV: {
        "conference",
        "webinar",
        "mentorship",
        "networking",
        "summit",
    },
    OpportunityCategory.SOCIAL_IMPACT: {
        "volunteer",
        "civic",
        "advocacy",
        "community",
        "ngo",
    },
    OpportunityCategory.ENTREPRENEURSHIP: {
        "startup",
        "accelerator",
        "pitch",
        "venture",
        "founder",
    },
    OpportunityCategory.CULTURAL_EXCHANGE: {
        "residency",
        "exchange",
        "travel",
        "creative",
        "arts",
    },
}


def infer_category(title: str = "", tags: list | None = None, hint: str = "") -> str:
    if hint and hint in OpportunityCategory.values:
        return hint
    blob = " ".join([title or "", " ".join(tags or [])]).lower()
    best = OpportunityCategory.RESEARCH
    best_score = 0
    for cat, words in TAG_HINTS.items():
        score = sum(1 for w in words if w in blob)
        if score > best_score:
            best_score = score
            best = cat
    return best


def infer_intent(category: str) -> str:
    return CATEGORY_DEFAULT_INTENT.get(category, IntentBucket.ADVANCEMENT)
