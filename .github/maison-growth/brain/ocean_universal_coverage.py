#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping

ROOT=Path(__file__).resolve().parent
GRAPH=ROOT/"maison-knowledge-graph.generated.json"
CANDIDATES=ROOT.parent/"oceans"/"candidates.json"

# Canonical MAISON organs. This is capability routing, not a claim that every
# Ocean belongs in every organ. A consumer decides relevance from the graph.
ORGANS={
    "brain":{"contract":"knowledge_graph","mode":"context"},
    "content_distribution":{"contract":"editorial_candidates","mode":"relevance"},
    "seo_geo_discovery":{"contract":"knowledge_graph","mode":"relevance"},
    "digital_products":{"contract":"editorial_candidates","mode":"relevance"},
    "physical_products":{"contract":"commercial_context","mode":"relevance"},
    "services_experiences":{"contract":"commercial_context","mode":"relevance"},
    "b2b_professionals":{"contract":"knowledge_graph","mode":"relevance"},
    "site_conversion":{"contract":"knowledge_graph","mode":"relevance"},
    "bundles_offers":{"contract":"commercial_context","mode":"relevance"},
    "future_products":{"contract":"knowledge_graph","mode":"relevance"},
    "maison_internal_growth":{"contract":"knowledge_graph","mode":"internal_relevance"},
    "founder_personal_growth":{"contract":"knowledge_graph","mode":"private_opt_in_context"},
}

def _rows(payload: Any) -> list[Mapping[str,Any]]:
    if isinstance(payload,list):
        return [x for x in payload if isinstance(x,Mapping)]
    if isinstance(payload,Mapping):
        return [x for x in payload.get("candidates",[]) if isinstance(x,Mapping)]
    return []

def _id(row: Mapping[str,Any]) -> str:
    return str(row.get("id") or row.get("slug") or row.get("territory") or "").strip()

def build_contract() -> dict[str,Any]:
    candidates=_rows(json.loads(CANDIDATES.read_text(encoding="utf-8")))
    graph=json.loads(GRAPH.read_text(encoding="utf-8"))
    canonical=[_id(x) for x in candidates if _id(x)]
    graph_ids=[str(x.get("id") or "").strip() for x in graph.get("oceans",[]) if isinstance(x,Mapping)]
    graph_ids=[x for x in graph_ids if x]
    canonical_set=set(canonical)
    graph_set=set(graph_ids)
    missing=sorted(canonical_set-graph_set)
    orphaned=sorted(graph_set-canonical_set)
    duplicate_canonical=len(canonical)!=len(canonical_set)
    duplicate_graph=len(graph_ids)!=len(graph_set)

    return {
        "schema_version":"ocean_universal_coverage_v2",
        "kind":"maison_ocean_capability_contract",
        "mode":"derived_at_read_time",
        "principle":"Every canonical Ocean is addressable by every MAISON organ through shared contracts; relevance is decided downstream and is never forced.",
        "contract":{
            "open_cardinality":True,
            "fixed_ocean_count_forbidden":True,
            "all_canonical_oceans_must_reach_knowledge_graph":True,
            "organ_access_is_capability_not_forced_relevance":True,
            "no_automatic_publication":True,
            "no_automatic_commercial_execution":True,
            "no_private_or_paid_bodies":True,
        },
        "organs":ORGANS,
        "growth_layers":{
            "maison_internal":{
                "route":"maison_internal_growth",
                "purpose":"Use relevant Ocean evidence to improve the Maison's internal strategy, operations, systems, capability and decisions.",
                "source_of_truth":"existing Maison Brain and its canonical growth framework",
                "subpoint_matching":"Resolve against the existing canonical subpoints; do not create a parallel taxonomy from an Ocean alone.",
                "human_review_required":True,
                "automatic_execution":False,
            },
            "founder_personal":{
                "route":"founder_personal_growth",
                "purpose":"Offer relevant reflection, learning and decision-support to the founder when explicitly useful.",
                "source_of_truth":"existing private founder-growth context and its canonical subpoints",
                "subpoint_matching":"Match only to the existing framework; preserve unmatched signals as internal context candidates.",
                "opt_in_context_only":True,
                "human_confirmation_required":True,
                "infer_founder_traits_from_generic_ocean":False,
                "public_personalisation":False,
                "personal_data_in_public_ocean_snapshot":False,
                "automatic_execution":False,
            },
        },
        "ocean_ids":sorted(canonical_set),
        "summary":{
            "canonical_oceans":len(canonical),
            "graph_oceans":len(graph_ids),
            "organ_count":len(ORGANS),
            "missing_from_graph":len(missing),
            "orphaned_in_graph":len(orphaned),
            "duplicate_canonical_ids":duplicate_canonical,
            "duplicate_graph_ids":duplicate_graph,
        },
        "gaps":{
            "missing_from_graph":missing,
            "orphaned_in_graph":orphaned,
        },
    }

def validate(payload: Mapping[str,Any]) -> None:
    s=payload["summary"]
    if s["missing_from_graph"] or s["orphaned_in_graph"]:
        raise SystemExit("ocean_universal_coverage_graph_gap")
    if s["duplicate_canonical_ids"] or s["duplicate_graph_ids"]:
        raise SystemExit("ocean_universal_coverage_duplicate_id")
    if s["canonical_oceans"]!=s["graph_oceans"]:
        raise SystemExit("ocean_universal_coverage_count_mismatch")

if __name__=="__main__":
    payload=build_contract()
    validate(payload)
    print(json.dumps(payload["summary"],ensure_ascii=False))
