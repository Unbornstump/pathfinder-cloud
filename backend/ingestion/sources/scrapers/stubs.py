"""Legacy stub entrypoints — live scrapers live in dedicated modules."""

from __future__ import annotations


def scrape_university_pages(config: dict):
    from ingestion.sources.scrapers.university_pages import scrape_university_pages as live

    return live(config)


def scrape_ats_boards(config: dict):
    from ingestion.sources.scrapers.ats_boards import scrape_ats_boards as live

    return live(config)


def scrape_gov_gazette(_config: dict):
    return []


def scrape_opportunity_desk(config: dict):
    from ingestion.sources.scrapers.opportunity_desk import scrape_opportunity_desk as live

    return live(config)
