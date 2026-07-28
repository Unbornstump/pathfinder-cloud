"""University / scholarship listing pages — RSS feeds + simple HTML link harvest."""

from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from ingestion.http import fetch_text, parse_rss
from ingestion.parse_dates import deadline_or_fallback
from ingestion.rss_map import entry_to_raw, strip_html

logger = logging.getLogger(__name__)

_LINK_HINTS = re.compile(
    r"scholarship|fellowship|internship|grant|career|vacancy|opportunity|call\s+for",
    re.I,
)


def scrape_university_pages(config: dict) -> list[dict]:
    max_items = int(config.get("max_items") or 40)
    out: list[dict] = []
    seen: set[str] = set()

    for feed in config.get("feeds") or []:
        url = feed.get("url") if isinstance(feed, dict) else None
        org = (feed.get("organization") if isinstance(feed, dict) else "") or "University"
        if not url:
            continue
        try:
            for entry in parse_rss(url):
                raw = entry_to_raw(
                    entry,
                    source="university_pages",
                    organization=org,
                    default_category="academic",
                )
                if not raw or raw["source_id"] in seen:
                    continue
                seen.add(raw["source_id"])
                out.append(raw)
                if len(out) >= max_items:
                    return out
        except Exception as exc:  # noqa: BLE001
            logger.warning("university feed failed %s: %s", url, exc)

    for page in config.get("pages") or []:
        if len(out) >= max_items:
            break
        if not isinstance(page, dict):
            continue
        url = page.get("url")
        org = page.get("organization") or "University"
        link_contains = page.get("link_contains") or []
        if not url:
            continue
        try:
            rows = _harvest_page(url, org=org, link_contains=link_contains)
        except Exception as exc:  # noqa: BLE001
            logger.warning("university page failed %s: %s", url, exc)
            continue
        for raw in rows:
            if raw["source_id"] in seen:
                continue
            seen.add(raw["source_id"])
            out.append(raw)
            if len(out) >= max_items:
                return out
    return out


def _harvest_page(url: str, *, org: str, link_contains: list) -> list[dict]:
    html = fetch_text(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
    rows: list[dict] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        text = strip_html(a.get_text(" ", strip=True))
        if not text or len(text) < 8:
            continue
        full = urljoin(url, href)
        if not full.startswith(base):
            continue
        blob = f"{text} {full}"
        if link_contains:
            if not any(str(x).lower() in blob.lower() for x in link_contains):
                continue
        elif not _LINK_HINTS.search(blob):
            continue
        sid = f"scrape:university_pages:{hash(full) & 0xFFFFFFFF:x}"
        rows.append(
            {
                "title": text[:255],
                "description": text,
                "organization": org,
                "location": "Kenya",
                "requirements": "",
                "tags": ["university", "academic"],
                "deadline": deadline_or_fallback(text, days=45),
                "category": "academic",
                "source": "university_pages",
                "source_type": "scrape",
                "source_id": sid,
                "source_url": full,
                "why_summary": f"Linked from {org} listings page.",
                "status": "unverified",
            }
        )
        if len(rows) >= 25:
            break
    return rows
