from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import (
    CATEGORY_DEFAULT_INTENT,
    IntentBucket,
    Opportunity,
    OpportunityCategory,
    OpportunitySourceType,
    OpportunityStatus,
)


# Wedge first: research & innovation / funding & fellowships, then one of each other category.
SEED = [
    {
        "title": "Africa Research Fellowship 2026",
        "description": "Twelve-month fellowship for early-career researchers in public health or climate.",
        "category": OpportunityCategory.RESEARCH,
        "organization": "Africa Research Network",
        "tags": ["fellowship", "research", "public health", "climate", "funding"],
        "location": "Nairobi · hybrid",
        "requirements": "Master's or equivalent; citizenship of an African country.",
        "why_summary": "Funded research time plus a peer network across the continent.",
        "deadline": date.today() + timedelta(days=4),
        "verified": True,
        "eligibility_rules": {
            "citizenship": ["KE", "NG", "GH", "ZA", "UG", "TZ", "RW", "ET"],
            "location": [],
            "budget_required": False,
        },
        "roi_inputs": {"effort_estimate": 0.7, "value_estimate": 0.9},
        "source_id": "seed:africa-research-fellowship-2026",
    },
    {
        "title": "Young innovators grant — seed round",
        "description": "Up to $10k for prototypes that solve a local civic or education problem.",
        "category": OpportunityCategory.RESEARCH,
        "organization": "Young Innovators Fund",
        "tags": ["grant", "innovation", "funding", "civic tech"],
        "location": "Sub-Saharan Africa",
        "requirements": "Prototype or clear MVP; under age 35.",
        "why_summary": "Non-dilutive capital when you need runway more than investors.",
        "deadline": date.today() + timedelta(days=12),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": ["Sub-Saharan Africa"], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.5, "value_estimate": 0.75},
        "source_id": "seed:young-innovators-grant",
    },
    {
        "title": "Policy research internship (paid)",
        "description": "Support literature reviews and briefing notes for a think-tank.",
        "category": OpportunityCategory.RESEARCH,
        "organization": "East Africa Policy Lab",
        "tags": ["research", "policy", "internship", "writing"],
        "location": "Remote-friendly",
        "requirements": "Strong writing sample; interest in public policy.",
        "why_summary": "Builds a research CV while testing policy as a career path.",
        "deadline": date.today() + timedelta(days=9),
        "verified": False,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.35, "value_estimate": 0.55},
        "source_id": "seed:policy-research-internship",
    },
    {
        "title": "STEM PhD scholarship — diaspora track",
        "description": "Full tuition and stipend for doctoral study in engineering or CS.",
        "category": OpportunityCategory.ACADEMIC,
        "organization": "Diaspora STEM Trust",
        "tags": ["scholarship", "phd", "stem", "funding", "computer science"],
        "location": "Europe",
        "requirements": "GPA 3.3+, research proposal, English proficiency.",
        "why_summary": "Degree funding without pausing your research agenda.",
        "deadline": date.today() + timedelta(days=30),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.85, "value_estimate": 0.95},
        "source_id": "seed:stem-phd-scholarship",
    },
    {
        "title": "Junior backend developer",
        "description": "Build APIs for a growing fintech product. Python/Django preferred.",
        "category": OpportunityCategory.EMPLOYMENT,
        "organization": "Fintech Co",
        "tags": ["software engineering", "python", "remote work", "backend"],
        "location": "Nairobi · Remote-friendly",
        "requirements": "1+ years backend experience, Django or Flask.",
        "why_summary": "Stable role with remote flexibility while you grow backend depth.",
        "deadline": date.today() + timedelta(days=3),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": ["Nairobi", "Remote"], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.25, "value_estimate": 0.7},
        "source_id": "seed:junior-backend-developer",
    },
    {
        "title": "Product leaders summit (scholarship seats)",
        "description": "Three-day conference with mentorship circles for early PMs.",
        "category": OpportunityCategory.PROFESSIONAL_DEV,
        "organization": "Product Leaders Africa",
        "tags": ["conference", "product", "mentorship", "networking"],
        "location": "Lagos",
        "requirements": "1–4 years in product or adjacent roles.",
        "why_summary": "High-signal networking without paying full conference rates.",
        "deadline": date.today() + timedelta(days=18),
        "verified": False,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.2, "value_estimate": 0.45},
        "source_id": "seed:product-leaders-summit",
    },
    {
        "title": "Industrial attachment — data team",
        "description": "Three-month attachment supporting data cleaning and reporting.",
        "category": OpportunityCategory.EXPERIENTIAL,
        "organization": "Coast Analytics",
        "tags": ["data science", "analytics", "attachment", "internship"],
        "location": "Mombasa",
        "requirements": "Currently enrolled in a related degree program.",
        "why_summary": "Practical hours that count toward graduation requirements.",
        "deadline": date.today() + timedelta(days=21),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": ["Mombasa", "Kenya"], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.3, "value_estimate": 0.6},
        "source_id": "seed:industrial-attachment-data",
    },
    {
        "title": "Community organizing fellowship",
        "description": "Six-month paid fellowship supporting grassroots civic campaigns.",
        "category": OpportunityCategory.SOCIAL_IMPACT,
        "organization": "Civic Roots",
        "tags": ["volunteering", "civic", "advocacy", "fellowship"],
        "location": "Kisumu",
        "requirements": "Demonstrated community involvement.",
        "why_summary": "Turns civic energy into structured experience and a stipend.",
        "deadline": date.today() + timedelta(days=15),
        "verified": False,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.4, "value_estimate": 0.5},
        "source_id": "seed:community-organizing-fellowship",
    },
    {
        "title": "Campus founders accelerator",
        "description": "Eight-week program with mentors and a small convertible note.",
        "category": OpportunityCategory.ENTREPRENEURSHIP,
        "organization": "Campus Ventures",
        "tags": ["startup", "accelerator", "funding", "entrepreneurship"],
        "location": "Nairobi",
        "requirements": "Incorporated or ready-to-incorporate venture; student or recent grad.",
        "why_summary": "Structure and capital for a first venture without leaving campus.",
        "deadline": date.today() + timedelta(days=25),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": ["Nairobi"], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.55, "value_estimate": 0.7},
        "source_id": "seed:campus-founders-accelerator",
    },
    {
        "title": "Creative residency — storytelling exchange",
        "description": "Six-week residency for writers and filmmakers across East Africa.",
        "category": OpportunityCategory.CULTURAL_EXCHANGE,
        "organization": "Story Exchange East Africa",
        "tags": ["residency", "creative", "exchange", "arts", "travel"],
        "location": "Kampala",
        "requirements": "Portfolio of recent work; available for six weeks on-site.",
        "why_summary": "Space and peers to finish a project, not just another short course.",
        "deadline": date.today() + timedelta(days=40),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.45, "value_estimate": 0.55},
        "source_id": "seed:creative-residency-storytelling",
    },
    {
        "title": "Audit Associate — Nairobi",
        "description": "Entry-level audit role supporting engagements across East Africa.",
        "category": OpportunityCategory.EMPLOYMENT,
        "organization": "KPMG East Africa",
        "tags": ["job", "audit", "finance", "nairobi", "fully funded", "employment"],
        "location": "Nairobi",
        "requirements": "Recent graduate in accounting, finance, or related; CPA progress preferred.",
        "why_summary": "A clear first step into professional services with structured training.",
        "deadline": date.today() + timedelta(days=19),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": ["Nairobi", "Kenya"], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.3, "value_estimate": 0.75},
        "source_id": "scrape:kpmg-audit-associate",
        "source_type": OpportunitySourceType.SCRAPE,
    },
    {
        "title": "Mastercard Foundation Research Grant",
        "description": "Proposal-based research funding for scholars working on education and youth employment.",
        "category": OpportunityCategory.RESEARCH,
        "organization": "Mastercard Foundation",
        "tags": ["grant", "research", "fellowship", "funding", "fully funded"],
        "location": "East Africa",
        "requirements": "Research proposal required; affiliation with a recognized institution.",
        "why_summary": "Serious funding when you already have a research question worth defending.",
        "deadline": date.today() + timedelta(days=38),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.75, "value_estimate": 0.9},
        "source_id": "api:mastercard-research-grant",
        "source_type": OpportunitySourceType.API,
    },
    {
        "title": "Finance Attachment, Q4 intake",
        "description": "Supervised finance attachment with sign-off ready before day one.",
        "category": OpportunityCategory.EXPERIENTIAL,
        "organization": "KCB Group",
        "tags": ["attachment", "finance", "internship", "fieldwork"],
        "location": "Nairobi",
        "requirements": "Currently enrolled; supervisor sign-off required.",
        "why_summary": "Fieldwork-heavy placement that counts toward graduation requirements.",
        "deadline": date.today() + timedelta(days=45),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": ["Nairobi", "Kenya"], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.35, "value_estimate": 0.65},
        "source_id": "scrape:kcb-finance-attachment-q4",
        "source_type": OpportunitySourceType.SCRAPE,
    },
    {
        "title": "DAAD Short Course — Data Science",
        "description": "Fully funded short course in applied data science for East African graduates.",
        "category": OpportunityCategory.ACADEMIC,
        "organization": "DAAD",
        "tags": ["scholarship", "course", "data science", "fully funded"],
        "location": "Remote · Germany modules",
        "requirements": "Bachelor's in a quantitative field; English proficiency.",
        "why_summary": "Credentialed learning without a multi-year degree commitment.",
        "deadline": date.today() + timedelta(days=35),
        "verified": True,
        "eligibility_rules": {"citizenship": [], "location": [], "budget_required": False},
        "roi_inputs": {"effort_estimate": 0.4, "value_estimate": 0.7},
        "source_id": "api:daad-data-science-short-course",
        "source_type": OpportunitySourceType.API,
    },
]


class Command(BaseCommand):
    help = "Seed demo opportunities (multi-source provenance + category coverage)"

    def handle(self, *args, **options):
        obsolete = [
            "Product design internship",
            "Study abroad — computer science exchange",
            "Frontend engineer (React)",
            "Marketing internship",
        ]
        Opportunity.objects.filter(title__in=obsolete).delete()

        created = 0
        now = timezone.now()
        for item in SEED:
            category = item["category"]
            verified = item.get("verified", False)
            source_type = item.get("source_type", OpportunitySourceType.MANUAL)
            payload = {k: v for k, v in item.items() if k != "source_type"}
            defaults = {
                **payload,
                "intent": CATEGORY_DEFAULT_INTENT.get(category, IntentBucket.ADVANCEMENT),
                "source_type": source_type,
                "status": OpportunityStatus.LIVE if verified else OpportunityStatus.UNVERIFIED,
                "last_verified_at": now if verified else None,
            }
            obj, was_created = Opportunity.objects.update_or_create(
                source_id=payload["source_id"],
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                obj.updated_at = now
                obj.save(update_fields=["updated_at"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded opportunities ({created} new / refreshed). Sources tagged for provenance."
            )
        )
