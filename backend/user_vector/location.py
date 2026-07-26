"""Resolve stored locations — map lat/lng to place names for eligibility."""

from __future__ import annotations

import re

PLACE_BANDS = [
    {"name": "Nairobi", "lat": (-1.45, -1.15), "lng": (36.65, 37.05)},
    {"name": "Mombasa", "lat": (-4.15, -3.9), "lng": (39.55, 39.75)},
    {"name": "Kisumu", "lat": (-0.15, 0.05), "lng": (34.7, 34.85)},
    {"name": "Nakuru", "lat": (-0.35, -0.2), "lng": (36.0, 36.15)},
    {"name": "Eldoret", "lat": (0.45, 0.6), "lng": (35.2, 35.35)},
    {"name": "Meru", "lat": (0.0, 0.15), "lng": (37.6, 37.75)},
]

COORD_RE = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$")


def parse_coords(raw: str | None) -> tuple[float, float] | None:
    if not raw or not isinstance(raw, str):
        return None
    m = COORD_RE.match(raw.strip())
    if not m:
        return None
    return float(m.group(1)), float(m.group(2))


def place_name_from_coords(lat: float, lng: float) -> str:
    for p in PLACE_BANDS:
        lo_lat, hi_lat = p["lat"]
        lo_lng, hi_lng = p["lng"]
        if lo_lat <= lat <= hi_lat and lo_lng <= lng <= hi_lng:
            return p["name"]
    if -5 <= lat <= 5 and 33 <= lng <= 42:
        return "Kenya"
    return "Your area"


def format_location(raw: str | None, fallback: str = "") -> str:
    if not raw or not str(raw).strip():
        return fallback
    coords = parse_coords(raw)
    if not coords:
        return str(raw).strip()
    return place_name_from_coords(*coords)
