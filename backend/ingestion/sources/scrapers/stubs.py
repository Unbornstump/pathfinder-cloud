"""Scraper adapters — demo harvest with provenance until live credentials land."""

from __future__ import annotations

from datetime import date, timedelta


def _demo_rows(source: str, rows: list[dict]) -> list[dict]:
    out = []
    for i, row in enumerate(rows):
        item = {
            **row,
            "source": source,
            "source_type": "scrape",
            "source_id": row.get("source_id") or f"scrape:{source}:{i}",
        }
        out.append(item)
    return out


def scrape_university_pages(_config: dict):
    return _demo_rows(
        "university_pages",
        [
            {
                "title": "Graduate research assistantship — climate policy",
                "description": "Part-time RA supporting literature reviews on East African climate adaptation.",
                "organization": "University research office",
                "location": "Nairobi",
                "requirements": "Enrolled master's student; strong writing sample.",
                "tags": ["research", "climate", "policy"],
                "deadline": (date.today() + timedelta(days=22)).isoformat(),
            }
        ],
    )


def scrape_ats_boards(_config: dict):
    return _demo_rows(
        "ats_boards",
        [
            {
                "title": "Remote Junior Data Analyst",
                "description": "Series A startup hiring for reporting and dashboard work. Fully remote.",
                "organization": "Series A startup",
                "location": "Remote",
                "requirements": "SQL basics; portfolio of analyses.",
                "tags": ["job", "remote", "data", "analyst", "fully funded"],
                "deadline": (date.today() + timedelta(days=26)).isoformat(),
            }
        ],
    )


def scrape_gov_gazette(_config: dict):
    return []


def scrape_opportunity_desk(_config: dict):
    return _demo_rows(
        "opportunity_desk",
        [
            {
                "title": "Wellcome Trust Early-Career Fellowship",
                "description": "Health sciences fellowship; proposal required. Closes mid-cycle.",
                "organization": "Wellcome Trust",
                "location": "International · health sciences",
                "requirements": "Early-career researcher; proposal required.",
                "tags": ["fellowship", "research", "health", "requires proposal"],
                "deadline": (date.today() + timedelta(days=86)).isoformat(),
            }
        ],
    )
