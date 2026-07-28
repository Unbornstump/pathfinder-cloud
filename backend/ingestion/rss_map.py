"""Map RSS/Atom entries into Pathfinder raw opportunity dicts."""

from __future__ import annotations

import hashlib
import re
from html import unescape

from ingestion.parse_dates import deadline_or_fallback, iso_from_struct


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", " ", value)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _guid(entry: dict, link: str, title: str) -> str:
    raw = (
        getattr(entry, "id", None)
        or entry.get("id")
        or entry.get("guid")
        or link
        or title
    )
    if isinstance(raw, dict):
        raw = raw.get("value") or str(raw)
    return str(raw).strip()


def entry_to_raw(
    entry: dict,
    *,
    source: str,
    source_type: str = "scrape",
    organization: str = "",
    default_category: str = "",
    fallback_deadline_days: int = 30,
) -> dict | None:
    title = strip_html(entry.get("title") or "")
    if not title:
        return None
    link = (entry.get("link") or "").strip()
    summary = strip_html(entry.get("summary") or entry.get("description") or "")
    content_bits = entry.get("content") or []
    if not summary and content_bits:
        summary = strip_html(content_bits[0].get("value") if isinstance(content_bits[0], dict) else str(content_bits[0]))

    tags = []
    for tag in entry.get("tags") or []:
        term = tag.get("term") if isinstance(tag, dict) else str(tag)
        term = (term or "").strip()
        if term and term.lower() not in {t.lower() for t in tags}:
            tags.append(term)

    org = organization
    if not org:
        # Prefer human org-like categories over geography labels
        skip = {
            "africa",
            "america",
            "asia",
            "europe",
            "australia and oceania",
            "fellowships",
            "grants",
            "scholarships",
            "internships",
            "jobs",
            "online courses",
        }
        for t in tags:
            if t.lower() not in skip and len(t) > 2:
                org = t
                break
    if not org:
        org = source.replace("_", " ").title()

    guid = _guid(entry, link, title)
    digest = hashlib.sha1(guid.encode("utf-8")).hexdigest()[:16]
    body = f"{title} {summary}"
    deadline = deadline_or_fallback(body, days=fallback_deadline_days)
    pub = iso_from_struct(entry.get("published_parsed"))

    return {
        "title": title[:255],
        "description": summary or title,
        "organization": org[:255],
        "location": "International",
        "requirements": "",
        "tags": tags[:24],
        "deadline": deadline,
        "category": default_category,
        "source": source,
        "source_type": source_type,
        "source_id": f"{source_type}:{source}:{digest}",
        "source_url": link,
        "why_summary": f"Ingested from {source} RSS/HTML feed.",
        "status": "unverified",
        "published_at": pub,
    }
