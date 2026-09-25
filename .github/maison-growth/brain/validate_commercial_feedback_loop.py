#!/usr/bin/env python3
"""Static end-to-end wiring guard for the MAISON commercial feedback loop."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]

def read(path):
    p=ROOT/path
    if not p.exists():
        raise SystemExit(f"commercial feedback wiring missing file: {path}")
    return p.read_text(encoding="utf-8")

checks={
    "browser emits offer interactions": (
        "analytics.js", ["'/api/offer-event'","offer.exposure","offer.click","trackOfferClick"]
    ),
    "collector persists canonical events": (
        "functions/api/offer-event.js", ["INSERT INTO events","offer.exposure","offer.click","privacy_class"]
    ),
    "A2 contract accepts offer family": (
        ".github/maison-growth/a2/source-registry.json", ['"offer."','"offer_id"','"recommendation_route"']
    ),
    "Stripe emits confirmed purchase": (
        "functions/_lib/commerce-events.js", ["commerce.purchase_confirmed","INSERT OR IGNORE INTO events"]
    ),
    "A3 recognizes confirmed purchase": (
        ".github/maison-growth/a3/journey_engine.py", ['"commerce.purchase_confirmed": "purchase"']
    ),
    "B2B public lead intake uses central commerce writer": (
        "functions/api/b2b-lead.js", ["recordB2BEvent","b2b.lead","GROWTH_DB"]
    ),
    "B2B commerce writer uses canonical solution": (
        "functions/_lib/commerce-events.js", ["recordB2BEvent","B2B_SOLUTION_ID","b2b.recurrence","pseudonymous"]
    ),
    "B2B lifecycle reuses central A3": (
        ".github/maison-growth/a3/journey_engine.py",
        ['"b2b.lead": "lead"','"b2b.proposal": "lead"','"b2b.pilot": "booking"','"b2b.purchase": "purchase"','"b2b.recurrence": "order"']
    ),
    "B2B solution contract declares lifecycle": (
        ".github/maison-growth/a3/solution-contract.json",
        ['"b2b.lead"','"b2b.proposal"','"b2b.pilot"','"b2b.purchase"','"b2b.recurrence"']
    ),
    "Brain exposes B2B lifecycle feedback": (
        ".github/maison-growth/brain/migrations/0018_b2b_feedback.sql",
        ["brain_b2b_feedback","b2b.lead","b2b.recurrence","lifecycle_stage"]
    ),
    "Brain control consumes B2B lifecycle": (
        ".github/maison-growth/brain/brain_observe_cycle.py",
        ["client.b2b_feedback","_b2b_context_by_territory","b2b_feedback_rows"]
    ),
    "A11 learns contextual offer funnel": (
        ".github/maison-growth/a11/engine.py", ["evaluate_offer_funnel","offer_context_key","confidence_before"]
    ),
    "Offer Brain consumes bounded learning": (
        "functions/_lib/offer-brain.js", ["boundedLearningAdjustment","learned_positive","learned_negative"]
    ),
    "recommend endpoint loads learning": (
        "functions/api/recommend-offers.js", ["loadOfferLearning","learning_records","recommendMaisonOffers(signal,learning)"]
    ),
}
failed=[]
for label,(path,tokens) in checks.items():
    text=read(path)
    missing=[token for token in tokens if token not in text]
    if missing: failed.append((label,path,missing))
if failed:
    for label,path,missing in failed:
        print(f"FAIL {label}: {path} missing {missing}")
    raise SystemExit(1)
print("Commercial feedback loop wiring is complete:")
for label in checks: print(" -",label)
