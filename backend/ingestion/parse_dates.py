"""Deadline extraction from free-text opportunity copy."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Optional

_MONTHS = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

_PATTERNS = [
    # Deadline: September 18, 2026
    re.compile(
        r"deadline[:\s]+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        re.I,
    ),
    # Deadline: 18 September 2026
    re.compile(
        r"deadline[:\s]+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})",
        re.I,
    ),
    # Deadline: 2026-09-18
    re.compile(r"deadline[:\s]+(\d{4})-(\d{2})-(\d{2})", re.I),
    # Closes Sep 2 / Closing date: ...
    re.compile(
        r"(?:closes?|closing(?:\s+date)?)[:\s]+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        re.I,
    ),
]


def _safe_date(y: int, m: int, d: int) -> Optional[date]:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def parse_deadline(text: str | None) -> Optional[date]:
    if not text:
        return None
    blob = re.sub(r"<[^>]+>", " ", text)
    blob = re.sub(r"\s+", " ", blob)

    for pat in _PATTERNS:
        m = pat.search(blob)
        if not m:
            continue
        g = m.groups()
        if len(g) == 3 and g[0].isdigit() and len(g[0]) == 4:
            return _safe_date(int(g[0]), int(g[1]), int(g[2]))
        if len(g) == 3 and g[0].isdigit():
            month = _MONTHS.get(g[1].lower())
            if month:
                return _safe_date(int(g[2]), month, int(g[0]))
        if len(g) == 3:
            month = _MONTHS.get(g[0].lower())
            if month:
                return _safe_date(int(g[2]), month, int(g[1]))
    return None


def deadline_or_fallback(text: str | None, days: int = 30) -> str:
    d = parse_deadline(text)
    if d is None:
        d = date.today() + timedelta(days=days)
    return d.isoformat()


def iso_from_struct(published_parsed) -> Optional[str]:
    if not published_parsed:
        return None
    try:
        dt = datetime(*published_parsed[:6]).date()
        return dt.isoformat()
    except (TypeError, ValueError):
        return None
