#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

ROOT=Path(__file__).resolve().parent
POLICY_FILE=ROOT/"experiment-policy.json"

class ExperimentError(Exception): pass
class ValidationError(ExperimentError): pass
class PrivacyViolation(ExperimentError): pass
class ConflictError(ExperimentError): pass

FORBIDDEN_KEYS={
 "email","customer_email","billing_email","phone","telephone","mobile","name","full_name",
 "first_name","last_name","address","postal_code","nif","vat_number","tax_id","iban","card_number",
 "billing_details","shipping_details","stripe_customer_id","customer_id",
 "oracle_response","oracle_answer","oracle_content","reading_text","paid_oracle_text","response_text","answer_text"
}
EMAIL_RE=re.compile(r"(?i)(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])")

def canonical(v:Any)->str: return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v:Any)->str: return hashlib.sha256(canonical(v).encode()).hexdigest()
def policy()->dict[str,Any]:
    p=json.loads(POLICY_FILE.read_text(encoding="utf-8"))
    if p.get("default")!="deny": raise ValidationError("experiment policy must remain deny-by-default")
    return p

def privacy_scan(value:Any,path:str="$")->None:
    if isinstance(value,Mapping):
        for k,v in value.items():
            if not isinstance(k,str): raise PrivacyViolation(f"{path}: non-string key")
            lk=k.strip().lower()
            if lk in FORBIDDEN_KEYS or any(x in lk for x in ("oracle_answer","oracle_response","paid_oracle","billing_details","shipping_details")):
                raise PrivacyViolation(f"{path}.{k}: forbidden PII or paid-content field")
            privacy_scan(v,f"{path}.{k}")
    elif isinstance(value,(list,tuple)):
        for i,v in enumerate(value): privacy_scan(v,f"{path}[{i}]")
    elif isinstance(value,str) and EMAIL_RE.search(value):
        raise PrivacyViolation(f"{path}: direct PII detected")

@dataclass(frozen=True)
class Variant:
    key:str
    allocation_basis_points:int
    payload:Mapping[str,Any]

@dataclass(frozen=True)
class Definition:
    hypothesis:str
    eligible_population:Mapping[str,Any]
    primary_metric:str
    secondary_metrics:tuple[str,...]
    stop_rules:Mapping[str,Any]
    success_criteria:Mapping[str,Any]
    compatibility_key:str
    variants:tuple[Variant,...]
    policy_version:str

@dataclass(frozen=True)
class Exposure:
    exposure_key:str
    bucket:int
    variant_key:str
    eligible:bool
    reason_code:str

@dataclass(frozen=True)
class Evaluation:
    outcome:str
    sample_size:int
    confidence_score:int
    stop_recommended:bool
    rollback_recommended:bool
    reason_codes:tuple[str,...]
    metrics:Mapping[str,Any]

ALLOWED_PRIMARY={"economic_value_per_eligible_session","cta_click_rate","conversion_rate"}

def validate_variant(v:Variant, *, cfg:Optional[Mapping[str,Any]]=None)->None:
    p=dict(cfg or policy())
    if v.key not in {"control","variant_a","variant_b"}: raise ValidationError("unsupported variant key")
    if not 1 <= v.allocation_basis_points <= 9999: raise ValidationError("allocation must be 1..9999 basis points")
    if set(v.payload)-set(p["allowed_variant_fields"]): raise ValidationError("variant attempts non-allowlisted change")
    privacy_scan(v.payload)
    for protected in p["protected_fields"]:
        if protected in v.payload: raise ValidationError("protected commercial field in variant")
    dest=v.payload.get("destination_solution_id")
    if dest is not None and (not isinstance(dest,str) or not dest.startswith("sol_") or len(dest)!=40):
        raise ValidationError("destination_solution_id must be a stable solution id")

def validate_definition(d:Definition)->None:
    p=policy()
    privacy_scan({
      "hypothesis":d.hypothesis,"population":d.eligible_population,"stop":d.stop_rules,
      "success":d.success_criteria
    })
    if len(d.hypothesis.strip())<10: raise ValidationError("hypothesis too short")
    if d.primary_metric not in ALLOWED_PRIMARY: raise ValidationError("unsupported primary metric")
    allowed_metrics=set(p["metrics"]["allowed"])|{"cta_click_rate","conversion_rate","economic_value_per_eligible_session"}
    if set(d.secondary_metrics)-allowed_metrics: raise ValidationError("unsupported secondary metric")
    if not d.compatibility_key.strip(): raise ValidationError("compatibility key required")
    if len(d.variants)<2: raise ValidationError("control and at least one treatment required")
    keys=[v.key for v in d.variants]
    if "control" not in keys or len(keys)!=len(set(keys)): raise ValidationError("unique control variant required")
    for v in d.variants: validate_variant(v,cfg=p)
    if sum(v.allocation_basis_points for v in d.variants)!=p["assignment"]["bucket_count"]:
        raise ValidationError("variant allocation must total 10000 basis points")
    if int(d.stop_rules.get("min_exposures",0))<1: raise ValidationError("min_exposures must be positive")
    if int(d.stop_rules.get("max_exposures",0))<int(d.stop_rules.get("min_exposures",0)):
        raise ValidationError("max_exposures must be >= min_exposures")

def snapshot(previous_state:Mapping[str,Any])->dict[str,Any]:
    allowed={"source_asset_id","cta_slot_key","destination_solution_id","state_version","presentation_key"}
    if set(previous_state)-allowed: raise ValidationError("snapshot contains non-allowlisted public state")
    privacy_scan(previous_state)
    required={"source_asset_id","cta_slot_key","destination_solution_id","state_version"}
    if not required<=set(previous_state): raise ValidationError("snapshot missing required fields")
    return {"previous_state":dict(previous_state),"previous_state_hash":sha(previous_state)}

def rollback_plan(snapshot_record:Mapping[str,Any], *, reason_codes:Iterable[str])->dict[str,Any]:
    state=snapshot_record.get("previous_state")
    digest=snapshot_record.get("previous_state_hash")
    if not isinstance(state,Mapping) or digest!=sha(state): raise ValidationError("snapshot hash mismatch")
    return {
      "rollback_target":dict(state),"rollback_target_hash":digest,
      "status":"validated","reason_codes":tuple(reason_codes),
      "publisher_gateway_required":True,"public_side_effects":False
    }

def assign(experiment_version_id:str, pseudonymous_key:str, variants:Iterable[Variant], *, eligible:bool=True)->Exposure:
    if not eligible: return Exposure(pseudonymous_key,-1,"",False,"not_eligible")
    if not re.fullmatch(r"[0-9a-f]{64}",pseudonymous_key): raise ValidationError("exposure key must be pseudonymous sha256")
    ordered=tuple(variants)
    total=sum(v.allocation_basis_points for v in ordered)
    if total!=10000: raise ValidationError("allocation must total 10000")
    bucket=int(hashlib.sha256(f"{experiment_version_id}|{pseudonymous_key}".encode()).hexdigest()[:16],16)%10000
    cursor=0
    for v in ordered:
        cursor+=v.allocation_basis_points
        if bucket<cursor: return Exposure(pseudonymous_key,bucket,v.key,True,"eligible")
    raise AssertionError("unreachable")

def exposure_idempotency_key(experiment_version_id:str,pseudonymous_key:str)->str:
    return sha({"version":experiment_version_id,"subject":pseudonymous_key})

def detect_conflict(*, compatibility_key:str, scope_hash:str, active_claims:Iterable[Mapping[str,Any]])->Optional[Mapping[str,Any]]:
    for claim in active_claims:
        if claim.get("claim_state") not in {"ready","running"}: continue
        if claim.get("compatibility_key")==compatibility_key and claim.get("scope_hash")==scope_hash:
            return claim
    return None

def assert_no_conflict(*, compatibility_key:str, scope_hash:str, active_claims:Iterable[Mapping[str,Any]])->None:
    c=detect_conflict(compatibility_key=compatibility_key,scope_hash=scope_hash,active_claims=active_claims)
    if c: raise ConflictError(f"incompatible experiment already active: {c.get('experiment_version_id','unknown')}")

def next_state(current:Optional[str], target:str)->str:
    p=policy()
    if current is None:
        if target!="draft": raise ValidationError("experiment must begin in draft")
        return target
    if target not in p["state_transitions"].get(current,[]): raise ValidationError(f"invalid transition {current}->{target}")
    return target

def _rate(num:int,den:int)->float: return 0.0 if den<=0 else num/den

def summarize_variant(observations:Iterable[Mapping[str,Any]])->dict[str,Any]:
    rows=list(observations)
    eligible=sum(int(r.get("eligible_session",0)) for r in rows)
    clicks=sum(int(r.get("cta_click",0)) for r in rows)
    conversions=sum(int(r.get("conversion",0)) for r in rows)
    econ=sum(int(r.get("economic_value_minor",0)) for r in rows)
    errors=sum(int(r.get("technical_error",0)) for r in rows)
    abandonment=sum(int(r.get("abandonment",0)) for r in rows)
    return {
      "eligible_sessions":eligible,"cta_clicks":clicks,"conversions":conversions,
      "economic_value_minor":econ,"cta_click_rate":_rate(clicks,eligible),
      "conversion_rate":_rate(conversions,eligible),
      "economic_value_per_eligible_session":_rate(econ,eligible),
      "technical_error_rate":_rate(errors,eligible),
      "abandonment_rate":_rate(abandonment,eligible)
    }

def evaluate(control:Mapping[str,Any],variant:Mapping[str,Any],*,primary_metric:str,min_exposures:int,
             neutral_band_bps:int=200,worse_guardrail_bps:int=1000,technical_stop:bool=False)->Evaluation:
    c=summarize_variant([control]); v=summarize_variant([variant])
    sample=c["eligible_sessions"]+v["eligible_sessions"]
    reasons=[]
    if technical_stop:
        return Evaluation("worse",sample,100,True,True,("technical_guardrail_triggered",),{"control":c,"variant":v})
    if c["eligible_sessions"]<min_exposures or v["eligible_sessions"]<min_exposures:
        return Evaluation("insufficient",sample,min(49,round(100*min(c["eligible_sessions"],v["eligible_sessions"])/max(1,min_exposures))),False,False,("minimum_sample_not_met",),{"control":c,"variant":v})
    cv=float(c[primary_metric]); vv=float(v[primary_metric])
    if cv==0:
        if vv==0: delta_bps=0
        else: delta_bps=10000
    else: delta_bps=round((vv-cv)/abs(cv)*10000)
    if delta_bps <= -abs(worse_guardrail_bps):
        outcome="worse"; stop=True; rollback=True; reasons.append("primary_metric_materially_worse")
    elif abs(delta_bps)<=abs(neutral_band_bps):
        outcome="neutral"; stop=False; rollback=False; reasons.append("within_neutral_band")
    elif delta_bps>neutral_band_bps:
        outcome="success"; stop=False; rollback=False; reasons.append("primary_metric_improved")
    else:
        outcome="neutral"; stop=False; rollback=False; reasons.append("difference_inconclusive")
    confidence=min(99,60+min(39,(min(c["eligible_sessions"],v["eligible_sessions"])-min_exposures)//5))
    return Evaluation(outcome,sample,confidence,stop,rollback,tuple(reasons),{"control":c,"variant":v,"delta_bps":delta_bps})

def stop_rule_decision(evaluation:Evaluation, *, max_exposures:int)->dict[str,Any]:
    if evaluation.rollback_recommended: return {"action":"prepare_rollback","reason_codes":evaluation.reason_codes}
    if evaluation.stop_recommended: return {"action":"stop","reason_codes":evaluation.reason_codes}
    if evaluation.sample_size>=max_exposures:
        return {"action":"complete","reason_codes":("max_sample_reached",)}
    return {"action":"continue","reason_codes":("no_stop_rule_triggered",)}
