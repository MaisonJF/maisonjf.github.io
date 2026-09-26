#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
FAILURES=[]
WARNINGS=[]
PASSES=[]

def read(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8",errors="ignore") if p.exists() else ""

def load(rel):
    try:
        return json.loads(read(rel))
    except Exception as exc:
        FAILURES.append(f"{rel} invalid or missing: {exc}")
        return {}

def ok(msg): PASSES.append(msg)
def warn(msg): WARNINGS.append(msg)
def fail(msg): FAILURES.append(msg)

policy=load(".github/maison-growth/brain/derived-artifacts-policy.json")
for item in policy.get("derived_artifacts",[]):
    rel=str(item.get("path") or "")
    builder=str(item.get("builder") or "")
    if item.get("policy")=="generated_and_committed" and not (ROOT/rel).exists():
        fail("missing committed derived artifact: "+rel)
    if builder and not (ROOT/builder).exists():
        fail("missing derived builder: "+builder)
if not FAILURES:
    ok("Derived-artifact policy resolves to current builders and artifacts")

rebuild=read(".github/maison-growth/brain/rebuild_commercial_context.sh")
m=re.search(r"--check\)(.*?);;",rebuild,re.S)
if not m:
    fail("derived-context --check block missing")
else:
    mutating=[]
    for raw in m.group(1).splitlines():
        line=raw.strip()
        if not line or line.startswith("#") or "ocean_universal_coverage.py" in line:
            continue
        if "build_" in line and (".mjs" in line or ".py" in line) and "--check" not in line and "--validate" not in line:
            mutating.append(line)
    if mutating:
        fail("derived-context check mutates before validating: "+" | ".join(mutating))
    else:
        ok("Derived-context check path is non-mutating")

registry=load(".github/maison-growth/a2/source-registry.json")
sources=registry.get("sources",{})
for source in ("site","commerce","maison-content-distribution","sos_product","system"):
    if source not in sources:
        fail("canonical A2 source missing: "+source)
if all(x in sources for x in ("commerce","maison-content-distribution","sos_product")):
    ok("B2B, Content and SOS share the canonical A2 registry")

a2=load(".github/maison-growth/a2/collector-permissions.json")
if a2.get("private_http_endpoint_implemented") is True and a2.get("private_http_default_enabled") is False:
    ok("Canonical A2 private runtime is implemented and disabled by default")
else:
    fail("A2 private runtime boundary is incomplete or enabled by default")

a11=load(".github/maison-growth/a11/a11-contract.json")
pa=a11.get("private_runtime",{})
if pa.get("implemented") is True and pa.get("write_default_enabled") is False:
    ok("A11 append-only private runtime is implemented and disabled by default")
else:
    fail("A11 private runtime boundary is incomplete or enabled by default")
if a11.get("content_economics_owner")!="A3" or a11.get("content_engagement_can_mutate_economic_confidence") is not False:
    fail("A11 Content economics boundary drift")
else:
    ok("Content engagement cannot manufacture economic confidence")

graph=load(".github/maison-growth/brain/maison-knowledge-graph.generated.json")
professional=graph.get("professional")
if not isinstance(professional,dict):
    fail("canonical Knowledge Graph missing B2B professional projection")
else:
    ok("B2B professional domain is composed into the canonical Knowledge Graph")

contact=read("contacto/index.html")
pro_test=read("profissionais/teste/index.html")
if "emitCanonicalB2BLead" in contact and "withB2bContext" in pro_test:
    ok("Real professional journey produces canonical B2B lead context")
else:
    fail("B2B public surface is not wired to canonical lead ingestion")

commerce=read("functions/_lib/commerce-events.js")
if "stripe_session_id" in commerce:
    fail("Stripe raw session identifier is still present in Growth analytics writer")
elif all(x in commerce for x in ("stripe_session_ref_hash","legacyIdempotencyKey","'pseudonymous'")):
    ok("Stripe analytics identity is pseudonymised with legacy dedupe compatibility")
else:
    fail("Stripe privacy/idempotency contract is incomplete")

health=".github/maison-growth/brain/validate_global_health_gate.py"
workflow_text="\n".join(
    p.read_text(encoding="utf-8",errors="ignore")
    for p in (ROOT/".github/workflows").glob("*.y*ml")
)
if (ROOT/health).exists() and "validate_global_health_gate.py" in workflow_text:
    ok("Global Health Gate is wired into GitHub Actions")
else:
    fail("Global Health Gate is missing or unwired")

direct=[]
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix not in {".js",".mjs",".py"}:
        continue
    rel=path.relative_to(ROOT).as_posix()
    lower=rel.lower()
    name=path.name.lower()
    if "/test" in lower or name.startswith("test_") or name.startswith("validate_") or "/migrations/" in lower or "/fixtures/" in lower:
        continue
    body=path.read_text(encoding="utf-8",errors="ignore")
    if re.search(r"INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+events\b",body,re.I):
        direct.append(rel)

known={
    ".github/maison-growth/a2/collector.py",
    "workers/maison-intelligence/src/a2_runtime.js",
    "workers/maison-intelligence/src/index.js",
    "functions/_lib/commerce-events.js",
}
unexpected=sorted(set(direct)-known)
if unexpected:
    warn("Direct A1 writers outside recognised boundaries: "+", ".join(unexpected))
else:
    ok("No unexpected direct production writers into canonical A1 events")

for rel in (
    ".github/maison-growth/vault/validate_pdi_registry.mjs",
    ".github/maison-growth/brain/test_digital_experience_coverage.py",
):
    body=read(rel)
    if body and (
        re.search(r"signals\.length\s*[,=)]\s*\d+",body)
        or re.search(r"registered\s*[,=)]\s*\d+",body)
    ):
        warn(rel+" may still contain a brittle structural count")

print("MAISON CONVERGENCE AUDIT")
print("="*72)
for msg in PASSES: print("PASS ",msg)
for msg in WARNINGS: print("WARN ",msg)
for msg in FAILURES: print("FAIL ",msg)
print("-"*72)
print(json.dumps({"passes":len(PASSES),"warnings":len(WARNINGS),"failures":len(FAILURES),"enforcement":"--enforce" in sys.argv},sort_keys=True))
if "--enforce" in sys.argv and FAILURES:
    raise SystemExit(1)
