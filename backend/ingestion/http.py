"""Shared outbound HTTP for ingest adapters — polite UA, timeouts, retries."""

from __future__ import annotations

import logging
import time
from typing import Any

import feedparser
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 25
MAX_RETRIES = 3
RETRY_SLEEP = 1.5


def user_agent(mailto: str | None = None) -> str:
    mail = (mailto or getattr(settings, "CROSSREF_MAILTO", "") or "").strip()
    if mail:
        return f"PathfinderBot/1.0 (mailto:{mail})"
    return "PathfinderBot/1.0 (+https://pathfinder.local; research ingest)"


def _session(mailto: str | None = None) -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": user_agent(mailto),
            "Accept": "*/*",
        }
    )
    return s


def fetch_text(
    url: str,
    *,
    mailto: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> str | None:
    session = _session(mailto)
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = session.get(url, timeout=timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(RETRY_SLEEP * (attempt + 1))
                last_err = f"HTTP {resp.status_code}"
                continue
            if resp.status_code == 404:
                logger.warning("fetch_text 404 %s", url)
                return None
            resp.raise_for_status()
            time.sleep(0.35)
            return resp.text
        except requests.RequestException as exc:
            last_err = str(exc)
            # Don't thrash on permanent client errors
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status and 400 <= status < 500 and status != 429:
                logger.warning("fetch_text client error %s: %s", url, exc)
                return None
            logger.warning("fetch_text failed %s (%s): %s", url, attempt + 1, exc)
            time.sleep(RETRY_SLEEP * (attempt + 1))
    logger.error("fetch_text gave up on %s: %s", url, last_err)
    return None


def fetch_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    mailto: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Any | None:
    session = _session(mailto)
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = session.get(url, params=params, timeout=timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(RETRY_SLEEP * (attempt + 1))
                last_err = f"HTTP {resp.status_code}"
                continue
            if resp.status_code == 404:
                logger.warning("fetch_json 404 %s", url)
                return None
            resp.raise_for_status()
            time.sleep(0.35)
            return resp.json()
        except requests.RequestException as exc:
            last_err = str(exc)
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status and 400 <= status < 500 and status != 429:
                logger.warning("fetch_json client error %s: %s", url, exc)
                return None
            logger.warning("fetch_json failed %s (%s): %s", url, attempt + 1, exc)
            time.sleep(RETRY_SLEEP * (attempt + 1))
    logger.error("fetch_json gave up on %s: %s", url, last_err)
    return None


def parse_rss(url: str, *, mailto: str | None = None) -> list[dict]:
    """Fetch and parse an RSS/Atom feed into feedparser entry dicts."""
    text = fetch_text(url, mailto=mailto)
    if not text:
        return []
    parsed = feedparser.parse(text)
    if getattr(parsed, "bozo", False) and not parsed.entries:
        logger.warning("RSS parse error for %s: %s", url, getattr(parsed, "bozo_exception", None))
        return []
    return list(parsed.entries or [])
