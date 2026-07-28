"""API source stubs — empty until credentials/config are set."""


def fetch_eventbrite(_config: dict):
    return []


def fetch_linkedin(_config: dict):
    return []


def fetch_github(_config: dict):
    return []


def fetch_crossref(config: dict):
    """Backward-compatible import path — live adapter lives in crossref.py."""
    from ingestion.sources.api.crossref import fetch_crossref as live

    return live(config)
