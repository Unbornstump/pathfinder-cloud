"""Helpers for hard_constraints on UserProfile."""

from __future__ import annotations

from user_vector.location import format_location


def get_constraints(profile) -> dict:
    raw = profile.hard_constraints or {}
    loc_raw = (raw.get("location") or profile.location or "").strip()
    return {
        "citizenship": (raw.get("citizenship") or "").strip().upper()
        if isinstance(raw.get("citizenship"), str)
        else (raw.get("citizenship") or ""),
        "location": format_location(loc_raw) if loc_raw else "",
        "budget": raw.get("budget"),
        "visa_status": (raw.get("visa_status") or "").strip().lower(),
    }


def normalize_constraints(data: dict | None) -> dict:
    data = data or {}
    return {
        "citizenship": str(data.get("citizenship") or "").strip().upper(),
        "location": str(data.get("location") or "").strip(),
        "budget": data.get("budget"),
        "visa_status": str(data.get("visa_status") or "").strip().lower(),
    }
