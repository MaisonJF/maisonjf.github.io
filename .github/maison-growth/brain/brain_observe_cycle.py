#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any, Mapping, Sequence

from a14_projection import preview_to_dict, project_packet_to_a14
from brain_control_client import BrainControlClient
from knowledge_context import OceanEditorialContext
from orchestrator import packet_to_dict, run_brain_cycle


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


def main() -> None:
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
    policy=_explicit_policy()

    # Oceanos contributes curated context refs, never independent evidence roots.
    ocean=OceanEditorialContext.from_file(ROOT/"editorial-queue.json")
    knowledge_context:dict[str,tuple[str,...]]={}
    for row in feed:
        territory=str(row.get("territory_key") or "")
        text=str(row.get("response_excerpt") or "")
        refs=[hit.ref for hit in ocean.search(text,limit=5)]
        if refs:
            current=list(knowledge_context.get(territory,()))
            current.extend(refs)
            knowledge_context[territory]=tuple(dict.fromkeys(current))

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
        "packets":[packet_to_dict(x) for x in packets],
        "a14_previews":[preview_to_dict(x) for x in a14_previews],
        "writes_performed":False,
        "execution_authority":False,
    }
    print(json.dumps(output,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
