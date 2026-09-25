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
if "sos." not in sources["sos_product"].get("allowed_event_prefixes",[]):
    fail("A2 SOS aggregate events missing")

a11=(ROOT/".github/maison-growth/a11/engine.py").read_text(encoding="utf-8")
if '"content"' not in a11:
    fail("A11 content handoff missing")

run("bash",".github/maison-growth/brain/rebuild_commercial_context.sh","--check")
run(sys.executable,".github/maison-growth/brain/test_schema_chain.py")
run(sys.executable,".github/maison-growth/a2/test_event_collector.py")
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
