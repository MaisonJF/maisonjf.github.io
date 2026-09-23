#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, Sequence


@dataclass(frozen=True)
class KnowledgeRef:
    ref: str
    source_kind: str
    label: str
    score: float
    evidence_refs: tuple[str,...]


@dataclass(frozen=True)
class OceanCommercialHint:
    """Internal Ocean metadata that may help route a signal to Maison assets.

    These hints are supporting commercial context only. They are never counted as
    independent evidence roots and never grant publication, outbound or spend authority.
    """

    ref: str
    territory: str
    score: float
    commercial_adjacency: str
    intent: str
    pain_language: str
    question_theme_candidates: tuple[str,...]


def _tokens(text: str) -> frozenset[str]:
    return frozenset(
        x
        for x in re.sub(r"[^a-zA-ZÀ-ÿ0-9]+"," ",text.lower()).split()
        if len(x)>2
    )


def _overlap(query: str,text: str) -> float:
    a,b=_tokens(query),_tokens(text)
    if not a or not b:
        return 0.0
    return len(a & b)/len(a | b)


class OceanEditorialContext:
    """Read-only adapter over internal Ocean/editorial metadata.

    It indexes labels/focus/evidence descriptors only for general knowledge search.
    Commercial hint search may additionally use pain/intent/adjacency metadata, but never
    exposes paid Oracle bodies or turns internal editorial context into canonical evidence.
    """

    def __init__(self, payload: Mapping[str,object]):
        self.payload=payload

    @classmethod
    def from_file(cls, path: Path) -> "OceanEditorialContext":
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def search(self, query: str, *, limit: int=8) -> tuple[KnowledgeRef,...]:
        rows=[]
        growth=self.payload.get("pdiGrowth",{}) if isinstance(self.payload,Mapping) else {}
        themes=growth.get("themes",[]) if isinstance(growth,Mapping) else []
        for theme in themes if isinstance(themes,list) else []:
            if not isinstance(theme,Mapping):
                continue
            label=str(theme.get("preferredLabel",""))
            key=str(theme.get("candidateKey",""))
            evidence=theme.get("evidence",[])
            chunks=[label,key]
            evrefs=[]
            for ev in evidence if isinstance(evidence,list) else []:
                if not isinstance(ev,Mapping):
                    continue
                chunks.extend([str(ev.get("focus","")),str(ev.get("family",""))])
                src=str(ev.get("source",""))
                sid=str(ev.get("sourceId",""))
                if src and sid:
                    evrefs.append(f"{src}:{sid}")
            score=_overlap(query," ".join(chunks))
            if score <= 0:
                continue
            rows.append(KnowledgeRef(
                ref=f"ocean:{key}",
                source_kind="ocean_editorial_metadata",
                label=label or key,
                score=score,
                evidence_refs=tuple(sorted(set(evrefs))),
            ))
        return tuple(sorted(rows,key=lambda x:(-x.score,x.ref))[:limit])

    def commercial_hints(
        self,
        query: str,
        *,
        limit: int=5,
    ) -> tuple[OceanCommercialHint,...]:
        """Find Ocean commercial-adjacency metadata related to a signal.

        Editorial queue contains a question and an oracle row for many Ocean territories.
        The method deduplicates by territory and returns only abstract metadata.
        """
        if not 1 <= limit <= 20:
            raise ValueError("limit_must_be_1_20")
        items=self.payload.get("items",[]) if isinstance(self.payload,Mapping) else []
        best:dict[str,OceanCommercialHint]={}
        for item in items if isinstance(items,list) else []:
            if not isinstance(item,Mapping):
                continue
            territory=str(item.get("territory") or item.get("sourceOceanId") or "").strip()
            if not territory:
                continue
            adjacency=str(item.get("commercialAdjacency") or "").strip()
            intent=str(item.get("intent") or "").strip()
            pain=str(item.get("painLanguage") or "").strip()
            themes_raw=item.get("questionThemeCandidates",[])
            themes=tuple(
                str(x).strip()
                for x in themes_raw
                if str(x).strip()
            ) if isinstance(themes_raw,list) else ()
            haystack=" ".join((territory,pain,intent,adjacency,*themes))
            score=_overlap(query,haystack)
            if score <= 0:
                continue
            hint=OceanCommercialHint(
                ref=f"ocean-commercial:{territory}",
                territory=territory,
                score=score,
                commercial_adjacency=adjacency,
                intent=intent,
                pain_language=pain,
                question_theme_candidates=themes,
            )
            previous=best.get(territory)
            if previous is None or hint.score > previous.score:
                best[territory]=hint
        return tuple(sorted(best.values(),key=lambda x:(-x.score,x.ref))[:limit])


class ReferenceContext:
    """Accepts already-produced semantic/Osiris references from their own backends."""

    def __init__(self, *, source_kind: str, refs: Iterable[Mapping[str,object]]):
        self.source_kind=source_kind
        self.refs=tuple(dict(x) for x in refs)

    def search(self, query: str, *, limit: int=8) -> tuple[KnowledgeRef,...]:
        rows=[]
        for item in self.refs:
            text=" ".join(str(item.get(k,"")) for k in ("label","text","territory_key","knowledge_type"))
            score=float(item.get("score",_overlap(query,text)))
            if score <= 0:
                continue
            rows.append(KnowledgeRef(
                ref=str(item["ref"]),
                source_kind=self.source_kind,
                label=str(item.get("label",item["ref"])),
                score=score,
                evidence_refs=tuple(str(x) for x in item.get("evidence_refs",()) if x),
            ))
        return tuple(sorted(rows,key=lambda x:(-x.score,x.ref))[:limit])


def compose_context(
    query: str,
    providers: Sequence[object],
    *,
    per_provider_limit: int=5,
) -> tuple[KnowledgeRef,...]:
    collected={}
    for provider in providers:
        for hit in provider.search(query,limit=per_provider_limit):
            old=collected.get(hit.ref)
            if old is None or hit.score > old.score:
                collected[hit.ref]=hit
    return tuple(sorted(collected.values(),key=lambda x:(-x.score,x.ref)))
