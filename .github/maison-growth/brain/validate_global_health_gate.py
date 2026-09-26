#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
GROWTH=ROOT/".github/maison-growth"
BRAIN=GROWTH/"brain"

def fail(message:str)->None:
    raise SystemExit("GLOBAL_HEALTH_GATE: "+message)

def load_json(rel:str):
    try:
        return json.loads((ROOT/rel).read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid or missing JSON {rel}: {exc}")

def text(rel:str)->str:
    path=ROOT/rel
    if not path.exists():
        fail(f"missing required path: {rel}")
    return path.read_text(encoding="utf-8")

def run(*cmd:str)->None:
    proc=subprocess.run(cmd,cwd=ROOT,text=True)
    if proc.returncode:
        fail("failed: "+" ".join(cmd))

policy=load_json(".github/maison-growth/brain/derived-artifacts-policy.json")
if policy.get("integration_policy",{}).get("single_builder_required") is not True:
    fail("single Knowledge Graph builder policy missing")
if policy.get("integration_policy",{}).get("parallel_graphs_forbidden") is not True:
    fail("parallel Knowledge Graphs are not forbidden")
if policy.get("gate",{}).get("check_must_be_non_mutating") is not True:
    fail("derived-context check must be non-mutating")

for item in policy.get("derived_artifacts",[]):
    rel=str(item.get("path") or "")
    builder=str(item.get("builder") or "")
    mode=str(item.get("policy") or "")
    if not rel:
        fail("derived artifact entry missing path")
    if not builder or not (ROOT/builder).exists():
        fail("missing derived builder: "+builder)
    if mode=="generated_and_committed" and not (ROOT/rel).exists():
        fail("missing committed derived artifact: "+rel)
    if mode not in {"generated_and_committed","ephemeral_composed"}:
        fail("unsupported derived artifact policy: "+mode)
    if item.get("manual_edits")!="forbidden":
        fail("manual edits must be forbidden for derived artifact: "+rel)

builder=text(".github/maison-growth/brain/build_maison_knowledge_graph.mjs")
for token in (
    "functions/_lib/b2b-offer-brain.js",
    "professional:{",
    "publicDiscovery:{",
    "publicIdentity:{",
    "searchVisibility:{",
    "oceanThemes",
):
    if token not in builder:
        fail("canonical Knowledge Graph builder missing "+token)

graph=load_json(".github/maison-growth/brain/maison-knowledge-graph.generated.json")
professional=graph.get("professional")
if not isinstance(professional,dict):
    fail("generated Knowledge Graph missing professional projection")
lead_contract=professional.get("leadContract",{})
expected_b2b={"interest","origin","business","goal","gap","client","model","scale","start","result_type"}
if set(lead_contract.get("allowedNonPii",[]))!=expected_b2b:
    fail("Knowledge Graph B2B lead contract drift")
if set(lead_contract.get("forbidden",[]))!={"name","email","phone","free_text_message","health_data","client_identity"}:
    fail("Knowledge Graph B2B forbidden-field contract drift")

registry=load_json(".github/maison-growth/a2/source-registry.json")
sources=registry.get("sources",{})
for source in ("site","commerce","maison-content-distribution","sos_product","system"):
    if source not in sources:
        fail("A2 canonical source missing: "+source)
site_events=sources["site"].get("events",{})
for event_type in ("page.view","cta.click","navigation.click","offer.exposure","offer.click"):
    if event_type not in site_events:
        fail("A2 site event missing: "+event_type)
commerce_events=sources["commerce"].get("events",{})
for event_type in ("b2b.lead","b2b.proposal","b2b.pilot","b2b.purchase","b2b.recurrence"):
    if event_type not in commerce_events:
        fail("A2 B2B event missing: "+event_type)
if set(commerce_events["b2b.lead"].get("allowed_metadata",[]))!=expected_b2b:
    fail("A2 b2b.lead contract drift")
if "content." not in sources["maison-content-distribution"].get("allowed_event_prefixes",[]):
    fail("A2 Content source missing content.*")
if "sos." not in sources["sos_product"].get("allowed_event_prefixes",[]):
    fail("A2 SOS source missing sos.*")

a2_permissions=load_json(".github/maison-growth/a2/collector-permissions.json")
if a2_permissions.get("private_http_endpoint_implemented") is not True:
    fail("A2 private runtime not implemented")
if a2_permissions.get("private_http_default_enabled") is not False:
    fail("A2 private runtime must default disabled")
if a2_permissions.get("private_http_route")!="/internal/a2/ingest":
    fail("A2 private runtime route drift")

a11=load_json(".github/maison-growth/a11/a11-contract.json")
private_a11=a11.get("private_runtime",{})
if private_a11.get("implemented") is not True:
    fail("A11 private runtime not implemented")
if private_a11.get("write_default_enabled") is not False:
    fail("A11 private writer must default disabled")
if private_a11.get("write_route")!="/internal/a11/content-learning":
    fail("A11 private writer route drift")
if a11.get("content_economics_owner")!="A3":
    fail("A3 must own Content economics")
if a11.get("content_engagement_can_mutate_economic_confidence") is not False:
    fail("Content engagement cannot mutate economic confidence")

wrangler=text("workers/maison-intelligence/wrangler.jsonc")
for token in ('"A2_INGEST_API_ENABLED": "false"','"A11_LEARNING_WRITE_API_ENABLED": "false"'):
    if token not in wrangler:
        fail("private runtime default changed: "+token)

contact=text("contacto/index.html")
professional_test=text("profissionais/teste/index.html")
for token in ("emitCanonicalB2BLead","/api/b2b-lead","maison_analytics_consent_v1"):
    if token not in contact:
        fail("real B2B surface missing "+token)
for token in ("withB2bContext","url.searchParams.set('b2b_'+key,state[key])","url.searchParams.set('b2b_result',type)"):
    if token not in professional_test:
        fail("professional diagnostic context propagation missing "+token)

commerce=text("functions/_lib/commerce-events.js")
if "stripe_session_id" in commerce:
    fail("Stripe raw session identifier still stored in Growth analytics")
for token in ("stripe_session_ref_hash","sessionRefHash","'pseudonymous'","legacyIdempotencyKey"):
    if token not in commerce:
        fail("Stripe pseudonymous compatibility contract missing "+token)

rebuild=text(".github/maison-growth/brain/rebuild_commercial_context.sh")
match=re.search(r"--check\)(.*?);;",rebuild,re.S)
if not match:
    fail("derived-context --check block missing")
for raw in match.group(1).splitlines():
    line=raw.strip()
    if not line or line.startswith("#"):
        continue
    if "build_" in line and (".mjs" in line or ".py" in line):
        # ocean_universal_coverage is a read-only validator despite its historical name.
        if "ocean_universal_coverage.py" in line:
            continue
        if "--check" not in line:
            fail("derived-context --check mutates before checking: "+line)

run("bash",".github/maison-growth/brain/rebuild_commercial_context.sh","--check")
run(sys.executable,".github/maison-growth/brain/test_schema_chain.py")
run(sys.executable,".github/maison-growth/a2/validate_a2.py")
run(sys.executable,".github/maison-growth/a11/validate_a11.py")
run(sys.executable,".github/maison-growth/brain/validate_b2b_feedback_loop.py")
run("node",".github/maison-growth/brain/validate_b2b_knowledge_graph.mjs")
run(sys.executable,".github/maison-growth/content-distribution/validate_content_distribution.py")
run("node",".github/maison-product/sos/validate_sos.mjs")
run("node",".github/maison-growth/vault/validate_pdi_registry.mjs")

print("GLOBAL_HEALTH_GATE: OK · canonical graph, A2/A11 runtimes and cross-river feedback contracts are coherent")
