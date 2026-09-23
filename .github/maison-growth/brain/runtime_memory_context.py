#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class RuntimeMemoryContext:
    refs_by_territory: Mapping[str,tuple[str,...]]
    status: Mapping[str,object]


def _is_true(value: object) -> bool:
    return str(value or "").strip().lower()=="true"


def representative_queries(
    feed: Sequence[Mapping[str,Any]],
    *,
    max_territories: int,
) -> tuple[tuple[str,str],...]:
    if not 1 <= max_territories <= 50:
        raise ValueError("max_territories_must_be_1_50")
    best:dict[str,str]={}
    for row in feed:
        territory=str(row.get("territory_key") or "").strip()
        text=str(row.get("response_excerpt") or "").strip()
        if not territory or not text:
            continue
        current=best.get(territory,"")
        if len(text)>len(current):
            best[territory]=text
    return tuple(sorted(best.items()))[:max_territories]


def _merge(
    target: dict[str,tuple[str,...]],
    territory: str,
    refs: Sequence[str],
) -> None:
    current=list(target.get(territory,()))
    current.extend(str(x) for x in refs if x)
    target[territory]=tuple(dict.fromkeys(current))


def _semantic_context(
    queries: Sequence[tuple[str,str]],
    *,
    limit: int,
) -> tuple[dict[str,tuple[str,...]],dict[str,object]]:
    if not _is_true(os.environ.get("MAISON_SEMANTIC_CONTEXT_ENABLED")):
        return {},{"enabled":False,"state":"disabled"}

    dsn=os.environ.get("MAISON_SEMANTIC_DATABASE_URL","").strip()
    if not dsn:
        return {},{"enabled":True,"state":"not_configured","reason":"database_url_missing"}

    try:
        import psycopg
        from local_embeddings import MultilingualE5SmallProvider
        from semantic_pgvector import PgvectorSemanticReader
    except Exception as exc:
        return {},{"enabled":True,"state":"unavailable","reason":type(exc).__name__}

    out:dict[str,tuple[str,...]]={}
    try:
        embedder=MultilingualE5SmallProvider(
            device=os.environ.get("MAISON_EMBEDDING_DEVICE","cpu")
        )
        with psycopg.connect(dsn) as conn:
            reader=PgvectorSemanticReader(conn=conn,embedder=embedder)
            for territory,query in queries:
                hits=reader.search(
                    query,
                    limit=limit,
                    filters={"privacy_class":"public"},
                )
                _merge(out,territory,tuple(f"semantic:{hit.document_id}" for hit in hits))
    except Exception as exc:
        return out,{
            "enabled":True,
            "state":"error",
            "reason":type(exc).__name__,
            "partial_territories":len(out),
        }
    return out,{"enabled":True,"state":"ok","territories":len(out)}


async def _osiris_context_async(
    queries: Sequence[tuple[str,str]],
    *,
    limit: int,
) -> tuple[dict[str,tuple[str,...]],dict[str,object]]:
    if not _is_true(os.environ.get("MAISON_OSIRIS_CONTEXT_ENABLED")):
        return {},{"enabled":False,"state":"disabled"}

    url=os.environ.get("OSIRIS_MCP_URL","").strip()
    if not url:
        return {},{"enabled":True,"state":"not_configured","reason":"mcp_url_missing"}

    try:
        from osiris_context import graph_search
    except Exception as exc:
        return {},{"enabled":True,"state":"unavailable","reason":type(exc).__name__}

    project=os.environ.get("OSIRIS_PROJECT") or None
    max_depth=int(os.environ.get("MAISON_OSIRIS_CONTEXT_MAX_DEPTH","1"))
    out:dict[str,tuple[str,...]]={}
    errors=[]
    for territory,query in queries:
        try:
            hits=await graph_search(
                mcp_url=url,
                query=query,
                project=project,
                max_depth=max_depth,
            )
            _merge(out,territory,tuple(hit.ref for hit in hits[:limit]))
        except Exception as exc:
            errors.append(f"{territory}:{type(exc).__name__}")
    if errors:
        return out,{
            "enabled":True,
            "state":"partial_error" if out else "error",
            "errors":tuple(errors[:10]),
            "territories":len(out),
        }
    return out,{"enabled":True,"state":"ok","territories":len(out)}


def collect_runtime_memory_context(
    feed: Sequence[Mapping[str,Any]],
) -> RuntimeMemoryContext:
    max_territories=int(os.environ.get("MAISON_MEMORY_CONTEXT_MAX_TERRITORIES","8"))
    limit=int(os.environ.get("MAISON_MEMORY_CONTEXT_LIMIT","5"))
    if not 1 <= limit <= 20:
        raise ValueError("memory_context_limit_must_be_1_20")

    queries=representative_queries(feed,max_territories=max_territories)
    refs:dict[str,tuple[str,...]]={}

    semantic,semantic_status=_semantic_context(queries,limit=limit)
    for territory,items in semantic.items():
        _merge(refs,territory,items)

    osiris,osiris_status=asyncio.run(_osiris_context_async(queries,limit=limit))
    for territory,items in osiris.items():
        _merge(refs,territory,items)

    return RuntimeMemoryContext(
        refs_by_territory=refs,
        status={
            "semantic":semantic_status,
            "osiris":osiris_status,
            "query_territories":len(queries),
            "independent_evidence_roots_added":0,
        },
    )
