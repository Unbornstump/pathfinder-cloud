"""Opportunity Desk — live RSS ingest."""

from __future__ import annotations

import logging

from ingestion.http import parse_rss
from ingestion.rss_map import entry_to_raw

logger = logging.getLogger(__name__)

DEFAULT_FEEDS = [
    "https://opportunitydesk.org/feed/",
    "https://opportunitydesk.org/category/africa/feed/",
]


def scrape_opportunity_desk(config: dict) -> list[dict]:
    feeds = config.get("feeds") or DEFAULT_FEEDS
    max_items = int(config.get("max_items") or 40)
    seen: set[str] = set()
    out: list[dict] = []

    for feed in feeds:
        url = feed if isinstance(feed, str) else (feed or {}).get("url")
        if not url:
            continue
        try:
            entries = parse_rss(url)
        except Exception as exc:  # noqa: BLE001 — fail soft per feed
            logger.warning("opportunity_desk feed failed %s: %s", url, exc)
            continue
        for entry in entries:
            raw = entry_to_raw(
                entry,
                source="opportunity_desk",
                source_type="scrape",
                organization="",
            )
            if not raw:
                continue
            sid = raw["source_id"]
            if sid in seen:
                continue
            seen.add(sid)
            out.append(raw)
            if len(out) >= max_items:
                return out
    return out
