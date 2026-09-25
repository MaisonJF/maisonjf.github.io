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
ops = json.loads((HERE / "operating-system-contract.json").read_text(encoding="utf-8"))
authoring = json.loads((HERE / "authoring-contract.json").read_text(encoding="utf-8"))
manual_distribution = json.loads((HERE / "manual-distribution-contract.json").read_text(encoding="utf-8"))
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
for lineage_key in ("campaign_id", "thesis_id", "comparison_id", "comparison_dimension", "variant_key"):
    require(lineage_key in source["metadata"], f"A2 content lineage missing: {lineage_key}")
for distribution_key in ("channel", "platform", "surface", "format"):
    require(distribution_key in source["metadata"], f"A2 content distribution dimension missing: {distribution_key}")

require(feedback["event_type"] == "content.performance_observed", "feedback event type drift")
require(feedback["rules"]["a2_allowlist_required"] is True, "A2 convergence gate required")
require(feedback["rules"]["rates_are_integer_basis_points"] is True, "content rates must remain integer bps")
require(feedback["rules"]["platform_and_surface_derived_from_channel"] is True, "platform/surface must derive from channel")
require(feedback["rules"]["channel_must_match_format"] is True, "channel-format consistency gate missing")
require(feedback["rules"]["no_cross_platform_score"] is True, "cross-platform score must remain prohibited")
require(feedback["rules"]["no_revenue_inference_from_engagement"] is True, "engagement cannot imply revenue")
require(feedback["rules"]["comparison_causal_claim"] is False, "content comparison cannot claim causality")
require(feedback["rules"]["automatic_comparison_winner"] is False, "content comparison cannot auto-select a winner")

require(ops["canonical_intelligence_owner"] == "Maison Brain", "Content OS Brain ownership drift")
require(ops["campaigns_are"] == "derived execution containers", "campaigns must remain derived")
require(ops["comparison_rules"]["change_one_dimension_at_a_time"] is True, "content comparisons must isolate one variable")
require(ops["comparison_rules"]["commercial_destination_routing_owned_by_A8"] is True, "commercial CTA routing must remain A8-owned")
require(ops["comparison_rules"]["same_channel_required_for_hook_and_cta"] is True, "hook/CTA comparisons must stay on one channel")
require(ops["comparison_rules"]["same_platform_required_for_format"] is True, "format comparisons must stay on one platform")
require(ops["comparison_rules"]["cross_platform_comparison_forbidden"] is True, "cross-platform comparisons must remain forbidden")
require(ops["comparison_rules"]["causal_claim"] is False, "observational content comparisons cannot claim causality")
require(ops["comparison_rules"]["automatic_promotion"] is False, "content comparison cannot auto-promote")
require(ops["cadence_rules"]["automatic_publication"] is False, "Content OS must not publish")
require(ops["learning_rules"]["platforms_not_collapsed_into_one_score"] is True, "cross-platform content score prohibited")

require(authoring["voice_owner"] == "functions/_lib/maison-content-ontology.js", "authoring must reuse canonical public voice")
require(authoring["canonical_intelligence_owner"] == "Maison Brain", "authoring Brain ownership drift")
require(authoring["principles"]["joao_is_public_voice"] is True, "João public voice rule missing")
require(authoring["principles"]["brain_engine_language_stays_internal"] is True, "engine language must remain internal")
require(authoring["principles"]["human_review_required"] is True, "authoring human review gate required")
require(authoring["principles"]["approval_is_per_piece"] is True, "authoring approval must be per piece")
require(authoring["principles"]["automatic_publication"] is False, "authoring layer must not publish")
require(authoring["approval_boundary"]["approval_does_not_publish"] is True, "approval cannot imply publication")

require(manual_distribution["mode"] == "package_only", "manual distribution must remain package-only")
require(manual_distribution["execution"]["manual_operator_required"] is True, "manual distribution needs an operator")
require(manual_distribution["execution"]["external_api_call"] is False, "distribution module must not call social APIs")
require(manual_distribution["execution"]["automatic_scheduling"] is False, "distribution module must not auto-schedule")
require(manual_distribution["execution"]["automatic_publication"] is False, "distribution module must not auto-publish")
require(manual_distribution["site_editorial_exception"]["public_site_write_remains_A9_governed"] is True, "site editorial publishing must remain A9-governed")
require(handoff["storage"] == "none", "Brain handoff must remain stateless")
require(handoff["downstream_mapping_required"]["automatic_confidence_mutation_required"] is False, "content metrics cannot auto-mutate confidence")
require("A11_schema_mutation" in handoff["prohibited_here"], "A11 schema ownership boundary missing")

print("RIO CONTEUDO DISTRIBUICAO: contracts OK")
