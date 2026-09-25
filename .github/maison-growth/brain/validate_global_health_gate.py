#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
BRAIN=ROOT/".github/maison-growth/brain"

def fail(message:str)->None:
    raise SystemExit("GLOBAL_HEALTH_GATE: "+message)

def run(*cmd:str)->None:
    proc=subprocess.run(cmd,cwd=ROOT,text=True)
    if proc.returncode:
        fail("failed: "+" ".join(cmd))

policy=json.loads((BRAIN/"derived-artifacts-policy.json").read_text(encoding="utf-8"))
experience=policy.get("experience_contract",{})
if experience.get("canonical_product_catalogue")!="data/products.js":
    fail("canonical product catalogue drift")
if experience.get("canonical_service_catalogue")!="data/services.js":
    fail("canonical service catalogue drift")
if experience.get("public_site_signal_contract")!=".github/maison-growth/a2/source-registry.json#sources.site":
    fail("canonical public-site signal contract drift")
if policy.get("integration_policy",{}).get("single_builder_required") is not True:
    fail("single Knowledge Graph builder policy missing")
if policy.get("integration_policy",{}).get("parallel_graphs_forbidden") is not True:
    fail("parallel Knowledge Graphs are not forbidden")

builder=(BRAIN/"build_maison_knowledge_graph.mjs").read_text(encoding="utf-8")
for token in ("single_canonical_builder","professionalProjection","discoveryProjection","oceanThemes"):
    if token not in builder:
        fail("canonical Knowledge Graph builder missing "+token)

registry=json.loads((ROOT/".github/maison-growth/a2/source-registry.json").read_text(encoding="utf-8"))
sources=registry.get("sources",{})
for source in ("site","commerce","maison-content-distribution","sos_product","system"):
    if source not in sources:
        fail("A2 canonical source missing: "+source)
if "offer." not in sources["site"].get("allowed_event_prefixes",[]):
    fail("A2 site offer events missing")
site_events=sources["site"].get("events",{})
for event_type in ("page.view","cta.click","navigation.click","offer.exposure","offer.click"):
    if event_type not in site_events:
        fail("A2 canonical site event missing: "+event_type)
if "content." not in sources["maison-content-distribution"].get("allowed_event_prefixes",[]):
    fail("A2 content performance events missing")
commerce_events=sources["commerce"].get("events",{})
for event_type in ("b2b.lead","b2b.proposal","b2b.pilot","b2b.purchase","b2b.recurrence"):
    if event_type not in commerce_events:
        fail("A2 canonical B2B event missing: "+event_type)
b2b_allowed=set(commerce_events["b2b.lead"].get("allowed_metadata",[]))
expected_b2b={"interest","origin","business","goal","gap","client","model","scale","start","result_type"}
if b2b_allowed!=expected_b2b:
    fail("A2 b2b.lead non-PII contract drift")
if "sos." not in sources["sos_product"].get("allowed_event_prefixes",[]):
    fail("A2 SOS aggregate events missing")

a3_contract=json.loads((ROOT/".github/maison-growth/a3/solution-contract.json").read_text(encoding="utf-8"))
b2b_contract=a3_contract.get("solution_types",{}).get("b2b",{})
expected_b2b_events={"b2b.order","b2b.lead","b2b.proposal","b2b.pilot","b2b.purchase","b2b.recurrence"}
if set(b2b_contract.get("conversion_event_types",[]))!=expected_b2b_events:
    fail("A3 B2B lifecycle contract drift")
expected_stage_mapping={
    "b2b.lead":"lead","b2b.proposal":"lead","b2b.pilot":"order",
    "b2b.order":"order","b2b.purchase":"purchase","b2b.recurrence":"purchase",
}
if b2b_contract.get("stage_mapping")!=expected_stage_mapping:
    fail("A3 B2B stable conversion-kind mapping drift")
seed=(ROOT/".github/maison-growth/a3/migrations/0017_b2b_canonical_solution.sql")
if not seed.exists() or "catalog:service:b2b" not in seed.read_text(encoding="utf-8"):
    fail("canonical A3 B2B solution mapping missing")

commerce_adapter=(ROOT/"functions/_lib/commerce-telemetry.js").read_text(encoding="utf-8")
for token in ("recordB2bLifecycleEvent","idempotency_registry","solution_key='b2b'","b2b.lead"):
    if token not in commerce_adapter:
        fail("central B2B commerce adapter missing "+token)
public_adapter=(ROOT/"functions/api/commerce-event.js").read_text(encoding="utf-8")
if "recordB2bLifecycleEvent" not in public_adapter or "b2b.lead" not in public_adapter:
    fail("public fail-open B2B lead adapter missing")
analytics=(ROOT/"analytics.js").read_text(encoding="utf-8")
if "recordCanonicalCommerceSignal" not in analytics or "/api/commerce-event" not in analytics:
    fail("B2B contact signal is not wired to central commerce telemetry")
brain_control=(ROOT/"workers/maison-intelligence/src/control_api.js").read_text(encoding="utf-8")
if "/internal/brain/b2b-feedback" not in brain_control or "brain_b2b_feedback" not in brain_control:
    fail("Brain B2B A3 feedback surface missing")

a11=(ROOT/".github/maison-growth/a11/engine.py").read_text(encoding="utf-8")
if '"content"' not in a11:
    fail("A11 content handoff missing")

run("bash",".github/maison-growth/brain/rebuild_commercial_context.sh","--check")
run(sys.executable,".github/maison-growth/brain/test_schema_chain.py")
run(sys.executable,".github/maison-growth/a2/test_event_collector.py")
run(sys.executable,".github/maison-growth/a3/validate_a3.py")
run("node","--test","functions/_lib/commerce-telemetry.test.mjs")
run(sys.executable,".github/maison-growth/a11/test_a11.py")
run(sys.executable,".github/maison-growth/brain/validate_commercial_feedback_loop.py")
run("node",".github/maison-growth/vault/validate_pdi_registry.mjs")

optional=[
    (BRAIN/"validate_b2b_knowledge_graph.mjs",("node",".github/maison-growth/brain/validate_b2b_knowledge_graph.mjs")),
    (BRAIN/"build_public_discovery.mjs",("node",".github/maison-growth/brain/build_public_discovery.mjs","--check")),
    (ROOT/".github/maison-growth/content-distribution/validate_content_distribution.py",(sys.executable,".github/maison-growth/content-distribution/validate_content_distribution.py")),
]
for path,cmd in optional:
    if path.exists():
        run(*cmd)

print("GLOBAL_HEALTH_GATE: OK · central contracts, derived context and learning chain are coherent")
