#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


baseline = load("baseline.json")
policy = load("path-policy.json")
permissions = load("permissions.json")
event = load("event-contract-v1.json")

assert baseline["runtime_contract"]["growth_engine_is_noncritical"] is True
assert baseline["runtime_contract"]["public_runtime_must_not_depend_on_growth"] is True
assert baseline["runtime_contract"]["growth_outage_must_not_break_public_maison"] is True
assert baseline["runtime_contract"]["publisher_gateway_is_only_future_public_write_path"] is True

assert policy["default_repo_write"] == "deny"
assert policy["precedence"] == "deny_overrides_allow"

protected = set(policy["protected_paths"])
for required in [
    ".github/workflows/**",
    "_redirects",
    "functions/api/**",
    "functions/_lib/**",
]:
    assert required in protected, f"missing protected path: {required}"

for component, cfg in permissions["components"].items():
    if component != "publisher_gateway":
        assert cfg.get("repo_write") is False, f"{component} unexpectedly has repo write"

publisher = permissions["components"]["publisher_gateway"]
assert publisher["repo_write"] is True
assert publisher["default"] == "deny"

oracle = permissions["oracle_separation"]
assert oracle["growth_permission"] == "oracle.analytics.read"
assert oracle["forbidden_permission"] == "oracle.content.read"
assert "paid_reading_body" in oracle["forbidden_data"]
assert "paid_answer_text" in oracle["forbidden_data"]

cta = policy["actions"]["cta_experiment"]
assert cta["requires_snapshot"] is True
assert cta["requires_rollback_plan"] is True
for forbidden in ["price", "checkout", "product_definition", "paid_content"]:
    assert forbidden in cta["may_not_change"]

ocean = policy["actions"]["ocean_promotion"]
assert ocean["requires_hard_gates_pass"] is True
assert ocean["requires_evidence_sources_min"] >= 2
assert ocean["requires_oceans_guard_pass"] is True
assert ocean["may_not_modify_existing_content"] is True

assert event["privacy_contract"]["direct_pii_in_event_envelope"] is False
assert event["privacy_contract"]["paid_oracle_text_allowed"] is False

print("A0 contracts: OK")
