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
        "functions/_lib/commerce-events.js", ["commerce.purchase_confirmed","INSERT INTO events"]
    ),
    "A3 recognizes confirmed purchase": (
        ".github/maison-growth/a3/journey_engine.py", ['"commerce.purchase_confirmed": "purchase"']
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
