from __future__ import annotations

import hashlib
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]

def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))

def ok(condition, message):
    if not condition:
        raise AssertionError(message)

contract = load("a13-contract.json")
registry = load("provider-registry.json")
memory = load("memory-contribution-contract.json")
permissions = load("a13-permissions.json")
manifest = load("migration-manifest.json")

ok(contract["contract_version"] == "A13.2", "wrong contract version")
ok(contract["mode"] == "runtime_code_ready_not_provisioned", "unexpected runtime mode")
ok(contract["runtime"]["runtime_code_ready"] is True, "runtime code must be ready")
ok(contract["runtime"]["cloudflare_resources_provisioned"] is False, "Cloudflare must not be provisioned by repo stage")
ok(contract["runtime"]["external_network_enabled"] is False, "live collection must remain disabled by repo stage")
ok(contract["runtime"]["production_credentials_present"] is False, "production credentials must not be present")
ok(contract["runtime"]["secrets_in_repository"] is False, "secrets must never be committed")
ok(contract["hard_boundaries"]["private_memory_scraping"] is False, "private memory scraping forbidden")
ok(contract["hard_boundaries"]["direct_pii_persistence"] is False, "direct PII forbidden")
ok(contract["hard_boundaries"]["external_output_can_publish"] is False, "external models may not publish")
ok(registry["default_runtime_enabled"] is False, "providers deny by default")
ok(all(p["runtime_enabled"] is False for p in registry["providers"]), "provider unexpectedly enabled in registry")
ok(all(p["private_memory_access"] is False for p in registry["providers"]), "private memory access forbidden")
ok(memory["required_values"]["user_selected_content"] is True, "memory must be user selected")
ok(memory["required_values"]["revocable"] is True, "memory contribution must be revocable")
ok(permissions["default"] == "deny", "permissions must deny by default")

for forbidden in [
    "repository.write","public_site.write","private_memory.read",
    "hidden_account_context.read","credential.read","direct_pii.persist",
    "oracle.content.read","price.write","checkout.write","catalogue.write",
    "permissions.write"
]:
    ok(forbidden in permissions["forbidden"], f"missing deny: {forbidden}")

migration_rel = manifest["migrations"][0]["path"]
migration_path = HERE / migration_rel
migration_bytes = migration_path.read_bytes()
actual_hash = hashlib.sha256(migration_bytes).hexdigest()
ok(actual_hash == manifest["migrations"][0]["sha256"], "A13 migration hash mismatch")

db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript("""
CREATE TABLE events(event_id TEXT PRIMARY KEY);
CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL);
""")
db.executescript(migration_bytes.decode("utf-8"))
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
for table in [
    "external_intelligence_control",
    "external_intelligence_observations",
    "external_intelligence_evidence_roots",
    "external_intelligence_observation_roots",
    "external_intelligence_daily_usage"
]:
    ok(table in tables, f"missing A13 table: {table}")
control = db.execute("SELECT kill_switch,observe_only FROM external_intelligence_control WHERE control_id='global'").fetchone()
ok(control == (1,1), "A13 must migrate with kill switch ON and observe_only ON")
views = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='view'")}
ok("external_intelligence_brain_feed" in views, "missing Brain feed view")
db.close()

commands = [
    [sys.executable, "-m", "unittest", "test_a13.py", "-v"],
    ["node", "--test", "workers/maison-intelligence/test/core.test.mjs"],
    ["node", "--check", "workers/maison-intelligence/src/core.js"],
    ["node", "--check", "workers/maison-intelligence/src/providers.js"],
    ["node", "--check", "workers/maison-intelligence/src/index.js"]
]

for command in commands:
    cwd = HERE if command[0] == sys.executable else REPO
    result = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    if result.returncode:
        raise SystemExit(result.returncode)

print("A13.2 contracts + migration + Worker tests: OK")
