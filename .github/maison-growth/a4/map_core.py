#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import secrets
import time
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Optional, Iterable

ROOT = Path(__file__).resolve().parent
RADAR_CONTRACT = ROOT / "radar-source-contract.json"
COVERAGE_POLICY = ROOT / "coverage-policy.json"

EMAIL_RE = re.compile(r"(?i)(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])")
IBAN_RE = re.compile(r"(?i)\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
CARDISH_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")

FORBIDDEN_KEYS = {
    "email","customer_email","billing_email","phone","telephone","mobile",
    "name","full_name","first_name","last_name","address","postal_code",
    "nif","vat_number","tax_id","iban","card_number","billing_details",
    "shipping_details","stripe_customer_id","customer_id",
    "oracle_response","oracle_answer","oracle_content","reading_text",
    "paid_oracle_text","response_text","answer_text","raw_query","query_text",
    "free_text","message","notes"
}
FORBIDDEN_FRAGMENTS = ("oracle_response","oracle_answer","paid_oracle","reading_text","billing_details","shipping_details")

SOURCE_PREFIXES = {
    "gsc": ("discovery.",),
    "site": ("page.","cta.","navigation."),
    "test": ("test.",),
    "oracle": ("oracle.",),
    "commerce": ("commerce.","product.","service.","b2b.","company.")
}

class A4Error(Exception): pass
class ValidationError(A4Error): pass
class PrivacyViolation(A4Error): pass
class DuplicateIntentConflict(A4Error): pass
class UnknownRadarSource(A4Error): pass

@dataclass(frozen=True)
class CoverageResult:
    public_coverage: str
    solution_coverage: str
    overall_state: str
    public_max_strength: int
    solution_max_strength: int
    public_relation_count: int
    solution_relation_count: int

@dataclass(frozen=True)
class RadarEvidence:
    source: str
    evidence_kind: str
    occurred_at: str
    strength: int
    confidence_class: str
    source_event_id: Optional[str]
    journey_id: Optional[str]
    facts: dict[str, Any]
    payload_hash: str

def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",",":"))

def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()

def _uuid7() -> uuid.UUID:
    ms = int(time.time()*1000) & ((1<<48)-1)
    value = (ms<<80) | (0x7<<76) | (secrets.randbits(12)<<64) | (0b10<<62) | secrets.randbits(62)
    return uuid.UUID(int=value)

def new_id(prefix: str) -> str:
    if len(prefix) != 4 or not prefix.endswith("_"):
        raise ValueError("prefix must be three characters plus underscore")
    return prefix + str(_uuid7())

def normalize_time(value: str) -> str:
    if not isinstance(value,str) or not value.strip():
        raise ValidationError("timestamp required")
    raw=value.strip()
    if raw.endswith("Z"): raw=raw[:-1]+"+00:00"
    try: dt=datetime.fromisoformat(raw)
    except ValueError as exc: raise ValidationError("invalid ISO timestamp") from exc
    if dt.tzinfo is None: raise ValidationError("timestamp timezone required")
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")

def validate_prefixed_id(value: Optional[str], prefix: str, *, nullable: bool=True) -> Optional[str]:
    if value is None:
        if nullable: return None
        raise ValidationError(f"{prefix} id required")
    if not isinstance(value,str) or len(value)!=40 or not value.startswith(prefix):
        raise ValidationError(f"invalid {prefix} id")
    try: parsed=uuid.UUID(value[4:])
    except ValueError as exc: raise ValidationError(f"invalid {prefix} UUID") from exc
    if parsed.version != 7 or parsed.variant != uuid.RFC_4122:
        raise ValidationError(f"{prefix} must contain UUIDv7")
    return value

def _has_pii_string(value: str) -> bool:
    if EMAIL_RE.search(value) or IBAN_RE.search(value): return True
    if CARDISH_RE.search(value):
        digits=re.sub(r"\D","",value)
        if 13<=len(digits)<=19: return True
    return False

def privacy_scan(value: Any, path: str="$") -> None:
    if isinstance(value, Mapping):
        for k,v in value.items():
            if not isinstance(k,str): raise PrivacyViolation(f"{path}: non-string key")
            key=k.strip().lower()
            if key in FORBIDDEN_KEYS or any(f in key for f in FORBIDDEN_FRAGMENTS):
                raise PrivacyViolation(f"{path}.{k}: forbidden field")
            privacy_scan(v, f"{path}.{k}")
    elif isinstance(value,list):
        for i,v in enumerate(value): privacy_scan(v,f"{path}[{i}]")
    elif isinstance(value,str) and _has_pii_string(value):
        raise PrivacyViolation(f"{path}: direct PII detected")

def semantic_fingerprint(normalized_intent: str) -> str:
    if not isinstance(normalized_intent,str) or not normalized_intent.strip():
        raise ValidationError("normalized intent required")
    return hashlib.sha256(" ".join(normalized_intent.casefold().split()).encode("utf-8")).hexdigest()

def deduplicate_intent(existing_by_fingerprint: Mapping[str,str], normalized_intent: str) -> tuple[str,bool]:
    fp=semantic_fingerprint(normalized_intent)
    existing=existing_by_fingerprint.get(fp)
    if existing:
        return existing, True
    return new_id("int_"), False

def coverage_from_relations(asset_relations: Iterable[Mapping[str,Any]], solution_relations: Iterable[Mapping[str,Any]]) -> CoverageResult:
    def stats(rels):
        active=[r for r in rels if r.get("status","active")=="active"]
        strengths=[int(r["strength"]) for r in active]
        if any(s<0 or s>100 for s in strengths): raise ValidationError("relation strength out of range")
        mx=max(strengths, default=0)
        state="none" if not strengths else ("sufficient" if mx>=80 else "partial")
        return state,mx,len(strengths)
    public,pmax,pcnt=stats(asset_relations)
    solution,smax,scnt=stats(solution_relations)
    if public=="sufficient" and solution=="sufficient": overall="covered"
    elif public=="none" and solution=="none": overall="gap"
    else: overall="partial"
    return CoverageResult(public,solution,overall,pmax,smax,pcnt,scnt)

def coverage_input_hash(target_type: str, target_id: str, assets: Iterable[Mapping[str,Any]], solutions: Iterable[Mapping[str,Any]], policy_version="coverage_v1") -> str:
    rows=lambda seq: sorted(
        [{"id":x.get("asset_id") or x.get("solution_id") or x.get("relation_id"),"role":x.get("relation_role"),"strength":x.get("strength"),"status":x.get("status","active")} for x in seq],
        key=lambda x:_canonical(x)
    )
    return _sha({"target_type":target_type,"target_id":target_id,"assets":rows(assets),"solutions":rows(solutions),"policy":policy_version})

def _load_contract() -> dict[str,Any]:
    return json.loads(RADAR_CONTRACT.read_text(encoding="utf-8"))

def radar_from_a2_event(event: Mapping[str,Any], *, signal_type: str, strength: int, confidence_class: str="observed", contract: Optional[Mapping[str,Any]]=None) -> RadarEvidence:
    if not isinstance(event,Mapping): raise ValidationError("event object required")
    source=event.get("source")
    if source not in SOURCE_PREFIXES: raise UnknownRadarSource(str(source))
    event_type=event.get("event_type")
    if not isinstance(event_type,str) or not event_type.startswith(SOURCE_PREFIXES[source]):
        raise ValidationError("event_type not allowed for Radar source")
    if signal_type not in {"demand","engagement","conversion","solution_usage"}:
        raise ValidationError("invalid signal_type")
    if isinstance(strength,bool) or not isinstance(strength,int) or not 0<=strength<=100:
        raise ValidationError("strength must be 0..100")
    if confidence_class not in {"low","medium","high","observed"}:
        raise ValidationError("invalid confidence_class")

    spec=(contract or _load_contract())["sources"][source]
    metadata=event.get("metadata",{})
    if not isinstance(metadata,Mapping): raise ValidationError("metadata must be object")
    allowed=set(spec.get("facts_allowed",[]))
    unknown=set(metadata)-allowed
    if unknown: raise ValidationError("Radar metadata not allowlisted: "+", ".join(sorted(unknown)))
    facts={k:metadata[k] for k in sorted(metadata)}
    privacy_scan(facts)
    privacy_scan(event.get("idempotency_key",""))
    if source=="oracle":
        forbidden_exact={"text","answer","question","reading","reading_text","answer_text","question_text"}
        if any(k.lower() in forbidden_exact for k in facts):
            raise PrivacyViolation("paid Oracle text is not accepted")
    event_id=validate_prefixed_id(event.get("event_id"),"evt_",nullable=True)
    journey_id=validate_prefixed_id(event.get("journey_id"),"jrn_",nullable=True)
    occurred=normalize_time(event.get("occurred_at"))
    evidence_kind = "conversion" if signal_type=="conversion" else ("solution_usage" if signal_type=="solution_usage" else signal_type)
    hashed=_sha({"source":source,"event_id":event_id,"journey_id":journey_id,"event_type":event_type,"occurred_at":occurred,"facts":facts,"signal_type":signal_type})
    return RadarEvidence(source,evidence_kind,occurred,strength,confidence_class,event_id,journey_id,facts,hashed)

def relation_evidence_required(strength: int) -> bool:
    if isinstance(strength,bool) or not isinstance(strength,int) or not 0<=strength<=100:
        raise ValidationError("strength must be 0..100")
    return strength>0

def gap_types_for(result: CoverageResult) -> tuple[str,...]:
    gaps=[]
    if result.public_coverage=="none": gaps.append("content")
    if result.solution_coverage=="none": gaps.append("solution")
    return tuple(gaps)

def economic_context_from_a3(conversion: Mapping[str,Any], assessment: Optional[Mapping[str,Any]]) -> dict[str,Any]:
    """Copy only deterministic A3 economic facts. Never infer missing values."""
    out={
      "conversion_id":conversion.get("conversion_id"),
      "solution_id":conversion.get("solution_id"),
      "journey_id":conversion.get("journey_id"),
      "revenue_minor":conversion.get("revenue_minor"),
      "currency":conversion.get("currency"),
    }
    if assessment is not None:
        for k in ("immediate_contribution_minor","continuation_expected_value_minor","expected_total_value_minor",
                  "human_effort_minutes","scalability_score","repeatability_class","confidence_class"):
            out[k]=assessment.get(k)
    privacy_scan(out)
    return out
