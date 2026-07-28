"""Load sources.yaml and yield raw opportunity dicts from adapters."""

from __future__ import annotations

from pathlib import Path

from django.conf import settings

from ingestion.sources.api import stubs as api_stubs
from ingestion.sources.api.crossref import fetch_crossref
from ingestion.sources.csv_manual import fetch_csv
from ingestion.sources.pdf_parse import stubs as pdf_stubs
from ingestion.sources.scrapers.ats_boards import scrape_ats_boards
from ingestion.sources.scrapers.opportunity_desk import scrape_opportunity_desk
from ingestion.sources.scrapers.university_pages import scrape_university_pages
from ingestion.sources.scrapers import stubs as scrape_stubs
from ingestion.sources.social_signal import stubs as social_stubs

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

ADAPTERS = {
    "csv": fetch_csv,
    "eventbrite": api_stubs.fetch_eventbrite,
    "linkedin": api_stubs.fetch_linkedin,
    "github": api_stubs.fetch_github,
    "crossref": fetch_crossref,
    "university_pages": scrape_university_pages,
    "ats_boards": scrape_ats_boards,
    "gov_gazette": scrape_stubs.scrape_gov_gazette,
    "opportunity_desk": scrape_opportunity_desk,
    "grant_notices": pdf_stubs.parse_grant_notices,
    "ngo_reports": pdf_stubs.parse_ngo_reports,
    "reddit": social_stubs.listen_reddit,
    "x": social_stubs.listen_x,
    "discord": social_stubs.listen_discord,
}


def config_path() -> Path:
    return Path(settings.BASE_DIR) / "ingestion" / "config" / "sources.yaml"


def load_sources_config() -> list[dict]:
    path = config_path()
    if not path.is_file():
        return []
    if yaml is None:
        raise RuntimeError("PyYAML is required. pip install pyyaml")
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return list(data.get("sources") or [])


def resolve_path(raw: str | None) -> str | None:
    if not raw:
        return None
    p = Path(raw)
    if p.is_file():
        return str(p)
    candidate = Path(settings.BASE_DIR) / raw
    return str(candidate)


def iter_enabled_sources(only_ids: list[str] | None = None):
    """Yield (source_entry, raw_rows) for enabled or selected sources."""
    for entry in load_sources_config():
        sid = entry.get("id")
        if only_ids and sid not in only_ids:
            continue
        if not entry.get("enabled", False) and not (only_ids and sid in only_ids):
            continue
        adapter_name = entry.get("adapter")
        adapter = ADAPTERS.get(adapter_name)
        if not adapter:
            continue
        cfg = dict(entry)
        if cfg.get("path"):
            cfg["path"] = resolve_path(cfg["path"])
        rows = []
        for row in adapter(cfg) or []:
            row.setdefault("source_type", entry.get("source_type", "manual"))
            if entry.get("category") and not row.get("category"):
                row["category"] = entry["category"]
            rows.append(row)
        yield entry, rows


def run_enabled_sources(only_ids: list[str] | None = None) -> list[dict]:
    """Fetch raw records from enabled (or selected) sources."""
    results: list[dict] = []
    for _entry, rows in iter_enabled_sources(only_ids=only_ids):
        results.extend(rows)
    return results
