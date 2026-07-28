"""Crossref Works API — bibliographic research signals (not application portals)."""

from __future__ import annotations

import logging
import re
from datetime import date, timedelta

from django.conf import settings

from ingestion.http import fetch_json

logger = logging.getLogger(__name__)

CROSSREF_WORKS = "https://api.crossref.org/works"


def fetch_crossref(config: dict) -> list[dict]:
    mailto = (getattr(settings, "CROSSREF_MAILTO", "") or "").strip()
    if not mailto:
        logger.warning("CROSSREF_MAILTO not set — skipping Crossref ingest")
        return []

    queries = config.get("queries") or ["fellowship Africa", "research grant Kenya"]
    rows_per = int(config.get("rows") or 15)
    max_items = int(config.get("max_items") or 40)
    out: list[dict] = []
    seen: set[str] = set()

    for query in queries:
        if len(out) >= max_items:
            break
        data = fetch_json(
            CROSSREF_WORKS,
            params={"query": query, "rows": rows_per},
            mailto=mailto,
        )
        if not data or not isinstance(data, dict):
            continue
        items = ((data.get("message") or {}).get("items")) or []
        for work in items:
            raw = _map_work(work, query=query)
            if not raw or raw["source_id"] in seen:
                continue
            seen.add(raw["source_id"])
            out.append(raw)
            if len(out) >= max_items:
                break
    return out


def _map_work(work: dict, *, query: str) -> dict | None:
    title_list = work.get("title") or []
    title = (title_list[0] if title_list else "").strip()
    if not title:
        return None
    doi = (work.get("DOI") or "").strip()
    source_id = (
        f"api:crossref:{doi}" if doi else f"api:crossref:{hash(title) & 0xFFFFFFFF:x}"
    )
    publisher = (work.get("publisher") or "").strip() or "Crossref"
    container = work.get("container-title") or []
    if container and not publisher:
        publisher = container[0]
    url = work.get("URL") or (f"https://doi.org/{doi}" if doi else "")
    abstract = work.get("abstract") or ""
    if abstract:
        abstract = re_sub_tags(abstract)
    issued = work.get("issued") or work.get("published-print") or work.get("published-online") or {}
    parts = (issued.get("date-parts") or [[]])[0] or []
    soft = date.today() + timedelta(days=90)
    try:
        if len(parts) >= 3 and parts[0] and parts[1] and parts[2]:
            soft = date(int(parts[0]), int(parts[1]), int(parts[2])) + timedelta(days=90)
        elif len(parts) >= 1 and parts[0]:
            soft = date(int(parts[0]), 12, 31)
    except (TypeError, ValueError):
        soft = date.today() + timedelta(days=90)

    return {
        "title": title[:255],
        "description": abstract or (
            f"Bibliographic Crossref hit for query “{query}”. "
            "Not an application portal — use as a research signal."
        ),
        "organization": publisher[:255],
        "location": "International",
        "requirements": "",
        "tags": ["crossref", "bibliographic", "research"],
        "deadline": soft.isoformat(),
        "category": "research",
        "source": "crossref",
        "source_type": "api",
        "source_id": source_id,
        "source_url": url,
        "why_summary": (
            f"Crossref bibliographic signal matching “{query}” — "
            "not a live application listing."
        ),
        "status": "unverified",
    }


def re_sub_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text).strip()
