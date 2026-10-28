#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import threading
import time
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


_RUNTIME_OCEAN_CACHE: dict[str,object] = {"fetched_at":0.0,"payload":None}
_RUNTIME_OCEAN_CACHE_LOCK=threading.Lock()


def fetch_runtime_specialist_catalog(*,refresh_seconds:float=45.0) -> Mapping[str,object] | None:
    """Read approved dynamic specialist records from the authenticated private Worker.

    Repository snapshot remains the deterministic fallback. Errors never expose token
    values or prevent the Brain from answering from its local context.
    """
    base_url=(os.environ.get("BRAIN_CONTROL_API_URL") or os.environ.get("MAISON_BRAIN_PRIVATE_URL") or "").strip()
    token=(os.environ.get("BRAIN_CONTROL_TOKEN") or os.environ.get("MAISON_BRAIN_CONTROL_TOKEN") or "").strip()
    if not base_url or not token:
        return None

    now=time.monotonic()
    with _RUNTIME_OCEAN_CACHE_LOCK:
        cached_at=float(_RUNTIME_OCEAN_CACHE.get("fetched_at") or 0.0)
        cached=_RUNTIME_OCEAN_CACHE.get("payload")
        if now-cached_at<max(0.0,refresh_seconds):
            return cached if isinstance(cached,Mapping) else None
        try:
            from brain_control_client import BrainControlClient
            client=BrainControlClient(
                base_url=base_url,
                token=token,
                access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID") or os.environ.get("MAISON_CF_ACCESS_CLIENT_ID"),
                access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET") or os.environ.get("MAISON_CF_ACCESS_CLIENT_SECRET"),
                timeout=3.0,
                max_bytes=2_000_000,
            )
            payload=client.ocean_catalog()
            _RUNTIME_OCEAN_CACHE.update({"fetched_at":now,"payload":payload})
            return payload
        except Exception:
            _RUNTIME_OCEAN_CACHE.update({"fetched_at":now,"payload":None})
            return None


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

    @classmethod
    def from_files(
        cls,
        canonical_path: Path,
        specialist_path: Path | None = None,
        *,
        runtime_catalog: Mapping[str,object] | None = None,
    ) -> "OceanEditorialContext":
        """Join canonical candidate signals and the specialist Ocean graph.

        Static catalogue data guarantees a deterministic fallback. A validated private
        runtime catalogue can overlay that snapshot and supply human-approved D1 records.
        The merge is by stable key; evidence and lifecycle authority remain separate.
        """
        payload=json.loads(canonical_path.read_text(encoding="utf-8"))
        if not isinstance(payload,dict):
            payload={"candidates":payload if isinstance(payload,list) else []}
        specialist={}
        if specialist_path is not None and specialist_path.exists():
            loaded=json.loads(specialist_path.read_text(encoding="utf-8"))
            if isinstance(loaded,Mapping):
                specialist=dict(loaded)

        static_oceans=specialist.get("oceans",[]) if isinstance(specialist.get("oceans",[]),list) else []
        static_pillars=specialist.get("pillars",[]) if isinstance(specialist.get("pillars",[]),list) else []
        ocean_map={
            str(row.get("ocean_key") or row.get("id") or "").strip():dict(row)
            for row in static_oceans if isinstance(row,Mapping) and str(row.get("ocean_key") or row.get("id") or "").strip()
        }
        pillar_map={
            str(row.get("key") or row.get("pillar_key") or "").strip():dict(row)
            for row in static_pillars if isinstance(row,Mapping) and str(row.get("key") or row.get("pillar_key") or "").strip()
        }
        catalog_version=specialist.get("catalog_version")
        runtime_loaded=False
        if isinstance(runtime_catalog,Mapping) and runtime_catalog.get("kind")=="ocean_specialist_catalog":
            runtime_rows=runtime_catalog.get("rows",[])
            runtime_pillars=runtime_catalog.get("pillars",[])
            if isinstance(runtime_rows,list) and isinstance(runtime_pillars,list):
                for row in runtime_rows:
                    if not isinstance(row,Mapping):
                        continue
                    key=str(row.get("ocean_key") or row.get("id") or "").strip()
                    if key:
                        ocean_map[key]={**ocean_map.get(key,{}),**dict(row)}
                for row in runtime_pillars:
                    if not isinstance(row,Mapping):
                        continue
                    key=str(row.get("key") or row.get("pillar_key") or "").strip()
                    if key:
                        pillar_map[key]={**pillar_map.get(key,{}),**dict(row)}
                catalog_version=runtime_catalog.get("version") or catalog_version
                runtime_loaded=True

        payload={**payload,
            "specialistOceans":list(ocean_map.values()),
            "specialistPillars":list(pillar_map.values()),
            "specialistCatalogVersion":catalog_version,
            "specialistCatalogSource":"private_runtime_plus_snapshot" if runtime_loaded else "snapshot",
            "specialistRuntimeLoaded":runtime_loaded,
        }
        return cls(payload)

    def _specialist_oceans(self) -> list[Mapping[str,object]]:
        raw=self.payload.get("specialistOceans",[]) if isinstance(self.payload,Mapping) else []
        return [x for x in raw if isinstance(x,Mapping)] if isinstance(raw,list) else []

    def _specialist_pillars(self) -> list[Mapping[str,object]]:
        raw=self.payload.get("specialistPillars",[]) if isinstance(self.payload,Mapping) else []
        return [x for x in raw if isinstance(x,Mapping)] if isinstance(raw,list) else []

    def _canonical_candidates(self) -> list[Mapping[str,object]]:
        raw=self.payload.get("candidates",[]) if isinstance(self.payload,Mapping) else []
        return [x for x in raw if isinstance(x,Mapping)] if isinstance(raw,list) else []

    def search(self, query: str, *, limit: int=8) -> tuple[KnowledgeRef,...]:
        rows=[]
        candidates=self._canonical_candidates()
        for item in candidates:
            territory=str(item.get("territory") or item.get("id") or item.get("slug") or "").strip()
            if not territory:
                continue
            label=str(item.get("preferredLabel") or item.get("painLanguage") or territory)
            evidence=item.get("evidence",[])
            evidence_refs=tuple(str(x) for x in evidence if str(x).strip()) if isinstance(evidence,list) else ()
            themes=item.get("questionThemeCandidates",[])
            haystack=" ".join((
                territory,
                label,
                str(item.get("painLanguage") or ""),
                str(item.get("intent") or ""),
                str(item.get("commercialAdjacency") or ""),
                " ".join(str(x) for x in themes if str(x).strip()) if isinstance(themes,list) else "",
            ))
            score=_overlap(query,haystack)
            if score>0:
                rows.append(KnowledgeRef(
                    ref=f"ocean:{territory}",
                    source_kind="ocean_canonical_candidate",
                    label=label,
                    score=score,
                    evidence_refs=evidence_refs,
                ))

        # Specialist Oceans are searchable by their own identity, mission, focus and
        # graph neighbours. Graph edges are context, never independent evidence roots.
        for item in self._specialist_oceans():
            key=str(item.get("ocean_key") or item.get("id") or "").strip()
            if not key:
                continue
            label=str(item.get("display_name") or item.get("name") or key)
            focus=item.get("focus",[])
            connections=item.get("connections",[])
            haystack=" ".join((
                key,label,str(item.get("pillar_key") or ""),str(item.get("mission") or ""),
                " ".join(str(x) for x in focus if str(x).strip()) if isinstance(focus,list) else "",
                " ".join(str(x) for x in connections if str(x).strip()) if isinstance(connections,list) else "",
            ))
            score=_overlap(query,haystack)
            if score>0:
                rows.append(KnowledgeRef(
                    ref=f"specialist-ocean:{key}",
                    source_kind="ocean_specialist_metadata",
                    label=label,
                    score=score,
                    evidence_refs=(),
                ))

        for item in self._specialist_pillars():
            key=str(item.get("key") or item.get("pillar_key") or "").strip()
            if not key:
                continue
            label=str(item.get("name") or item.get("display_name") or key)
            connections=item.get("connections",[])
            focus=item.get("focus",[])
            haystack=" ".join((
                key,label,str(item.get("mission") or ""),
                " ".join(str(x) for x in focus if str(x).strip()) if isinstance(focus,list) else "",
                " ".join(str(x) for x in connections if str(x).strip()) if isinstance(connections,list) else "",
            ))
            score=_overlap(query,haystack)
            if score>0:
                rows.append(KnowledgeRef(
                    ref=f"specialist-pillar:{key}",
                    source_kind="ocean_pillar_metadata",
                    label=label,
                    score=score,
                    evidence_refs=(),
                ))

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
            if score > 0:
                rows.append(KnowledgeRef(
                    ref=f"ocean:{key}",
                    source_kind="ocean_editorial_metadata",
                    label=label or key,
                    score=score,
                    evidence_refs=tuple(sorted(set(evrefs))),
                ))
        # A pillar and its linked Ocean may both match; deduplicate by reference only.
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
        candidates=self._canonical_candidates()
        items=candidates if candidates else self.payload.get("items",[]) if isinstance(self.payload,Mapping) else []
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
