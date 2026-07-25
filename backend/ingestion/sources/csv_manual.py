"""CSV / manual ingest — the working path for this phase."""

from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path


def fetch_csv(config: dict) -> list[dict]:
    path = config.get("path")
    if not path:
        return []
    file_path = Path(path)
    if not file_path.is_file():
        return []

    rows = []
    with file_path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for i, row in enumerate(reader):
            title = (row.get("title") or "").strip()
            if not title:
                continue
            deadline_raw = (row.get("deadline") or "").strip()
            deadline = None
            if deadline_raw:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
                    try:
                        deadline = datetime.strptime(deadline_raw, fmt).date().isoformat()
                        break
                    except ValueError:
                        continue
            tags = [
                t.strip()
                for t in (row.get("tags") or "").split("|")
                if t.strip()
            ]
            source_id = (row.get("source_id") or "").strip() or f"csv:{file_path.stem}:{i}"
            rows.append(
                {
                    "title": title,
                    "description": (row.get("description") or "").strip(),
                    "category": (row.get("category") or config.get("category") or "").strip(),
                    "organization": (row.get("organization") or "").strip(),
                    "tags": tags,
                    "location": (row.get("location") or "").strip(),
                    "requirements": (row.get("requirements") or "").strip(),
                    "why_summary": (row.get("why_summary") or "").strip(),
                    "deadline": deadline,
                    "source_type": "manual",
                    "source_id": source_id,
                    "eligibility_rules": {
                        "citizenship": [
                            c.strip()
                            for c in (row.get("citizenship") or "").split("|")
                            if c.strip()
                        ],
                        "location": [],
                        "budget_required": (row.get("budget_required") or "").lower()
                        in ("1", "true", "yes"),
                    },
                    "roi_inputs": {
                        "effort_estimate": float(row.get("effort_estimate") or 0.5),
                        "value_estimate": float(row.get("value_estimate") or 0.5),
                    },
                    "status": (row.get("status") or "unverified").strip() or "unverified",
                }
            )
    return rows
