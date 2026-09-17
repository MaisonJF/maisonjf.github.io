#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

ROOT = Path(__file__).resolve().parent
POLICY_FILE = ROOT / "brain-policy.json"

EMAIL_RE = re.compile(r"(?i)(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])")
IBAN_RE = re.compile(r"(?i)\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
CARDISH_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")
FORBIDDEN_KEYS = {
    "email","customer_email","billing_email","phone","telephone","mobile","name","full_name",
    "first_name","last_name","address","postal_code","nif","vat_number","tax_id","iban",
    "card_number","billing_details","shipping_details","stripe_customer_id","customer_id",
    "oracle_response","oracle_answer","oracle_content","reading_text","paid_oracle_text",
    "response_text","answer_text"
}
FORBIDDEN_FRAGMENTS = ("oracle_response","oracle_answer","paid_oracle","reading_text","billing_details","shipping_details")
ALLOWED_SOURCE_KINDS = {"radar_derived","manual_privacy_reviewed","system_fixture"}

class BrainError(Exception): pass
class ValidationError(BrainError): pass
class PrivacyViolation(BrainError): pass
class UnsupportedSemanticSource(BrainError): pass

@dataclass(frozen=True)
class SemanticAnalysis:
    normalized_phrase: str
    signature_tokens: tuple[str, ...]
    semantic_fingerprint: str
    ambiguity: bool
    confidence_score: int
    provider_name: str
    provider_version: str

@dataclass(frozen=True)
class Observation:
    observation_id: str
    text: str
    source_kind: str = "system_fixture"
    evidence_ids: tuple[str, ...] = ()

@dataclass(frozen=True)
class ClusterMember:
    observation_id: str
    similarity_score: int
    reason_code: str

@dataclass(frozen=True)
class Cluster:
    cluster_key: str
    signature_tokens: tuple[str, ...]
    members: tuple[ClusterMember, ...]
    confidence_score: int
    reason_codes: tuple[str, ...]

@dataclass(frozen=True)
class CoverageResolution:
    public_coverage: str
    solution_coverage: str
    state: str
    confidence_score: int
    reason_codes: tuple[str, ...]
    evidence_refs: tuple[str, ...]
    input_hash: str

@dataclass(frozen=True)
class BrainConclusion:
    state: str
    confidence_score: int
    reason_codes: tuple[str, ...]
    evidence_refs: tuple[str, ...]
    input_hash: str

def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()

def load_policy() -> dict[str, Any]:
    data = json.loads(POLICY_FILE.read_text(encoding="utf-8"))
    if data.get("default") != "deny":
        raise ValidationError("brain policy must remain deny-by-default")
    return data

def _contains_direct_pii(value: str) -> bool:
    if EMAIL_RE.search(value) or IBAN_RE.search(value): return True
    if CARDISH_RE.search(value):
        digits = re.sub(r"\D", "", value)
        if 13 <= len(digits) <= 19: return True
    return False

def privacy_scan(value: Any, path: str = "$") -> None:
    if isinstance(value, Mapping):
        for key, child in value.items():
            if not isinstance(key, str): raise PrivacyViolation(f"{path}: non-string key")
            k = key.strip().lower()
            if k in FORBIDDEN_KEYS or any(fragment in k for fragment in FORBIDDEN_FRAGMENTS):
                raise PrivacyViolation(f"{path}.{key}: forbidden PII or paid-content field")
            privacy_scan(child, f"{path}.{key}")
    elif isinstance(value, (list, tuple)):
        for i, child in enumerate(value): privacy_scan(child, f"{path}[{i}]")
    elif isinstance(value, str) and _contains_direct_pii(value):
        raise PrivacyViolation(f"{path}: direct PII detected")

def _strip_accents(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))

def normalize_language(text: str, *, source_kind: str, policy: Optional[Mapping[str, Any]] = None) -> str:
    if source_kind not in ALLOWED_SOURCE_KINDS: raise UnsupportedSemanticSource(source_kind)
    if not isinstance(text, str) or not text.strip(): raise ValidationError("semantic text is required")
    privacy_scan(text)
    cfg = dict(policy or load_policy())
    if len(text) > int(cfg["semantic"].get("max_phrase_length", 500)): raise ValidationError("semantic text exceeds maximum length")
    normalized = _strip_accents(text).casefold()
    normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized: raise ValidationError("semantic text became empty after normalization")
    return normalized

class SemanticProvider:
    name = "abstract"; version = "0"
    def analyze(self, text: str, *, source_kind: str) -> SemanticAnalysis: raise NotImplementedError
    def similarity(self, left: SemanticAnalysis, right: SemanticAnalysis) -> int: raise NotImplementedError

class DeterministicSemanticProvider(SemanticProvider):
    name = "deterministic_lexicon"; version = "1"
    def __init__(self, policy: Optional[Mapping[str, Any]] = None):
        self.policy = dict(policy or load_policy())
        semantic = self.policy["semantic"]
        self.stopwords = set(semantic.get("stopwords", [])); self.synonyms = dict(semantic.get("synonyms", {}))
        self.ambiguous_min = int(semantic.get("ambiguous_min_distinctive_tokens", 2))
    def analyze(self, text: str, *, source_kind: str) -> SemanticAnalysis:
        normalized = normalize_language(text, source_kind=source_kind, policy=self.policy)
        tokens = []
        for raw in normalized.replace("-", " ").split():
            if raw in self.stopwords: continue
            token = self.synonyms.get(raw, raw)
            if len(token) >= 2: tokens.append(token)
        signature = tuple(sorted(set(tokens)))
        ambiguity = len(signature) < self.ambiguous_min
        confidence = min(100, 45 + 10 * len(signature))
        if ambiguity: confidence = min(confidence, int(self.policy["confidence"].get("ambiguous_cap", 49)))
        fp = hashlib.sha256("|".join(signature).encode("utf-8")).hexdigest()
        return SemanticAnalysis(normalized, signature, fp, ambiguity, confidence, self.name, self.version)
    def similarity(self, left: SemanticAnalysis, right: SemanticAnalysis) -> int:
        a, b = set(left.signature_tokens), set(right.signature_tokens)
        if not a and not b: return 100
        if not a or not b: return 0
        return round(100 * len(a & b) / len(a | b))

def deduplicate_analyses(analyses: Iterable[SemanticAnalysis]) -> dict[str, list[SemanticAnalysis]]:
    grouped: dict[str, list[SemanticAnalysis]] = {}
    for item in analyses: grouped.setdefault(item.semantic_fingerprint, []).append(item)
    return grouped

def cluster_observations(observations: Iterable[Observation], provider: SemanticProvider, *, policy: Optional[Mapping[str, Any]] = None) -> tuple[Cluster, ...]:
    cfg = dict(policy or load_policy()); threshold = int(cfg["semantic"]["equivalent_threshold"])
    prepared = [(obs, provider.analyze(obs.text, source_kind=obs.source_kind)) for obs in observations]
    prepared.sort(key=lambda pair: pair[0].observation_id)
    used: set[str] = set(); clusters: list[Cluster] = []
    for obs, analysis in prepared:
        if obs.observation_id in used: continue
        used.add(obs.observation_id)
        members = [ClusterMember(obs.observation_id, 100, "semantic_exact")]; signatures = [analysis]
        reasons = {"semantic_ambiguous"} if analysis.ambiguity else {"semantic_exact"}
        for other, other_analysis in prepared:
            if other.observation_id in used or analysis.ambiguity or other_analysis.ambiguity: continue
            score = provider.similarity(analysis, other_analysis)
            if score >= threshold:
                used.add(other.observation_id)
                reason = "semantic_exact" if analysis.semantic_fingerprint == other_analysis.semantic_fingerprint else "semantic_equivalent"
                members.append(ClusterMember(other.observation_id, score, reason)); signatures.append(other_analysis); reasons.add(reason)
        canonical_tokens = tuple(sorted(set().union(*(set(x.signature_tokens) for x in signatures))))
        cluster_key = hashlib.sha256("|".join(canonical_tokens).encode("utf-8")).hexdigest()
        confidence = min(x.confidence_score for x in signatures)
        if any(x.ambiguity for x in signatures): confidence = min(confidence, int(cfg["confidence"].get("ambiguous_cap", 49)))
        clusters.append(Cluster(cluster_key, canonical_tokens, tuple(members), confidence, tuple(sorted(reasons))))
    return tuple(clusters)

def alias_assessment(alias: SemanticAnalysis, canonical: SemanticAnalysis, provider: SemanticProvider, *, policy: Optional[Mapping[str, Any]] = None) -> BrainConclusion:
    cfg = dict(policy or load_policy()); score = provider.similarity(alias, canonical)
    if alias.ambiguity: state, reasons, confidence = "observe", ("semantic_ambiguous",), min(alias.confidence_score, score)
    elif alias.semantic_fingerprint == canonical.semantic_fingerprint: state, reasons, confidence = "alias_candidate", ("semantic_exact","duplicate_language"), min(100, max(score, alias.confidence_score))
    elif score >= int(cfg["semantic"]["alias_threshold"]): state, reasons, confidence = "alias_candidate", ("semantic_equivalent",), min(score, alias.confidence_score, canonical.confidence_score)
    else: state, reasons, confidence = "observe", ("semantic_not_equivalent",), min(99, score)
    return BrainConclusion(state, confidence, reasons, (), _sha({"alias":alias.semantic_fingerprint,"canonical":canonical.semantic_fingerprint,"score":score,"policy":cfg["policy_version"]}))

def _active_strengths(relations: Iterable[Mapping[str, Any]], id_key: str) -> tuple[list[int], list[str], list[str]]:
    strengths=[]; ids=[]; evidence=[]
    for relation in relations:
        if relation.get("status", "active") != "active": continue
        strength = relation.get("strength")
        if isinstance(strength, bool) or not isinstance(strength, int) or not 0 <= strength <= 100: raise ValidationError("relation strength must be 0..100")
        rid = relation.get(id_key) or relation.get("relation_id")
        if not isinstance(rid, str) or not rid: raise ValidationError(f"{id_key} or relation_id required")
        strengths.append(strength); ids.append(rid)
        ev = relation.get("evidence_ids", ())
        if ev:
            if not isinstance(ev, (list, tuple)): raise ValidationError("evidence_ids must be list/tuple")
            evidence.extend(str(x) for x in ev)
    return strengths, ids, evidence

def resolve_coverage(asset_relations: Iterable[Mapping[str, Any]], solution_relations: Iterable[Mapping[str, Any]], *, conflicting_evidence: bool = False, policy: Optional[Mapping[str, Any]] = None) -> CoverageResolution:
    cfg = dict(policy or load_policy()); pcfg = cfg["coverage"]; sufficient = int(pcfg["sufficient_strength"])
    a_strengths,a_ids,a_evidence = _active_strengths(asset_relations,"asset_id"); s_strengths,s_ids,s_evidence = _active_strengths(solution_relations,"solution_id")
    strong_assets = sum(1 for x in a_strengths if x >= sufficient); strong_solutions = sum(1 for x in s_strengths if x >= sufficient)
    public = "none" if not a_strengths else ("redundant" if strong_assets >= int(pcfg["redundant_strong_asset_count"]) else ("sufficient" if max(a_strengths) >= sufficient else "partial"))
    solution = "none" if not s_strengths else ("multiple" if strong_solutions >= int(pcfg["multiple_solution_strong_count"]) else ("sufficient" if max(s_strengths) >= sufficient else "partial"))
    reasons=[]
    if public=="none": reasons.append("no_public_coverage")
    elif public=="partial": reasons.append("existing_partial_coverage")
    elif public=="sufficient": reasons.append("existing_sufficient_coverage")
    else: reasons.extend(["existing_sufficient_coverage","redundant_public_coverage"])
    if solution=="none": reasons.append("no_solution_coverage")
    elif solution=="partial": reasons.append("partial_solution_fit")
    elif solution=="sufficient": reasons.append("existing_solution_fit")
    else: reasons.extend(["existing_solution_fit","multiple_solution_fit"])
    if public=="none" and solution=="none": state="gap"
    elif public=="partial": state="reinforcement_candidate"
    elif public=="none" and solution in {"sufficient","multiple","partial"}: state="internal_candidate"
    else: state="covered"
    all_strengths=a_strengths+s_strengths; confidence=round(sum(all_strengths)/len(all_strengths)) if all_strengths else 55
    if public in {"sufficient","redundant"} or solution in {"sufficient","multiple"}: confidence=max(confidence,80)
    if conflicting_evidence:
        reasons.append("evidence_conflict"); confidence=max(0,confidence-int(cfg["confidence"]["conflict_penalty"])); state="observe"
    evidence_refs=tuple(sorted(set(a_evidence+s_evidence)))
    payload={"asset_ids":sorted(a_ids),"solution_ids":sorted(s_ids),"asset_strengths":sorted(a_strengths),"solution_strengths":sorted(s_strengths),"conflict":conflicting_evidence,"policy":cfg["policy_version"]}
    return CoverageResolution(public,solution,state,confidence,tuple(reasons),evidence_refs,_sha(payload))

def make_internal_candidate(*, kind: str, coverage: CoverageResolution, cluster_key: str, need_id: Optional[str]=None, intent_id: Optional[str]=None, journey_context: Optional[Mapping[str, Any]]=None, economic_context: Optional[Mapping[str, Any]]=None) -> dict[str, Any]:
    if kind not in {"content_intent","alias","reinforcement"}: raise ValidationError("unsupported candidate kind")
    context: dict[str,Any]={}
    if journey_context:
        allowed={"journey_count","conversion_count","first_touch_count","assisted_touch_count","last_touch_count"}; unknown=set(journey_context)-allowed
        if unknown: raise ValidationError("journey context contains non-allowlisted fields")
        context["journey"]=dict(journey_context)
    if economic_context:
        allowed={"revenue_minor","currency","immediate_contribution_minor","continuation_expected_value_minor","expected_total_value_minor","human_effort_minutes","scalability_score","repeatability_class","confidence_class"}; unknown=set(economic_context)-allowed
        if unknown: raise ValidationError("economic context contains non-allowlisted fields")
        context["economics"]=dict(economic_context)
    privacy_scan(context)
    state_map={"content_intent":"internal_candidate","alias":"alias_candidate","reinforcement":"reinforcement_candidate"}; reasons=list(coverage.reason_codes)
    if journey_context and journey_context.get("conversion_count",0): reasons.append("journey_support")
    if economic_context and economic_context.get("immediate_contribution_minor") is not None: reasons.append("economic_support")
    payload={"kind":kind,"cluster_key":cluster_key,"need_id":need_id,"intent_id":intent_id,"coverage":coverage.input_hash,"context":context}
    return {"candidate_kind":kind,"state":state_map[kind],"confidence_score":coverage.confidence_score,"reason_codes":tuple(dict.fromkeys(reasons)),"evidence_refs":coverage.evidence_refs,"context":context,"input_hash":_sha(payload),"public_side_effects":False}

def combine_confidence(*scores: int, conflicting: bool=False, policy: Optional[Mapping[str, Any]]=None) -> int:
    if not scores: return 0
    if any(isinstance(x,bool) or not isinstance(x,int) or not 0<=x<=100 for x in scores): raise ValidationError("confidence scores must be integers 0..100")
    value=round(sum(scores)/len(scores))
    if conflicting: value=max(0,value-int(dict(policy or load_policy())["confidence"]["conflict_penalty"]))
    return value
