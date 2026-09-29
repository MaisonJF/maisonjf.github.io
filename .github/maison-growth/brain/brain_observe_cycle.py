#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any, Mapping, Sequence

from a14_projection import preview_to_dict, project_packet_to_a14
from brain_control_client import BrainControlClient
from commercial_assets import CommercialAssetContext
from knowledge_context import OceanEditorialContext
from orchestrator import packet_to_dict, run_brain_cycle
from runtime_memory_context import collect_runtime_memory_context


ROOT=Path(__file__).resolve().parent


A3_TO_A14={
    "oracle":"oracle",
    "physical_product":"physical_product",
    "service":"service",
    "ebook":"ebook",
    "b2b":"b2b",
    "digital_collection":"digital_product",
    "future_product":"digital_product",
}


def _rows(payload: Mapping[str,Any]) -> list[dict[str,Any]]:
    rows=payload.get("rows",[])
    return [dict(x) for x in rows if isinstance(x,Mapping)] if isinstance(rows,list) else []


def _explicit_policy() -> dict[str,Any]:
    raw=os.environ.get("MAISON_BRAIN_TERRITORY_POLICY_JSON","").strip()
    if not raw:
        return {}
    value=json.loads(raw)
    if not isinstance(value,dict):
        raise ValueError("MAISON_BRAIN_TERRITORY_POLICY_JSON_must_be_object")
    return value


def _commercial_asset_query(text: str, hints: Sequence[object]) -> str:
    chunks=[text]
    for hint in hints:
        chunks.extend([
            str(getattr(hint,"commercial_adjacency","") or ""),
            str(getattr(hint,"intent","") or ""),
            " ".join(getattr(hint,"question_theme_candidates",()) or ()),
        ])
    return " ".join(x for x in chunks if x).strip()


def _append_context(
    target: dict[str,tuple[str,...]],
    territory: str,
    refs: Sequence[str],
) -> None:
    if not territory or not refs:
        return
    current=list(target.get(territory,()))
    current.extend(str(x) for x in refs if x)
    target[territory]=tuple(dict.fromkeys(current))


def _learning_context_by_territory(
    feed: Sequence[Mapping[str,Any]],
    learning: Sequence[Mapping[str,Any]],
) -> dict[str,tuple[str,...]]:
    need_territories:dict[str,set[str]]={}
    intent_territories:dict[str,set[str]]={}
    for row in feed:
        territory=str(row.get("territory_key") or "").strip()
        need_id=str(row.get("need_id") or "").strip()
        intent_id=str(row.get("intent_id") or "").strip()
        if territory and need_id:
            need_territories.setdefault(need_id,set()).add(territory)
        if territory and intent_id:
            intent_territories.setdefault(intent_id,set()).add(territory)

    out:dict[str,tuple[str,...]]={}
    for row in learning:
        if row.get("correlation_only") is not True or row.get("causal_claim") is True:
            continue
        subject_type=str(row.get("subject_type") or "")
        subject_id=str(row.get("subject_id") or "")
        learning_id=str(row.get("learning_record_id") or "")
        if not learning_id:
            continue
        territories=(
            need_territories.get(subject_id,set()) if subject_type=="need"
            else intent_territories.get(subject_id,set()) if subject_type=="intent"
            else set()
        )
        for territory in territories:
            _append_context(out,territory,(f"a11:{learning_id}",))
    return out


def _cash_context_by_territory(
    cash: Sequence[Mapping[str,Any]],
    links: Sequence[Mapping[str,Any]],
) -> dict[str,tuple[str,...]]:
    solution_territories:dict[str,set[str]]={}
    for row in links:
        territory=str(row.get("territory_key") or "").strip()
        solution_id=str(row.get("solution_id") or "").strip()
        if territory and solution_id:
            solution_territories.setdefault(solution_id,set()).add(territory)

    out:dict[str,tuple[str,...]]={}
    for row in cash:
        assessment_id=str(row.get("economic_assessment_id") or "").strip()
        solution_id=str(row.get("solution_id") or "").strip()
        if not assessment_id or not solution_id:
            continue
        for territory in solution_territories.get(solution_id,set()):
            _append_context(out,territory,(f"a3:{assessment_id}",))
    return out


def _b2b_context_by_territory(
    b2b: Sequence[Mapping[str,Any]],
    links: Sequence[Mapping[str,Any]],
) -> dict[str,tuple[str,...]]:
    """Project observed B2B lifecycle as supporting refs through canonical A4 solution links.

    Lifecycle progression is observed evidence, not invented economic value. No territory
    is inferred when A4 has no canonical link for the B2B solution.
    """
    solution_territories:dict[str,set[str]]={}
    for row in links:
        territory=str(row.get("territory_key") or "").strip()
        solution_id=str(row.get("solution_id") or "").strip()
        if territory and solution_id:
            solution_territories.setdefault(solution_id,set()).add(territory)

    out:dict[str,tuple[str,...]]={}
    for row in b2b:
        conversion_id=str(row.get("conversion_id") or "").strip()
        solution_id=str(row.get("solution_id") or "").strip()
        stage=str(row.get("lifecycle_stage") or "").strip()
        if not conversion_id or not solution_id or not stage:
            continue
        for territory in solution_territories.get(solution_id,set()):
            _append_context(out,territory,(f"b2b:{stage}:{conversion_id}",))
    return out


def _solutions_by_territory(links: Sequence[Mapping[str,Any]]) -> dict[str,tuple[str,...]]:
    out:dict[str,set[str]]={}
    for row in links:
        territory=str(row.get("territory_key") or "").strip()
        solution=str(row.get("solution_id") or "").strip()
        if territory and solution:
            out.setdefault(territory,set()).add(solution)
    return {key:tuple(sorted(values)) for key,values in out.items()}


def _offer_types_by_territory(
    links: Sequence[Mapping[str,Any]],
    solutions: Sequence[Mapping[str,Any]],
    explicit: Mapping[str,Any],
) -> dict[str,tuple[str,...]]:
    types_by_solution={
        str(row.get("solution_id")):A3_TO_A14.get(str(row.get("solution_type")))
        for row in solutions
    }
    out:dict[str,list[str]]={}
    for row in links:
        territory=str(row.get("territory_key") or "").strip()
        offer_type=types_by_solution.get(str(row.get("solution_id")))
        if territory and offer_type:
            out.setdefault(territory,[]).append(offer_type)

    for territory,cfg in explicit.items():
        if not isinstance(cfg,Mapping): continue
        configured=cfg.get("candidate_offer_types",[])
        if isinstance(configured,list):
            out.setdefault(str(territory),[]).extend(str(x) for x in configured if x)

    return {key:tuple(dict.fromkeys(values)) for key,values in out.items()}


def _validation_modes(explicit: Mapping[str,Any]) -> dict[str,str]:
    out={}
    for cfg in explicit.values():
        if not isinstance(cfg,Mapping): continue
        modes=cfg.get("validation_modes",{})
        if isinstance(modes,Mapping):
            for key,value in modes.items():
                out[str(key)]=str(value)
    return out


def _operational_constraints(explicit: Mapping[str,Any]) -> dict[str,dict[str,object|None]]:
    out={}
    for territory,cfg in explicit.items():
        if not isinstance(cfg,Mapping): continue
        ops=cfg.get("operational_constraints",{})
        if isinstance(ops,Mapping):
            out[str(territory)]=dict(ops)
    return out


def _economics_policy(explicit: Mapping[str,Any]) -> dict[str,dict[str,dict[str,int|None]]]:
    """Only caller-configured opportunity economics enter here.

    A3 solution price/cost fields are NOT silently converted into expected opportunity
    contribution, capital requirement or time-to-cash.
    """
    out={}
    for territory,cfg in explicit.items():
        if not isinstance(cfg,Mapping): continue
        economics=cfg.get("economics",{})
        if not isinstance(economics,Mapping): continue
        typed={}
        for offer_type,row in economics.items():
            if isinstance(row,Mapping):
                typed[str(offer_type)]={
                    key:(int(value) if value is not None else None)
                    for key,value in row.items()
                    if key in {
                        "expected_contribution_minor","capital_required_minor",
                        "days_to_cash","human_effort_minutes"
                    }
                }
        out[str(territory)]=typed
    return out


def build_observe_output() -> dict[str,Any]:
    base_url=os.environ["BRAIN_CONTROL_API_URL"]
    token=os.environ["BRAIN_CONTROL_TOKEN"]
    client=BrainControlClient(
        base_url=base_url,
        token=token,
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )

    feed=_rows(client.feed(limit=100))
    solutions=_rows(client.solutions(limit=100))
    links=_rows(client.solution_links(limit=100))
    cash=_rows(client.cash_feedback(limit=100))
    b2b=_rows(client.b2b_feedback(limit=100))
    learning=_rows(client.learning(limit=100))
    policy=_explicit_policy()

    overlay_raw=os.environ.get("MAISON_COMMERCIAL_ASSET_OVERLAY_PATH","").strip()
    asset_context=CommercialAssetContext.from_files(
        ROOT/"commercial-assets.generated.json",
        overlay_path=Path(overlay_raw) if overlay_raw else None,
    )

    # Oceanos and commercial assets contribute supporting context refs, never independent evidence roots.
    ocean=OceanEditorialContext.from_file(ROOT/"editorial-queue.json")
    knowledge_context:dict[str,tuple[str,...]]={}
    ocean_commercial_hint_matches=0
    for row in feed:
        territory=str(row.get("territory_key") or "")
        text=str(row.get("response_excerpt") or "")
        refs=[hit.ref for hit in ocean.search(text,limit=5)]
        if refs:
            _append_context(knowledge_context,territory,refs)

        commercial_hints=ocean.commercial_hints(text,limit=3)
        if commercial_hints:
            ocean_commercial_hint_matches+=len(commercial_hints)
            _append_context(
                knowledge_context,
                territory,
                [hint.ref for hint in commercial_hints],
            )

        # Ocean commercial adjacency is routing context only: it may help find an
        # existing Maison asset, but it never becomes external evidence or execution authority.
        asset_query=_commercial_asset_query(text,commercial_hints)
        asset_refs=[hit.ref for hit in asset_context.search(asset_query,limit=5)]
        if asset_refs:
            _append_context(knowledge_context,territory,asset_refs)

    for territory,refs in _cash_context_by_territory(cash,links).items():
        _append_context(knowledge_context,territory,refs)
    for territory,refs in _b2b_context_by_territory(b2b,links).items():
        _append_context(knowledge_context,territory,refs)
    for territory,refs in _learning_context_by_territory(feed,learning).items():
        _append_context(knowledge_context,territory,refs)

    runtime_memory=collect_runtime_memory_context(feed)
    for territory,refs in runtime_memory.refs_by_territory.items():
        _append_context(knowledge_context,territory,refs)

    packets=run_brain_cycle(
        rows=feed,
        similarity_threshold=float(os.environ.get("MAISON_PREBRAIN_SIMILARITY","0.45")),
        minimum_independent_roots=int(os.environ.get("MAISON_PREBRAIN_MIN_ROOTS","2")),
        scout_minimum_confidence=float(os.environ.get("MAISON_SCOUT_MIN_CONFIDENCE","0.60")),
        existing_solutions_by_territory=_solutions_by_territory(links),
        knowledge_context_by_territory=knowledge_context,
        candidate_offer_types_by_territory=_offer_types_by_territory(links,solutions,policy),
        economics_by_territory=_economics_policy(policy),
        validation_modes=_validation_modes(policy),
        operational_constraints_by_territory=_operational_constraints(policy),
    )

    a14_previews=[
        project_packet_to_a14(
            packet,
            policy_by_territory=policy,
        )
        for packet in packets
    ]

    output={
        "mode":"observe_only",
        "source":"authenticated_brain_control_api",
        "feed_rows":len(feed),
        "solution_rows":len(solutions),
        "solution_links":len(links),
        "cash_feedback_rows":len(cash),
        "b2b_feedback_rows":len(b2b),
        "learning_rows":len(learning),
        "runtime_memory_status":dict(runtime_memory.status),
        "commercial_asset_status":asset_context.summary(),
        "ocean_commercial_hint_matches":ocean_commercial_hint_matches,
        "packets":[packet_to_dict(x) for x in packets],
        "a14_previews":[preview_to_dict(x) for x in a14_previews],
        "writes_performed":False,
        "execution_authority":False,
    }
    return output


def main() -> None:
    print(json.dumps(build_observe_output(),ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
