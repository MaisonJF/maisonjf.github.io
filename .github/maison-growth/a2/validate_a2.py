#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
A1 = HERE.parent / "a1"
A0 = HERE.parent


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


a2 = load(HERE / "a2-contract.json")
permissions = load(HERE / "collector-permissions.json")
sources = load(HERE / "source-registry.json")
retry = load(HERE / "retry-policy.json")
ingestion = load(HERE / "ingestion-contract-v1.json")
a1_permissions = load(A1 / "data-permissions.json")
a1_events = load(A1 / "event-contract-v2.json")
a0_paths = load(A0 / "path-policy.json")

assert a2["contract_version"] == "A2.1"
assert a2["runtime_isolation"]["public_site_dependency"] is False
assert a2["runtime_isolation"]["public_site_write"] is False
assert a2["runtime_isolation"]["cloudflare_worker_required_now"] is False
assert a2["runtime_isolation"]["queue_required_now"] is False
assert a2["runtime_isolation"]["d1_required_now"] is False
assert a2["completion"]["a3_must_not_start_implicitly"] is True

assert permissions["default"] == "deny"
assert permissions["public_site_write"] is False
assert permissions["public_runtime_dependency"] is False
assert permissions["public_http_endpoint_provisioned"] is False
assert permissions["cloudflare_resources_provisioned"] is False
for role in permissions["roles"].values():
    assert "public_site.write" in role["forbidden"]
    assert "repository.write" in role["forbidden"]
assert "oracle.content.read" in permissions["roles"]["collector_ingest"]["forbidden"]
assert "commercial_pii.read" in permissions["roles"]["collector_ingest"]["forbidden"]
assert "dead_letter.store_raw_rejected_payload" in permissions["roles"]["collector_failure_handler"]["forbidden"]

assert sources["default"] == "deny"
assert sources["unknown_sources"] == "reject"
assert "oracle" in sources["sources"]
assert "oracle_response" not in sources["sources"]["oracle"]["metadata"]
assert "query_text" not in sources["sources"]["gsc"]["metadata"]
assert "query_text" not in sources["sources"]["bing"]["metadata"]
assert "email" not in sources["sources"]["commerce"]["metadata"]

assert ingestion["properties"]["contract_version"]["const"] == 1
assert ingestion["normalization"]["output_schema_version"] == 2
assert a1_events["$id"] == "maison-growth-event-v2"
assert a1_events["privacy_contract"]["paid_oracle_text_allowed"] is False
assert a1_permissions["default"] == "deny"
assert a1_permissions["separation"]["commercial_pii"] == "outside_growth_analytics_store"

assert retry["default"] == "no_retry"
assert retry["categories"]["privacy_violation"]["retry"] is False
assert retry["categories"]["validation_error"]["retry"] is False
assert retry["categories"]["unsupported_contract_version"]["retry"] is False
assert retry["categories"]["idempotency_conflict"]["retry"] is False
assert retry["categories"]["transient_storage_error"]["retry"] is True
assert retry["categories"]["transient_storage_error"]["after_exhaustion"] == "dead_letter_validated_event"

assert a0_paths["default"] == "deny"

required = [
    "collector.py", "ingestion-contract-v1.json", "source-registry.json",
    "collector-permissions.json", "retry-policy.json", "test_event_collector.py",
]
for name in required:
    assert (HERE / name).exists(), name

proc = subprocess.run(
    [sys.executable, str(HERE / "test_event_collector.py")],
    cwd=str(HERE),
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)
print(proc.stdout, end="")
if proc.returncode:
    raise SystemExit(proc.returncode)

print("A2 Event Collector contracts: OK")
