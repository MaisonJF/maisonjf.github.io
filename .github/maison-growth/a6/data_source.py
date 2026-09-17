from __future__ import annotations

import json
import sqlite3
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

class DashboardDataSource(ABC):
    @abstractmethod
    def snapshot(self) -> dict[str, Any]:
        raise NotImplementedError

class FixtureDataSource(DashboardDataSource):
    def __init__(self, path: str | Path):
        self.path = Path(path)
    def snapshot(self) -> dict[str, Any]:
        return json.loads(self.path.read_text(encoding="utf-8"))

class SQLiteReadOnlyDataSource(DashboardDataSource):
    """Future/local adapter. Opens SQLite/D1-compatible exports strictly read-only."""
    def __init__(self, path: str | Path):
        self.path = Path(path)
    def _connect(self) -> sqlite3.Connection:
        uri = f"file:{self.path.resolve()}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only = ON")
        return conn
    def snapshot(self) -> dict[str, Any]:
        with self._connect() as conn:
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            def rows(name: str, limit: int = 500):
                if name not in tables:
                    return []
                return [dict(r) for r in conn.execute(f"SELECT * FROM {name} LIMIT ?", (limit,))]
            return {
                "meta": {"generated_at": None, "data_status": "observed", "source_label": "sqlite-read-only"},
                "needs": rows("needs"), "intents": rows("intents"), "assets": rows("assets"), "solutions": rows("solutions"),
                "coverage": rows("coverage_resolutions") or rows("coverage_assessments"),
                "journeys": rows("journey_snapshots"), "economics": rows("conversion_economic_assessments"),
                "oracle_aggregates": [], "clusters": rows("semantic_clusters"), "aliases": rows("semantic_aliases"),
                "gaps": rows("coverage_gaps"), "candidates": rows("internal_candidates"), "conclusions": rows("brain_conclusions"),
                "evidence": rows("map_evidence")
            }
