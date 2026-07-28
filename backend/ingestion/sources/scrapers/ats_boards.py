"""Public Greenhouse + Lever job board JSON adapters."""

from __future__ import annotations

import logging
import re
from datetime import date, timedelta

from ingestion.http import fetch_json

logger = logging.getLogger(__name__)


def scrape_ats_boards(config: dict) -> list[dict]:
    max_items = int(config.get("max_items") or 60)
    out: list[dict] = []
    for board in config.get("boards") or []:
        if not isinstance(board, dict):
            continue
        provider = (board.get("provider") or "").strip().lower()
        token = (board.get("token") or "").strip()
        org = board.get("organization") or token
        if not token or provider not in ("greenhouse", "lever"):
            continue
        try:
            if provider == "greenhouse":
                rows = _greenhouse(token, org)
            else:
                rows = _lever(token, org)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ats board failed %s/%s: %s", provider, token, exc)
            continue
        for raw in rows:
            out.append(raw)
            if len(out) >= max_items:
                return out
    return out


def _greenhouse(token: str, org: str) -> list[dict]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
    data = fetch_json(url, params={"content": "true"})
    if not data:
        return []
    jobs = data.get("jobs") if isinstance(data, dict) else data
    rows = []
    for job in jobs or []:
        jid = job.get("id")
        title = (job.get("title") or "").strip()
        if not title or jid is None:
            continue
        loc = ""
        if isinstance(job.get("location"), dict):
            loc = job["location"].get("name") or ""
        abs_url = job.get("absolute_url") or ""
        content = re.sub(r"<[^>]+>", " ", job.get("content") or "")
        content = re.sub(r"\s+", " ", content).strip()
        remote = "remote" in f"{title} {loc} {content}".lower()
        tags = ["job", "employment"]
        if remote:
            tags.append("remote")
        rows.append(
            {
                "title": title[:255],
                "description": (content[:2000] or title),
                "organization": org,
                "location": loc or "Unspecified",
                "requirements": "",
                "tags": tags,
                "deadline": (date.today() + timedelta(days=45)).isoformat(),
                "category": "employment",
                "source": "ats_boards",
                "source_type": "scrape",
                "source_id": f"scrape:ats:greenhouse:{token}:{jid}",
                "source_url": abs_url,
                "why_summary": f"Live Greenhouse board listing from {org}.",
                "status": "unverified",
            }
        )
    return rows


def _lever(token: str, org: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{token}"
    data = fetch_json(url, params={"mode": "json"})
    if not isinstance(data, list):
        return []
    rows = []
    for job in data:
        jid = job.get("id")
        title = (job.get("text") or "").strip()
        if not title or not jid:
            continue
        loc = ""
        cats = job.get("categories") or {}
        if isinstance(cats, dict):
            loc = cats.get("location") or ""
        abs_url = job.get("hostedUrl") or job.get("applyUrl") or ""
        desc = job.get("descriptionPlain") or ""
        if not desc:
            desc = re.sub(r"<[^>]+>", " ", job.get("description") or "")
            desc = re.sub(r"\s+", " ", desc).strip()
        remote = "remote" in f"{title} {loc} {desc}".lower()
        tags = ["job", "employment"]
        if remote:
            tags.append("remote")
        rows.append(
            {
                "title": title[:255],
                "description": (desc[:2000] or title),
                "organization": org,
                "location": loc or "Unspecified",
                "requirements": "",
                "tags": tags,
                "deadline": (date.today() + timedelta(days=45)).isoformat(),
                "category": "employment",
                "source": "ats_boards",
                "source_type": "scrape",
                "source_id": f"scrape:ats:lever:{token}:{jid}",
                "source_url": abs_url,
                "why_summary": f"Live Lever board listing from {org}.",
                "status": "unverified",
            }
        )
    return rows
