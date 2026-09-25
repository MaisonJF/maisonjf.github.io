#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


contract = json.loads((HERE / "content-distribution-contract.json").read_text(encoding="utf-8"))
feedback = json.loads((HERE / "performance-feedback-contract.json").read_text(encoding="utf-8"))
ontology = (ROOT / "functions/_lib/maison-content-ontology.js").read_text(encoding="utf-8")
event_contract = json.loads((ROOT / ".github/maison-growth/a1/event-contract-v2.json").read_text(encoding="utf-8"))
source_registry = json.loads((ROOT / ".github/maison-growth/a2/source-registry.json").read_text(encoding="utf-8"))
handoff = json.loads((HERE / "brain-feedback-handoff.json").read_text(encoding="utf-8"))

require(contract["canonical_intelligence_owner"] == "Maison Brain", "Brain ownership drift")
require(contract["derived_artifacts_only"] is True, "content artifacts must stay derived")
require(contract["principles"]["human_editorial_review_required"] is True, "human editorial gate required")
require(contract["principles"]["automatic_publication"] is False, "automatic publication must stay disabled")
require(contract["principles"]["automatic_scheduling"] is False, "automatic scheduling must stay disabled")
require(contract["principles"]["no_combined_content_score"] is True, "combined content score prohibited")
require(contract["publish_boundary"]["this_module_can_publish"] is False, "content river must not publish")

require("João escreve. Brain pensa. MAISON fala." in ontology, "canonical public voice principle missing")
require("Avoid em dash and en dash in public prose." in ontology, "canonical public dash rule missing")
require("'posts','stories','reels','video_scripts','captions','cta'" in ontology, "social public voice scope missing")

require(event_contract["$id"] == "maison-growth-event-v2", "A1 v2 event envelope drift")
require("aggregated" in event_contract["properties"]["privacy_class"]["enum"], "aggregated privacy class unavailable")
source = source_registry["sources"].get("maison-content-distribution")
require(source is not None, "content distribution source must be allowlisted in A2")
require(source["privacy_class"] == ["aggregated"], "content distribution must remain aggregate-only")
require(source["allowed_event_prefixes"] == ["content."], "content distribution event prefix drift")
require("completion_rate_bps" in source["metadata"], "A2 content rate contract missing")

require(feedback["event_type"] == "content.performance_observed", "feedback event type drift")
require(feedback["rules"]["a2_allowlist_required"] is True, "A2 convergence gate required")
require(feedback["rules"]["rates_are_integer_basis_points"] is True, "content rates must remain integer bps")
require(feedback["rules"]["no_cross_platform_score"] is True, "cross-platform score must remain prohibited")
require(feedback["rules"]["no_revenue_inference_from_engagement"] is True, "engagement cannot imply revenue")
require(handoff["storage"] == "none", "Brain handoff must remain stateless")
require(handoff["downstream_mapping_required"]["automatic_confidence_mutation_required"] is False, "content metrics cannot auto-mutate confidence")
require("A11_schema_mutation" in handoff["prohibited_here"], "A11 schema ownership boundary missing")

print("RIO CONTEUDO DISTRIBUICAO: contracts OK")
