#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from knowledge_context import KnowledgeRef


def _tokens(text: str) -> frozenset[str]:
    return frozenset(
        x for x in re.sub(r"[^a-zA-ZÀ-ÿ0-9]+"," ",text.lower()).split()
        if len(x)>2
    )


def _overlap(query: str, text: str) -> float:
    a,b=_tokens(query),_tokens(text)
    if not a or not b:
        return 0.0
    return len(a & b)/len(a | b)


@dataclass(frozen=True)
class PublicDiscoveryHit:
    ref: str
    url: str
    title: str
    description: str
    group: str
    source_file: str
    schema_types: tuple[str,...]
    score: float


class PublicDiscoveryContext:
    """Read-only adapter over the public discovery graph.

    The source is derived exclusively from indexable public MAISON pages. It is
    evidence/provenance context for search/GEO/AEO work, never publication or
    commercial execution authority.
    """

    def __init__(self, payload: Mapping[str,object]):
        self.payload=payload

    @classmethod
    def from_file(cls, path: Path) -> "PublicDiscoveryContext":
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def search(self, query: str, *, limit: int=10) -> tuple[PublicDiscoveryHit,...]:
        if not query.strip():
            raise ValueError("query_required")
        if not 1 <= limit <= 50:
            raise ValueError("limit_must_be_1_50")
        rows=[]
        pages=self.payload.get("pages",[]) if isinstance(self.payload,Mapping) else []
        for page in pages if isinstance(pages,list) else []:
            if not isinstance(page,Mapping):
                continue
            structured=page.get("structured_data",{})
            schema_types=tuple(
                str(x) for x in (structured.get("types",[]) if isinstance(structured,Mapping) else [])
            )
            url=str(page.get("url",""))
            title=str(page.get("title",""))
            description=str(page.get("description",""))
            group=str(page.get("group",""))
            source_file=str(page.get("source_file",""))
            haystack=" ".join((url,title,description,group,*schema_types))
            score=_overlap(query,haystack)
            if score<=0:
                continue
            rows.append(PublicDiscoveryHit(
                ref=f"public:{url}",
                url=url,title=title,description=description,group=group,
                source_file=source_file,schema_types=schema_types,score=score,
            ))
        return tuple(sorted(rows,key=lambda x:(-x.score,x.url))[:limit])

    def as_knowledge_refs(self, query: str, *, limit: int=10) -> tuple[KnowledgeRef,...]:
        return tuple(
            KnowledgeRef(
                ref=hit.ref,
                source_kind="public_discovery_graph",
                label=hit.title or hit.url,
                score=hit.score,
                evidence_refs=(hit.url,hit.source_file),
            )
            for hit in self.search(query,limit=limit)
        )
