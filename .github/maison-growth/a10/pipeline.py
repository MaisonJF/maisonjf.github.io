#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

ROOT = Path(__file__).resolve().parent
POLICY = json.loads((ROOT / "promotion-policy.json").read_text(encoding="utf-8"))
HEX40_RE = re.compile(r"^[0-9a-f]{40}$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")
GROWTH_ID_RE = re.compile(r"^[a-z]{3}_[0-9a-f]{36}$")

class PromotionError(Exception): pass
class GateError(PromotionError): pass
class DraftError(PromotionError): pass
class StateError(PromotionError): pass
class PublisherCompatibilityError(PromotionError): pass

def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))

def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def stable_id(prefix: str, payload: Any) -> str:
    return prefix + hashlib.sha256(canonical(payload).encode("utf-8")).hexdigest()[:36]

def validate_id(value: str, prefix: str) -> None:
    if not isinstance(value, str) or len(value) != 40 or not value.startswith(prefix) or not GROWTH_ID_RE.match(value):
        raise PromotionError(f"invalid {prefix} id")

def validate_commit_sha(value: str) -> None:
    if not isinstance(value, str) or not HEX40_RE.match(value):
        raise PromotionError("baseline commit must be 40 lowercase hex chars")

def _forbidden_key_scan(value: Any, forbidden: set[str], path: str="$" ) -> None:
    if isinstance(value, Mapping):
        for key, item in value.items():
            key_s=str(key)
            if key_s in forbidden: raise DraftError(f"forbidden draft field: {path}.{key_s}")
            _forbidden_key_scan(item, forbidden, f"{path}.{key_s}")
    elif isinstance(value, list):
        for idx,item in enumerate(value): _forbidden_key_scan(item, forbidden, f"{path}[{idx}]")

@dataclass(frozen=True)
class GateResult:
    name: str
    passed: bool
    reason_code: str
    evidence_refs: tuple[str,...]

@dataclass(frozen=True)
class PromotionAssessment:
    promotion_run_id: str
    internal_candidate_id: str
    decision_id: str
    state: str
    state_events: tuple[dict[str,Any],...]
    gates: tuple[GateResult,...]
    score: int | None
    score_components: Mapping[str,int]
    reason_codes: tuple[str,...]
    independent_evidence_sources: int
    evidence_refs: tuple[str,...]
    rule_version_id: str
    model_version_id: str | None
    policy_version: str
    baseline_commit_sha: str

def _gate(name, passed, ok, fail, refs):
    return GateResult(name,bool(passed),ok if passed else fail,refs)

def _score(candidate: Mapping[str,Any], evidence: tuple[Mapping[str,Any],...]):
    weights=POLICY["promotion_score"]["weights"]
    raw=candidate.get("score_signals",{})
    evidence_conf=round(sum(int(x.get("confidence_score",0)) for x in evidence)/len(evidence)) if evidence else 0
    vals={
      "semantic_distinction":int(raw.get("semantic_distinction",100 if candidate.get("semantic_distinction") else 0)),
      "demand_evidence":int(raw.get("demand_evidence",0)),
      "coverage_gap":int(raw.get("coverage_gap",100 if candidate.get("coverage")=="none" else 70)),
      "standalone_utility":int(raw.get("standalone_utility",100 if candidate.get("standalone_utility") else 0)),
      "commercial_adjacency":int(raw.get("commercial_adjacency",100 if candidate.get("commercial_adjacency") else 0)),
      "evidence_confidence":int(raw.get("evidence_confidence",evidence_conf)),
      "strategic_value":int(raw.get("strategic_value",50)),
      "interlinking_value":int(raw.get("interlinking_value",50))}
    if any(v<0 or v>100 for v in vals.values()): raise PromotionError("score signal out of range")
    components={k:round(vals[k]*int(w)/100) for k,w in weights.items()}
    return round(sum(vals[k]*int(w)/100 for k,w in weights.items())),components

def assess_candidate(candidate: Mapping[str,Any], *, decision_id: str, evidence: Iterable[Mapping[str,Any]], rule_version_id: str, model_version_id: str|None, baseline_commit_sha: str) -> PromotionAssessment:
    cid=str(candidate.get("internal_candidate_id","")); validate_id(cid,"can_"); validate_id(decision_id,"dec_"); validate_id(rule_version_id,"rul_")
    if model_version_id is not None: validate_id(model_version_id,"mdl_")
    validate_commit_sha(baseline_commit_sha)
    if POLICY["mode"]!="dry_run_only": raise PromotionError("A10 must remain dry-run only")
    ev=tuple(evidence); groups=set(); refs=[]
    for item in ev:
        eid=str(item.get("evidence_id","")); group=str(item.get("independent_group",""))
        if not eid or not group: raise PromotionError("evidence requires evidence_id and independent_group")
        groups.add(group)
        if eid not in refs: refs.append(eid)
    refs=tuple(refs)
    coverage=candidate.get("coverage")
    if coverage not in {"none","partial","sufficient","redundant"}: raise PromotionError("invalid coverage")
    duplicate=bool(candidate.get("duplicate_of_intent_id")); paid=bool(candidate.get("uses_paid_oracle_content")) or bool(candidate.get("would_substitute_paid_oracle")); cannib=str(candidate.get("cannibalization_risk","unknown"))
    gates=(
      _gate("source_candidate_valid",candidate.get("state")=="internal_candidate","SOURCE_CANDIDATE_VALID","SOURCE_CANDIDATE_INVALID",refs),
      _gate("semantic_distinction",bool(candidate.get("semantic_distinction")) and not duplicate,"SEMANTICALLY_DISTINCT","DUPLICATE_OR_NOT_DISTINCT",refs),
      _gate("standalone_utility",bool(candidate.get("standalone_utility")),"STANDALONE_UTILITY_OK","STANDALONE_UTILITY_INSUFFICIENT",refs),
      _gate("evidence_independence",len(groups)>=POLICY["min_independent_evidence_sources"],"EVIDENCE_INDEPENDENCE_OK","INSUFFICIENT_INDEPENDENT_EVIDENCE",refs),
      _gate("coverage_gap",coverage in {"none","partial"},"COVERAGE_GAP_EXISTS","COVERAGE_ALREADY_SUFFICIENT",refs),
      _gate("cannibalization_safe",cannib in {"none","low"},"CANNIBALIZATION_ACCEPTABLE","CANNIBALIZATION_RISK",refs),
      _gate("commercial_adjacency",bool(candidate.get("commercial_adjacency")),"COMMERCIAL_ADJACENCY_OK","NO_NATURAL_COMMERCIAL_ADJACENCY",refs),
      _gate("paid_oracle_safe",not paid,"PAID_ORACLE_SAFE","PAID_ORACLE_SUBSTITUTION_RISK",refs),
      _gate("safety_quality",bool(candidate.get("safety_quality")),"SAFETY_QUALITY_OK","SAFETY_QUALITY_FAILED",refs),
      _gate("architecture_compatible",bool(candidate.get("architecture_compatible")),"ARCHITECTURE_COMPATIBLE","ARCHITECTURE_INCOMPATIBLE",refs))
    run_id=stable_id("opm_",{"candidate":cid,"decision":decision_id,"rule":rule_version_id,"model":model_version_id,"baseline":baseline_commit_sha,"evidence":refs,"candidate_payload":candidate})
    events=[{"from_state":None,"to_state":"internal_candidate","reason_code":"A10_PIPELINE_OPENED"},{"from_state":"internal_candidate","to_state":"promotion_candidate","reason_code":"PROMOTION_EVALUATION_STARTED"}]
    failed=[g for g in gates if not g.passed]; score=None; components={}; state="promotion_candidate"
    if failed:
        names={g.name for g in failed}
        if candidate.get("archive_requested"): state,reason="archived","HUMAN_ARCHIVE_REQUEST"
        elif duplicate or "semantic_distinction" in names: state,reason="alias","RESOLVE_AS_ALIAS"
        elif coverage in {"sufficient","redundant"}: state,reason="reinforced","EXISTING_COVERAGE_REINFORCEMENT"
        elif paid or "safety_quality" in names or "architecture_compatible" in names: state,reason="rejected","HARD_GATE_REJECTED"
        elif "evidence_independence" in names: state,reason="promotion_candidate","WAIT_FOR_MORE_EVIDENCE"
        else: state,reason="rejected","HARD_GATE_REJECTED"
        if state!="promotion_candidate": events.append({"from_state":"promotion_candidate","to_state":state,"reason_code":reason})
    else:
        score,components=_score(candidate,ev)
        if score>=POLICY["promotion_score"]["eligible_min"]:
            state="promotion_eligible"; events.append({"from_state":"promotion_candidate","to_state":state,"reason_code":"ALL_GATES_PASS_SCORE_ELIGIBLE"})
        else: events.append({"from_state":"promotion_candidate","to_state":"promotion_candidate","reason_code":"SCORE_BELOW_PROMOTION_THRESHOLD"})
    return PromotionAssessment(run_id,cid,decision_id,state,tuple(events),gates,score,components,tuple(g.reason_code for g in gates),len(groups),refs,rule_version_id,model_version_id,POLICY["policy_version"],baseline_commit_sha)

def create_intelligence_draft(assessment: PromotionAssessment, draft: Mapping[str,Any]) -> dict[str,Any]:
    if assessment.state!="promotion_eligible": raise StateError("draft creation requires promotion_eligible")
    _forbidden_key_scan(draft,set(POLICY["draft_forbidden_fields"]))
    for key in ("title","description","intent_summary","body_markdown","proposed_content_root","proposed_slug","source_material_classes"):
        if key not in draft: raise DraftError(f"missing draft field: {key}")
    if draft["proposed_content_root"] not in POLICY["allowed_content_roots"]: raise DraftError("content root not allowed")
    if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$",str(draft["proposed_slug"])): raise DraftError("invalid slug")
    if len(str(draft["body_markdown"]).strip())<50: raise DraftError("draft body too short")
    classes={str(x) for x in draft.get("source_material_classes",[])}
    if classes & {"oracle_paid","paid_oracle","paid_reading","paid_answer"} or draft.get("uses_paid_oracle_content") is True: raise DraftError("paid Oráculo material is forbidden")
    clean=dict(draft); clean.update({"uses_paid_oracle_content":False,"public_url_assigned":False,"sitemap_authorized":False,"indexnow_authorized":False,"navigation_authorized":False,"indexing_authorized":False,"public_side_effects":False})
    clean["ocean_draft_id"]=stable_id("odr_",{"run":assessment.promotion_run_id,"draft":clean}); clean["draft_hash"]=sha256_text(canonical(clean)); clean["state"]="draft_isolated"; return clean

def validate_draft(assessment: PromotionAssessment, draft: Mapping[str,Any], validations: Mapping[str,bool]) -> dict[str,Any]:
    if draft.get("state")!="draft_isolated": raise StateError("only isolated draft can be validated")
    required=("semantic_distinction","standalone_utility","coverage_gap","cannibalization_safe","commercial_adjacency","paid_oracle_safe","content_contract","link_validation","snapshot_match")
    missing=[k for k in required if validations.get(k) is not True]
    if missing: raise DraftError("draft validation failed: "+",".join(missing))
    if any(draft.get(k) for k in ("public_url_assigned","sitemap_authorized","indexnow_authorized","navigation_authorized","indexing_authorized","public_side_effects")): raise DraftError("draft acquired public authority")
    return {"promotion_run_id":assessment.promotion_run_id,"ocean_draft_id":draft["ocean_draft_id"],"draft_hash":draft["draft_hash"],"state":"validated","validations":{k:True for k in required},"public_side_effects":False}

def render_proposed_html(draft: Mapping[str,Any]) -> str:
    return f'<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>{draft["title"]}</title><meta name="description" content="{draft["description"]}"></head><body><main data-growth-dry-run="true"><h1>{draft["title"]}</h1><article>{draft["body_markdown"]}</article></main></body></html>'

def _load_a9_gateway():
    path=ROOT.parent/"a9"/"gateway.py"
    if not path.exists(): raise PublisherCompatibilityError("A9 gateway.py not found")
    spec=importlib.util.spec_from_file_location("maison_a9_gateway",path)
    if spec is None or spec.loader is None: raise PublisherCompatibilityError("cannot load A9 gateway")
    module=importlib.util.module_from_spec(spec); sys.modules[spec.name]=module; spec.loader.exec_module(module); return module

def build_a9_dry_run(assessment: PromotionAssessment, draft: Mapping[str,Any], validated: Mapping[str,Any], *, sitemap_ocean_path: str, sitemap_ocean_before: str|None, sitemap_ocean_after: str, sitemap_index_before: str, sitemap_index_after: str, snapshot_hash: str, guard_result: Mapping[str,Any], active_runs: Iterable[Mapping[str,Any]]=()) -> dict[str,Any]:
    if assessment.state!="promotion_eligible" or validated.get("state")!="validated": raise StateError("publisher dry-run requires eligible validated draft")
    if not HEX64_RE.match(str(snapshot_hash)): raise PublisherCompatibilityError("invalid snapshot_hash")
    if sitemap_ocean_before is not None: raise PublisherCompatibilityError("A10 requires create-only Ocean sitemap")
    gateway=_load_a9_gateway(); content_path=f"{draft['proposed_content_root']}{draft['proposed_slug']}.html"; html=render_proposed_html(draft)
    files=[gateway.DiffFile(content_path,"create",None,html,None,gateway.sha256_text(html),()),gateway.DiffFile(sitemap_ocean_path,"create",None,sitemap_ocean_after,None,gateway.sha256_text(sitemap_ocean_after),()),gateway.DiffFile("sitemap.xml","update",sitemap_index_before,sitemap_index_after,gateway.sha256_text(sitemap_index_before),gateway.sha256_text(sitemap_index_after),())]
    request={"action":"ocean_promotion","decision_id":assessment.decision_id,"candidate_id":assessment.internal_candidate_id,"baseline_commit_sha":assessment.baseline_commit_sha,"snapshot_hash":snapshot_hash,"prepublication_results":{"snapshot_match":{"passed":True,"detail":"A10 validated snapshot"},"content_contract":{"passed":True,"detail":"A10 content contract passed"},"link_validation":{"passed":True,"detail":"A10 link validation passed"}}}
    result=gateway.build_dry_run(request,files,guard_result=guard_result,active_runs=active_runs); result.update({"promotion_run_id":assessment.promotion_run_id,"ocean_draft_id":draft["ocean_draft_id"],"pipeline_state":"publication_ready","a10_public_write_authorized":False,"a10_public_side_effects":False}); return result

def build_exact_rollback_dry_run(publisher_result: Mapping[str,Any], *, decision_id: str, baseline_commit_sha: str, snapshot_hash: str, original_files: list[Mapping[str,Any]], restored_files: list[Mapping[str,Any]], guard_result: Mapping[str,Any]) -> dict[str,Any]:
    gateway=_load_a9_gateway(); files=[gateway.DiffFile(str(x["path"]),str(x["change_type"]),x.get("before_content"),x.get("after_content"),x.get("before_hash"),x.get("after_hash"),tuple(x.get("mutation_capabilities",()))) for x in restored_files]
    request={"action":"rollback","decision_id":decision_id,"baseline_commit_sha":baseline_commit_sha,"snapshot_hash":snapshot_hash,"rollback_of_publish_run_id":publisher_result["publish_run_id"],"rollback_original_files":original_files,"prepublication_results":{"rollback_exactness":{"passed":True,"detail":"exact restoration fixture"}}}
    return gateway.build_dry_run(request,files,guard_result=guard_result)
