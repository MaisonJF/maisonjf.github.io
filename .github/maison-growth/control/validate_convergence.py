#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FAILURES: list[str] = []
WARNINGS: list[str] = []
PASSES: list[str] = []


def read(rel: str) -> str:
    path = ROOT / rel
    return path.read_text(encoding="utf-8") if path.exists() else ""


def fail(message: str) -> None:
    FAILURES.append(message)


def warn(message: str) -> None:
    WARNINGS.append(message)


def ok(message: str) -> None:
    PASSES.append(message)


# 1) A generated artefact that has a --check contract must actually exist.
kg_builder_rel = ".github/maison-growth/brain/build_maison_knowledge_graph.mjs"
kg_generated_rel = ".github/maison-growth/brain/maison-knowledge-graph.generated.json"
kg_builder = read(kg_builder_rel)
kg_generated = ROOT / kg_generated_rel
if kg_builder:
    if "--check" in kg_builder:
        if not kg_generated.exists():
            fail(f"{kg_generated_rel} is required by the builder --check contract but is not tracked")
        else:
            ok("Knowledge Graph generated artefact is present")
    else:
        warn("Knowledge Graph builder exists without an explicit --check freshness contract")

# 2) Producer -> consumer: confirmed Stripe purchases must be recognised by A3.
commerce_writer = read("functions/_lib/commerce-events.js")
a3 = read(".github/maison-growth/a3/journey_engine.py")
purchase_event = "commerce.purchase_confirmed"
if purchase_event in commerce_writer:
    if purchase_event not in a3:
        fail(f"{purchase_event} is produced by the Stripe commerce writer but is not consumed as an A3 conversion")
    else:
        ok("Stripe confirmed-purchase event reaches the A3 conversion vocabulary")

# 3) Optional river contracts must converge into the central registry/learning owner.
registry_rel = ".github/maison-growth/a2/source-registry.json"
registry_text = read(registry_rel)
registry = json.loads(registry_text) if registry_text else {"sources": {}}
sources = registry.get("sources", {})

content_handoff = ROOT / ".github/maison-growth/content-distribution/brain-feedback-handoff.json"
if content_handoff.exists():
    if "maison-content-distribution" not in sources:
        fail("Content Distribution exists but its A2 source is absent from the canonical source registry")
    a11 = read(".github/maison-growth/a11/engine.py")
    if re.search(r"source_kind[^\n]+content", a11) is None and '"content"' not in a11 and "'content'" not in a11:
        fail("Content Distribution hands off to central learning but A11 does not accept content source_kind")
    else:
        ok("Content Distribution has an A2/A11 convergence path")

sos_contract = ROOT / ".github/maison-product/sos/brain-signal-contract.json"
if sos_contract.exists():
    if "sos_product" not in sources:
        fail("SOS Brain signal contract exists but sos_product is absent from the canonical A2 source registry")
    else:
        ok("SOS aggregate signals have a canonical A2 source")

b2b_ready = ROOT / ".github/maison-growth/b2b/B2B-READINESS.md"
if b2b_ready.exists():
    if "b2b-offer-brain.js" not in kg_builder or "professional" not in kg_builder:
        fail("B2B readiness exists but the canonical Knowledge Graph builder does not compose the professional domain")
    else:
        ok("B2B professional domain is composed into the canonical Knowledge Graph")

discovery_builder = ROOT / ".github/maison-growth/brain/build_public_discovery.mjs"
if discovery_builder.exists():
    mcp = read(".github/maison-growth/brain/brain_mcp_server.py")
    rebuild = read(".github/maison-growth/brain/rebuild_commercial_context.sh")
    if "buildPublicDiscovery" not in kg_builder:
        fail("Public discovery projection exists but is not composed into the canonical Knowledge Graph builder")
    if "maison_public_discovery_search" not in mcp:
        fail("Public discovery projection exists but Brain MCP has no read-only discovery consumer")

    check_match = re.search(r"--check\)(.*?);;", rebuild, re.S)
    if check_match:
        check_body = check_match.group(1)
        mutating_lines = []
        for raw in check_body.splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if ("build_public_discovery.mjs" in line or "build_maison_knowledge_graph.mjs" in line) and "--check" not in line:
                mutating_lines.append(line)
        if mutating_lines:
            fail("rebuild_commercial_context.sh --check mutates derived artefacts before checking freshness: " + " | ".join(mutating_lines))
        else:
            ok("Derived-context --check path is non-mutating for public discovery / Knowledge Graph")

# 4) Inventory direct production writes to canonical A1 events.
direct_writers: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix not in {".js", ".mjs", ".py"}:
        continue
    rel = path.relative_to(ROOT).as_posix()
    lower = rel.lower()
    if "/test" in lower or lower.startswith("test") or "/migrations/" in lower or "/fixtures/" in lower:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    if re.search(r"INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+events\b", text, re.I):
        direct_writers.append(rel)

known_boundaries = {
    ".github/maison-growth/a2/collector.py",
    "workers/maison-intelligence/src/index.js",
}
unexpected = sorted(set(direct_writers) - known_boundaries)
if unexpected:
    warn("Direct A1 event writers outside the currently recognised ingestion boundaries: " + ", ".join(unexpected))
else:
    ok("No unexpected direct production writers into canonical A1 events")

# 5) Flag brittle structural counts. These are informational until Architecture replaces them.
for rel in [
    ".github/maison-growth/vault/validate_pdi_registry.mjs",
    ".github/maison-growth/brain/test_digital_experience_coverage.py",
]:
    text = read(rel)
    if not text:
        continue
    if re.search(r"(signals\.length|sourceThemes|registered|summary\[[\"']oceans[\"']\])\s*[,=)]\s*\d+", text):
        warn(f"{rel} appears to contain hard-coded structural counts; derive expectations from canonical sources where possible")

print("MAISON CONVERGENCE AUDIT")
print("=" * 72)
for message in PASSES:
    print(f"PASS  {message}")
for message in WARNINGS:
    print(f"WARN  {message}")
for message in FAILURES:
    print(f"FAIL  {message}")
print("-" * 72)
print(json.dumps({
    "passes": len(PASSES),
    "warnings": len(WARNINGS),
    "failures": len(FAILURES),
    "enforcement": "--enforce" in sys.argv,
}, sort_keys=True))

if "--enforce" in sys.argv and FAILURES:
    raise SystemExit(1)
