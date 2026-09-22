from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

TRACKING_PARAMS = {
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","mc_cid","mc_eid"
}
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")

ALLOWED_SOURCE_CLASSES = {
    "ai_api","ai_web_grounded","public_web","user_contributed_memory"
}

def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def canonicalize_url(url: str) -> str:
    p = urlsplit(url.strip())
    if p.scheme not in {"http", "https"} or not p.netloc:
        raise ValueError("citation_url_invalid")
    host = p.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if k.lower() not in TRACKING_PARAMS]
    path = p.path or "/"
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return urlunsplit((p.scheme.lower(), host, path, urlencode(sorted(query)), ""))

def privacy_review(text: str) -> None:
    if EMAIL_RE.search(text or ""):
        raise ValueError("direct_pii_email")
    if PHONE_RE.search(text or ""):
        raise ValueError("direct_pii_phone")

def consent_ok(consent: dict | None) -> bool:
    if not isinstance(consent, dict):
        return False
    required = {"consent_version","granted_at","scope","user_selected_content","revocable"}
    return required.issubset(consent) and consent["user_selected_content"] is True and consent["revocable"] is True

@dataclass(frozen=True)
class Observation:
    provider_id: str
    model_id: str | None
    source_class: str
    retrieved_at: str
    prompt_fingerprint: str | None
    response_hash: str
    citations: tuple[str, ...]
    grounding_state: str
    consent_receipt_hash: str | None

    def as_dict(self):
        return asdict(self)

def normalize_observation(*, provider_id: str, model_id: str | None,
                          source_class: str, response_text: str,
                          prompt: str | None = None,
                          citations: list[str] | None = None,
                          consent: dict | None = None,
                          retrieved_at: str | None = None) -> Observation:
    if source_class not in ALLOWED_SOURCE_CLASSES:
        raise ValueError("source_class_not_allowlisted")
    privacy_review(response_text)

    if source_class == "user_contributed_memory":
        if not consent_ok(consent):
            raise ValueError("explicit_consent_required")
        consent_hash = sha256_text(json.dumps(consent, sort_keys=True, separators=(",", ":")))
    else:
        if consent is not None:
            raise ValueError("consent_only_valid_for_user_contribution")
        consent_hash = None

    canon = tuple(sorted({canonicalize_url(u) for u in (citations or [])}))
    grounding_state = "grounded" if canon else "ungrounded"
    when = retrieved_at or datetime.now(timezone.utc).isoformat()

    return Observation(
        provider_id=provider_id.strip().lower(),
        model_id=model_id.strip() if isinstance(model_id, str) and model_id.strip() else None,
        source_class=source_class,
        retrieved_at=when,
        prompt_fingerprint=sha256_text(prompt) if prompt else None,
        response_hash=sha256_text(response_text),
        citations=canon,
        grounding_state=grounding_state,
        consent_receipt_hash=consent_hash,
    )

def convergence_summary(observations: list[Observation]) -> dict:
    roots = set()
    providers = set()
    grounded = 0
    ungrounded = 0
    for obs in observations:
        providers.add(obs.provider_id)
        if obs.citations:
            grounded += 1
            roots.update(obs.citations)
        else:
            ungrounded += 1
    return {
        "model_observation_count": len(observations),
        "provider_count": len(providers),
        "grounded_observation_count": grounded,
        "ungrounded_observation_count": ungrounded,
        "independent_evidence_root_count": len(roots),
        "independent_evidence_roots": sorted(roots),
    }
