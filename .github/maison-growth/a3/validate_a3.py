#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import py_compile
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_json(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


contract = load_json("a3-contract.json")
permissions = load_json("a3-permissions.json")
solutions = load_json("solution-contract.json")
economics = load_json("economics-contract.json")
manifest = load_json("migration-manifest.json")

assert contract["contract_version"] == "A3.1"
assert contract["depends_on"] == ["A0", "A1.1", "A2.1"]
assert contract["runtime_isolation"]["public_site_dependency"] is False
assert contract["runtime_isolation"]["public_site_write"] is False
assert contract["runtime_isolation"]["cloudflare_worker_required_now"] is False
assert contract["runtime_isolation"]["queue_required_now"] is False
assert contract["runtime_isolation"]["d1_required_now"] is False
assert contract["completion"]["a4_must_not_start_implicitly"] is True
assert contract["privacy"]["direct_pii"] is False
assert contract["privacy"]["oracle_paid_text"] is False
assert contract["economics"]["price_is_not_value"] is True

assert permissions["default"] == "deny"
assert permissions["public_site_write"] is False
assert permissions["public_runtime_dependency"] is False
assert permissions["cloudflare_resources_provisioned"] is False
for role in permissions["roles"].values():
    forbidden = set(role["forbidden"])
    assert "public_site.write" in forbidden
    assert "oracle.content.read" in forbidden

required_solution_types = {"oracle", "physical_product", "service", "ebook", "b2b", "digital_collection"}
assert required_solution_types <= set(solutions["solution_types"])
assert solutions["rules"]["commercial_pii_allowed"] is False
assert economics["principles"]["reference_price_is_not_realised_revenue"] is True
assert economics["principles"]["unknown_is_not_zero"] is True
assert economics["principles"]["confidence_must_be_carried_with_estimates"] is True

migration_entry = manifest["migrations"][0]
migration_path = ROOT / migration_entry["file"]
migration = migration_path.read_text(encoding="utf-8")
assert hashlib.sha256(migration.encode("utf-8")).hexdigest() == migration_entry["sha256"]
assert "maison_growth_a3_schema_version" in migration
assert "first_last" in migration
assert "DROP TABLE" not in migration.upper()
assert "ALTER TABLE EVENTS" not in migration.upper()
assert "UPDATE EVENTS" not in migration.upper()
assert "DELETE FROM EVENTS" not in migration.upper()

py_compile.compile(str(ROOT / "journey_engine.py"), doraise=True)
py_compile.compile(str(ROOT / "repository.py"), doraise=True)

# When executed inside the repository, validate the A3 migration against the exact A1 schema too.
a1_schema = ROOT.parent / "a1" / "schema.sql"
if a1_schema.exists():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(a1_schema.read_text(encoding="utf-8"))
    con.executescript(migration)
    assert list(con.execute("PRAGMA foreign_key_check")) == []
    assert con.execute(
        "SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a3_schema_version'"
    ).fetchone() == ("A3.1",)

result = subprocess.run(
    [sys.executable, str(ROOT / "test_a3.py")],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
if result.returncode != 0:
    sys.stderr.write(result.stdout)
    sys.stderr.write(result.stderr)
    raise SystemExit(result.returncode)

print("A3 Journeys + Economics contracts: OK")
