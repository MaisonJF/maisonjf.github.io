#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
A2=json.loads((ROOT/".github/maison-growth/a2/source-registry.json").read_text(encoding="utf-8"))
A3=(ROOT/".github/maison-growth/a3/journey_engine.py").read_text(encoding="utf-8")
SOLUTIONS=json.loads((ROOT/".github/maison-growth/a3/solution-contract.json").read_text(encoding="utf-8"))
COMMERCE=(ROOT/"functions/_lib/commerce-events.js").read_text(encoding="utf-8")
LEAD=(ROOT/"functions/api/b2b-lead.js").read_text(encoding="utf-8")
CONTROL=(ROOT/"workers/maison-intelligence/src/control_api.js").read_text(encoding="utf-8")
OBSERVE=(ROOT/".github/maison-growth/brain/brain_observe_cycle.py").read_text(encoding="utf-8")
B2B_VIEW=(ROOT/".github/maison-growth/brain/migrations/0018_b2b_feedback.sql").read_text(encoding="utf-8")
B2B_SEED=(ROOT/".github/maison-growth/a3/migrations/0017_b2b_canonical_solution.sql").read_text(encoding="utf-8")
CONTACT=(ROOT/"contacto/index.html").read_text(encoding="utf-8")
PRO_TEST=(ROOT/"profissionais/teste/index.html").read_text(encoding="utf-8")

commerce=A2["sources"]["commerce"]
lead_fields={"interest","origin","business","goal","gap","client","model","scale","start","result_type"}
forbidden={"name","email","phone","free_text_message","health_data","client_identity"}

assert "b2b." in commerce["allowed_event_prefixes"]
assert set(commerce["events"]["b2b.lead"]["allowed_metadata"]) == lead_fields
assert not (forbidden & set(commerce["events"]["b2b.lead"]["allowed_metadata"]))
for event_type in ("b2b.proposal","b2b.pilot","b2b.purchase","b2b.recurrence"):
    assert event_type in commerce["events"]

expected={
    '"b2b.lead": "lead"',
    '"b2b.proposal": "lead"',
    '"b2b.pilot": "booking"',
    '"b2b.purchase": "purchase"',
    '"b2b.recurrence": "order"',
}
for token in expected:
    assert token in A3

declared=set(SOLUTIONS["solution_types"]["b2b"]["conversion_event_types"])
assert {"b2b.lead","b2b.proposal","b2b.pilot","b2b.purchase","b2b.recurrence"} <= declared

for token in ("recordB2BEvent","B2B_SOLUTION_ID","pseudonymous","unsupported_b2b_metadata"):
    assert token in COMMERCE
for token in ("recordB2BEvent","eventType!=='b2b.lead'","GROWTH_DB"):
    assert token in LEAD
assert "free_text_message" not in LEAD
assert "customer_id" not in LEAD

for token in ("emitCanonicalB2BLead","/api/b2b-lead","maison_analytics_consent_v1","b2b_result"):
    assert token in CONTACT
assert "free_text_message" not in CONTACT
assert "message:" not in CONTACT.split("emitCanonicalB2BLead",1)[1]
assert "withB2bContext" in PRO_TEST
assert "const contextFields=['business','goal','gap','client','model','scale','start'];" in PRO_TEST
assert "url.searchParams.set('b2b_'+key,state[key])" in PRO_TEST
assert "url.searchParams.set('b2b_result',type)" in PRO_TEST

for token in ("brain_b2b_feedback","b2b.lead","b2b.recurrence","lifecycle_stage"):
    assert token in B2B_VIEW
for token in ("maison-b2b","catalog:service:b2b","sol_0199a4b2-7f00-7000-8000-000000000001"):
    assert token in B2B_SEED
assert "/internal/brain/b2b-feedback" in CONTROL
for token in ("client.b2b_feedback","_b2b_context_by_territory","b2b_feedback_rows"):
    assert token in OBSERVE

print("Canonical B2B feedback loop: OK")
