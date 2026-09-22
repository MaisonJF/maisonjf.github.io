from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))

def ok(condition, message):
    if not condition:
        raise AssertionError(message)

contract = load("a13-contract.json")
registry = load("provider-registry.json")
memory = load("memory-contribution-contract.json")

ok(contract["contract_version"] == "A13.1", "wrong contract version")
ok(contract["mode"] == "repository_ready_runtime_disabled", "runtime must be disabled")
ok(contract["hard_boundaries"]["private_memory_scraping"] is False, "private memory scraping forbidden")
ok(contract["hard_boundaries"]["direct_pii_persistence"] is False, "direct PII forbidden")
ok(contract["hard_boundaries"]["external_output_can_publish"] is False, "external models may not publish")
ok(contract["runtime"]["external_network_enabled"] is False, "network must remain disabled in repository stage")
ok(contract["runtime"]["production_credentials_present"] is False, "credentials must not be present")
ok(registry["default_runtime_enabled"] is False, "providers deny by default")
ok(all(p["runtime_enabled"] is False for p in registry["providers"]), "provider unexpectedly enabled")
ok(all(p["private_memory_access"] is False for p in registry["providers"]), "private memory access forbidden")
ok(memory["required_values"]["user_selected_content"] is True, "memory must be user selected")
ok(memory["required_values"]["revocable"] is True, "memory contribution must be revocable")

result = subprocess.run(
    [sys.executable, "-m", "unittest", "test_a13.py", "-v"],
    cwd=HERE, text=True, capture_output=True
)
sys.stdout.write(result.stdout)
sys.stderr.write(result.stderr)
if result.returncode:
    raise SystemExit(result.returncode)

print("A13 contracts + tests: OK")
