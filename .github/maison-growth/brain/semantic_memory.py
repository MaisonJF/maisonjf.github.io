#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Optional, Protocol, Sequence


class SemanticMemoryError(ValueError):
    pass


@dataclass(frozen=True)
class SemanticDocument:
    document_id: str
    text: str
    evidence_ref: Optional[str]
    territory_key: Optional[str]
    knowledge_type: str
    observed_at: Optional[str]
    language: Optional[str]
    confidence: Optional[float]
    privacy_class: str
    metadata: Mapping[str,object]


@dataclass(frozen=True)
class SemanticHit:
    document_id: str
    score: float
    evidence_ref: Optional[str]
    metadata: Mapping[str,object]


class SemanticMemoryBackend(Protocol):
    name: str
    def upsert(self, documents: Iterable[SemanticDocument]) -> None: ...
    def search(self, query: str, *, limit: int, filters: Mapping[str,object]) -> Sequence[SemanticHit]: ...


ALLOWED_KNOWLEDGE_TYPES={"FACT","OBSERVATION","PATTERN","INFERENCE","HYPOTHESIS","OPPORTUNITY"}
ALLOWED_PRIVACY={"public","system","aggregated","internal_non_pii"}


def validate_document(doc: SemanticDocument) -> None:
    if doc.knowledge_type not in ALLOWED_KNOWLEDGE_TYPES:
        raise SemanticMemoryError("unsupported_knowledge_type")
    if doc.privacy_class not in ALLOWED_PRIVACY:
        raise SemanticMemoryError("semantic_memory_privacy_class_rejected")
    if doc.confidence is not None and not 0 <= doc.confidence <= 1:
        raise SemanticMemoryError("confidence_must_be_0_1")
    forbidden=("paid_oracle","oracle_answer","reading_text","customer_email","phone","address")
    blob=(doc.text+" "+str(dict(doc.metadata))).lower()
    if any(x in blob for x in forbidden):
        raise SemanticMemoryError("prohibited_content")


def make_metadata(doc: SemanticDocument) -> dict[str,object]:
    validate_document(doc)
    return {
        "canonical_evidence_ref":doc.evidence_ref,
        "territory_key":doc.territory_key,
        "knowledge_type":doc.knowledge_type,
        "observed_at":doc.observed_at,
        "language":doc.language,
        "confidence":doc.confidence,
        "privacy_class":doc.privacy_class,
        **dict(doc.metadata),
    }
