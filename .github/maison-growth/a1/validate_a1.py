#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_json(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def expect_error(fn, label: str):
    try:
        fn()
    except sqlite3.DatabaseError:
        return
    raise AssertionError(f"{label}: expected database rejection")


manifest = load_json("migration-manifest.json")
ids = load_json("id-contract.json")
permissions = load_json("data-permissions.json")
event_contract = load_json("event-contract-v2.json")
a1 = load_json("a1-contract.json")

migration_path = ROOT / manifest["migrations"][0]["file"]
migration = migration_path.read_text(encoding="utf-8")
schema = (ROOT / manifest["canonical_schema_file"]).read_text(encoding="utf-8")
sha = hashlib.sha256(migration.encode("utf-8")).hexdigest()

assert sha == manifest["migrations"][0]["sha256"]
assert hashlib.sha256(schema.encode("utf-8")).hexdigest() == manifest["canonical_schema_sha256"]
assert schema == migration
assert ids["strategy"] == "prefixed_uuidv7"
assert ids["rules"]["never_derive_id_from_pii"] is True
assert ids["rules"]["external_source_ids_are_not_primary_keys"] is True
assert permissions["default"] == "deny"
assert permissions["public_database_access"] is False
assert permissions["public_http_binding_required"] is False
assert permissions["runtime_dependency_from_public_site"] is False
assert "oracle.content.read" in permissions["roles"]["event_writer"]["forbidden"]
assert event_contract["$id"] == "maison-growth-event-v2"
assert event_contract["privacy_contract"]["paid_oracle_text_allowed"] is False
assert a1["runtime_isolation"]["public_site_dependency"] is False
assert a1["runtime_isolation"]["public_http_surface"] is False
assert a1["completion"]["a2_must_not_start_implicitly"] is True

con = sqlite3.connect(":memory:")
con.execute("PRAGMA foreign_keys = ON")
con.executescript(migration)

expected_tables = {
    "rule_versions", "model_versions", "events", "audit_log",
    "idempotency_registry", "schema_state",
}
tables = {
    row[0] for row in con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
}
assert tables == expected_tables

required_triggers = {
    "trg_audit_log_no_update", "trg_audit_log_no_delete",
    "trg_rule_versions_no_update", "trg_rule_versions_no_delete",
    "trg_model_versions_no_update", "trg_model_versions_no_delete",
    "trg_events_no_update", "trg_events_no_delete",
    "trg_idempotency_registry_no_update", "trg_idempotency_registry_no_delete",
}
triggers = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='trigger'")}
assert required_triggers <= triggers

sample = {
    "rule": "rul_0199d4c8-8e2b-7a11-8b22-112233445566",
    "model": "mdl_0199d4c8-8e2b-7a11-8b22-223344556677",
    "event": "evt_0199d4c8-8e2b-7a11-8b22-334455667788",
    "event2": "evt_0199d4c8-8e2b-7a11-8b22-334455667799",
    "audit": "aud_0199d4c8-8e2b-7a11-8b22-445566778899",
    "journey": "jrn_0199d4c8-8e2b-7a11-8b22-556677889900",
}
uuid7 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
for value in sample.values():
    assert uuid7.match(value.split("_", 1)[1])

ha, hb = "a" * 64, "b" * 64
con.execute(
    """INSERT INTO rule_versions
       (rule_version_id,family,version_label,definition_hash,definition_json,created_at,created_by)
       VALUES (?,?,?,?,?,?,?)""",
    (sample["rule"], "ocean-promotion", "2026.1", ha, '{"threshold":85}',
     "2026-09-17T03:00:00Z", "validator"),
)
con.execute(
    "INSERT INTO model_versions VALUES (?,?,?,?,?,?,?,?,?)",
    (sample["model"], "openai", "example-model", "test", hb, '{"temperature":0}',
     "2026-09-17T03:00:00Z", "validator", None),
)
con.execute(
    """INSERT INTO events
       (event_id,idempotency_key,event_type,source,schema_version,occurred_at,journey_id,
        value_minor,currency,privacy_class,payload_hash,metadata_json,rule_version_id,model_version_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    (sample["event"], "site:test:001", "page.view", "site", 2,
     "2026-09-17T03:01:00Z", sample["journey"], 200, "EUR", "pseudonymous",
     ha, '{"path":"/"}', sample["rule"], sample["model"]),
)

expect_error(lambda: con.execute(
    "INSERT INTO events (event_id,idempotency_key,event_type,source,occurred_at,payload_hash) VALUES (?,?,?,?,?,?)",
    (sample["event2"], "site:test:001", "page.view", "site", "2026-09-17T03:02:00Z", hb),
), "event idempotency")
expect_error(lambda: con.execute(
    "INSERT INTO events (event_id,idempotency_key,event_type,source,occurred_at,payload_hash) VALUES (?,?,?,?,?,?)",
    ("evt_bad", "site:test:002", "page.view", "site", "2026-09-17T03:02:00Z", hb),
), "stable id constraint")
expect_error(lambda: con.execute(
    "INSERT INTO events (event_id,idempotency_key,event_type,source,occurred_at,payload_hash) VALUES (?,?,?,?,?,?)",
    (sample["event2"], "site:test:003", "Page View", "site", "2026-09-17T03:02:00Z", hb),
), "event type constraint")

con.execute(
    "INSERT INTO idempotency_registry(scope,idempotency_key,object_type,object_id,payload_hash) VALUES (?,?,?,?,?)",
    ("events", "site:test:001", "event", sample["event"], ha),
)
con.execute(
    """INSERT INTO audit_log
       (audit_id,idempotency_key,actor_type,actor_id,component,action,object_type,object_id,
        after_json,reason,evidence_json,rule_version_id,model_version_id,correlation_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    (sample["audit"], "audit:test:001", "component", "validator", "a1-validator",
     "foundation.tested", "event", sample["event"], '{"ok":true}', "A1 validation",
     '["local-sqlite"]', sample["rule"], sample["model"], "corr:test:001"),
)

for table, key_col, key in [
    ("events", "event_id", sample["event"]),
    ("audit_log", "audit_id", sample["audit"]),
    ("rule_versions", "rule_version_id", sample["rule"]),
    ("model_versions", "model_version_id", sample["model"]),
    ("idempotency_registry", "scope", "events"),
]:
    expect_error(lambda t=table, c=key_col, k=key: con.execute(
        f"UPDATE {t} SET {c}={c} WHERE {c}=?", (k,)
    ), f"{table} update immutability")
    expect_error(lambda t=table, c=key_col, k=key: con.execute(
        f"DELETE FROM {t} WHERE {c}=?", (k,)
    ), f"{table} delete immutability")

assert list(con.execute("PRAGMA foreign_key_check")) == []
assert con.execute(
    "SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_schema_version'"
).fetchone() == ("A1.1",)

print("A1 Data Foundation contracts: OK")
