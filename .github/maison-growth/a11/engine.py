#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

ROOT=Path(__file__).resolve().parent
POLICY=json.loads((ROOT/"learning-policy.json").read_text(encoding="utf-8"))
ID_RE=re.compile(r"^[a-z]{3}_[0-9a-f]{36}$")

class LearningError(Exception): pass
class ProtectedMutationError(LearningError): pass

def canonical(v:Any)->str:
    return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(",",":"))
def stable_id(prefix:str,payload:Any)->str:
    return prefix+hashlib.sha256(canonical(payload).encode()).hexdigest()[:36]
def validate_id(v:str,prefix:str)->None:
    if not isinstance(v,str) or len(v)!=40 or not v.startswith(prefix) or not ID_RE.match(v):
        raise LearningError(f"invalid {prefix} id")

@dataclass(frozen=True)
class LearningInput:
    source_kind:str
    source_id:str
    expected_economic_value_minor:int|None
    observed_economic_value_minor:int|None
    expected_ctr_bps:int|None
    observed_ctr_bps:int|None
    observation_count:int
    economic_observation_count:int
    evidence_refs:tuple[str,...]
    subject_type:str
    subject_id:str

@dataclass(frozen=True)
class LearningRecord:
    learning_record_id:str
    signal_class:str
    confidence_before:int
    confidence_after:int
    confidence_delta:int
    reason_codes:tuple[str,...]
    expected_json:dict[str,Any]
    observed_json:dict[str,Any]
    evidence_refs:tuple[str,...]
    correlation_only:bool
    causal_claim:bool
    rule_version_id:str
    model_version_id:str|None
    input_hash:str

def _neutral(expected:int, observed:int)->bool:
    if expected==0:
        return observed==0
    diff=abs(observed-expected)*10000/abs(expected)
    return diff <= int(POLICY["neutral_band_basis_points"])

def evaluate(inp:LearningInput, *, confidence_before:int, rule_version_id:str, model_version_id:str|None=None)->LearningRecord:
    if inp.source_kind not in {"decision","experiment","journey","conversion","promotion","content"}:
        raise LearningError("unsupported source kind")
    if inp.subject_type not in {"need","intent","coverage","candidate","decision"}:
        raise LearningError("unsupported feedback target")
    if not (0<=confidence_before<=100):
        raise LearningError("confidence out of range")
    validate_id(rule_version_id,"rul_")
    if model_version_id is not None: validate_id(model_version_id,"mdl_")
    reasons=[]
    signal="insufficient"
    if inp.observation_count < int(POLICY["minimum_observation_count"]):
        reasons.append("INSUFFICIENT_OBSERVATIONS")
    elif inp.economic_observation_count < int(POLICY["minimum_economic_observation_count"]) or inp.observed_economic_value_minor is None:
        reasons.append("INSUFFICIENT_ECONOMIC_DATA")
    else:
        exp=inp.expected_economic_value_minor
        obs=inp.observed_economic_value_minor
        if exp is None:
            signal="neutral"; reasons.append("EXPECTED_OBSERVED_MATCH")
        elif _neutral(exp,obs):
            signal="neutral"; reasons += ["ECONOMIC_OUTCOME_WITHIN_NEUTRAL_BAND","EXPECTED_OBSERVED_MATCH"]
        elif obs>exp:
            signal="positive"; reasons += ["ECONOMIC_OUTCOME_ABOVE_EXPECTATION","EXPECTED_OBSERVED_DIVERGENCE"]
        else:
            signal="negative"; reasons += ["ECONOMIC_OUTCOME_BELOW_EXPECTATION","EXPECTED_OBSERVED_DIVERGENCE"]
        if inp.expected_ctr_bps is not None and inp.observed_ctr_bps is not None:
            ctr_up=inp.observed_ctr_bps>inp.expected_ctr_bps
            ctr_down=inp.observed_ctr_bps<inp.expected_ctr_bps
            if ctr_up and signal=="negative":
                reasons += ["CTR_POSITIVE_ECONOMIC_NEGATIVE","CONTRADICTORY_SIGNALS"]
            if ctr_down and signal=="positive":
                reasons += ["CTR_NEGATIVE_ECONOMIC_POSITIVE","CONTRADICTORY_SIGNALS"]
    if signal=="positive":
        delta=min(10,int(POLICY["confidence_delta_limits"]["max_increase"]))
    elif signal=="negative":
        delta=-min(15,int(POLICY["confidence_delta_limits"]["max_decrease"]))
    else:
        delta=0
    after=max(0,min(100,confidence_before+delta))
    expected={"economic_value_minor":inp.expected_economic_value_minor,"ctr_bps":inp.expected_ctr_bps}
    observed={"economic_value_minor":inp.observed_economic_value_minor,"ctr_bps":inp.observed_ctr_bps,
              "observation_count":inp.observation_count,"economic_observation_count":inp.economic_observation_count}
    payload={"input":inp.__dict__,"confidence_before":confidence_before,"rule":rule_version_id,"model":model_version_id}
    ih=hashlib.sha256(canonical(payload).encode()).hexdigest()
    return LearningRecord(stable_id("lrn_",payload),signal,confidence_before,after,after-confidence_before,
        tuple(dict.fromkeys(reasons)),expected,observed,inp.evidence_refs,True,False,rule_version_id,model_version_id,ih)

def offer_context_key(*, offer_id:str, need_id:str|None=None, route:str|None=None, source:str|None=None)->str:
    parts=["offer",offer_id]
    if need_id: parts += ["need",need_id]
    if route: parts += ["route",route]
    if source: parts += ["source",source]
    return ":".join(parts)

def evaluate_offer_funnel(*, offer_id:str, exposures:int, clicks:int, conversions:int,
        confidence_before:int, rule_version_id:str, expected_ctr_bps:int|None=None,
        expected_conversion_bps:int|None=None, need_id:str|None=None, route:str|None=None,
        source:str|None=None)->LearningRecord:
    """Turn a contextual Offer Brain funnel into bounded correlation-only learning."""
    validate_id(rule_version_id,"rul_")
    if not offer_id or exposures<0 or clicks<0 or conversions<0 or clicks>exposures or conversions>clicks:
        raise LearningError("invalid offer funnel")
    ctr_bps=round(clicks*10000/exposures) if exposures else 0
    conversion_bps=round(conversions*10000/clicks) if clicks else 0
    expected_ctr=expected_ctr_bps if expected_ctr_bps is not None else ctr_bps
    expected_conv=expected_conversion_bps if expected_conversion_bps is not None else conversion_bps
    context=offer_context_key(offer_id=offer_id,need_id=need_id,route=route,source=source)
    inp=LearningInput(
        source_kind="journey",source_id=stable_id("jns_",{"context":context,"exposures":exposures,"clicks":clicks,"conversions":conversions}),
        expected_economic_value_minor=expected_conv,observed_economic_value_minor=conversion_bps,
        expected_ctr_bps=expected_ctr,observed_ctr_bps=ctr_bps,observation_count=exposures,
        economic_observation_count=clicks,evidence_refs=(f"{context}:exposure",f"{context}:click",f"{context}:conversion"),
        subject_type="candidate",subject_id=stable_id("can_",{"offer_context":context})
    )
    return evaluate(inp,confidence_before=confidence_before,rule_version_id=rule_version_id)

def evaluate_content_performance(*, content_id:str, observation_count:int,
        confidence_before:int, rule_version_id:str,
        expected_economic_value_minor:int|None=None,
        observed_economic_value_minor:int|None=None,
        economic_observation_count:int=0,
        expected_click_rate_bps:int|None=None,
        observed_click_rate_bps:int|None=None,
        evidence_refs:Iterable[str]=())->LearningRecord:
    """Map aggregated content performance into governed A11 learning.

    Engagement metrics may inform context but never become economic value.
    Economic fields must come from the A3/economic layer; without them the
    record remains observation-only and confidence does not change.
    """
    validate_id(rule_version_id,"rul_")
    if not content_id or observation_count<0 or economic_observation_count<0:
        raise LearningError("invalid content performance")
    refs=(f"content:{content_id}",*tuple(dict.fromkeys(str(x) for x in evidence_refs)))
    inp=LearningInput(
        source_kind="content",
        source_id=stable_id("cnt_",{"content_id":content_id,"refs":refs}),
        expected_economic_value_minor=expected_economic_value_minor,
        observed_economic_value_minor=observed_economic_value_minor,
        expected_ctr_bps=expected_click_rate_bps,
        observed_ctr_bps=observed_click_rate_bps,
        observation_count=observation_count,
        economic_observation_count=economic_observation_count,
        evidence_refs=refs,
        subject_type="candidate",
        subject_id=stable_id("can_",{"content_id":content_id})
    )
    return evaluate(inp,confidence_before=confidence_before,rule_version_id=rule_version_id)

def feedback(record:LearningRecord)->dict[str,Any]:
    action={"positive":"increase_confidence","negative":"decrease_confidence","neutral":"hold_confidence","insufficient":"observe"}[record.signal_class]
    return {"feedback_id":stable_id("lfb_",{"record":record.learning_record_id,"action":action}),
            "learning_record_id":record.learning_record_id,"action":action,
            "confidence_delta":record.confidence_delta,"execution_mode":"append_only_internal","public_side_effects":False}

def detect_repeated_pattern(records:Iterable[LearningRecord], pattern_key:str)->dict[str,Any]|None:
    rs=list(records)
    if len(rs)<int(POLICY["pattern_detection"]["min_repetitions"]): return None
    sigs=[r.signal_class for r in rs if r.signal_class!="insufficient"]
    if len(sigs)<int(POLICY["pattern_detection"]["min_repetitions"]): return None
    if len(set(sigs))!=1: return None
    return {"pattern_id":stable_id("lpt_",{"key":pattern_key,"records":[r.learning_record_id for r in rs]}),
            "pattern_key":pattern_key,"direction":sigs[0],"occurrence_count":len(sigs),
            "reason_code":"REPEATED_CORRELATED_PATTERN","correlation_only":True,"causal_claim":False}

def propose_sensitive_adjustment(domain:str, recommendation:str, evidence_refs:Iterable[str])->dict[str,Any]:
    if domain not in set(POLICY["protected_domains"]):
        raise LearningError("domain is not protected/sensitive")
    if not recommendation or not recommendation.strip(): raise LearningError("recommendation required")
    payload={"domain":domain,"recommendation":recommendation.strip(),"evidence_refs":list(evidence_refs)}
    return {"proposal_id":stable_id("lpr_",payload),"protected_domain":domain,"recommendation":recommendation.strip(),
            "reason_code":"SENSITIVE_RULE_CHANGE_REQUIRES_HUMAN","status":"human_review_required",
            "execution_authorized":False,"public_side_effects":False,"evidence_refs":list(evidence_refs)}

def assert_no_protected_mutation(requested_capabilities:Iterable[str])->None:
    protected={"hard_gates.write","permissions.write","price.write","discount.write","checkout.write","catalogue.write",
               "paid_content.write","policy.write","commercial_promise.write","architecture.write","public_authorization.write"}
    hit=protected.intersection(set(requested_capabilities))
    if hit: raise ProtectedMutationError("protected mutation denied: "+",".join(sorted(hit)))
