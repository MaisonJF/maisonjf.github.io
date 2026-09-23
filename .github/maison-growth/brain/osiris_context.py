#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Mapping, Optional
from urllib.parse import urlparse


class OsirisContextError(RuntimeError):
    pass


@dataclass(frozen=True)
class OsirisContextHit:
    ref: str
    label: str
    score: float
    evidence_refs: tuple[str,...]
    raw: Mapping[str,Any]


def _safe_mcp_url(url: str) -> str:
    parsed=urlparse(url)
    if parsed.scheme not in {"http","https"}:
        raise OsirisContextError("unsupported_mcp_scheme")
    local_hosts={"127.0.0.1","localhost","osiris-mcp"}
    if parsed.scheme=="http" and parsed.hostname not in local_hosts:
        raise OsirisContextError("nonlocal_osiris_mcp_requires_https")
    if not parsed.path.endswith("/mcp"):
        raise OsirisContextError("osiris_mcp_path_required")
    return url


def _result_payload(result: Any) -> Any:
    structured=getattr(result,"structuredContent",None)
    if structured is not None:
        return structured
    blocks=getattr(result,"content",None) or ()
    texts=[]
    for block in blocks:
        text=getattr(block,"text",None)
        if isinstance(text,str):
            texts.append(text)
    if not texts:
        return {}
    joined="\n".join(texts)
    try:
        return json.loads(joined)
    except Exception:
        return {"text":joined}


def normalize_graph_search(payload: Any) -> tuple[OsirisContextHit,...]:
    if isinstance(payload,Mapping):
        hits=payload.get("hits",())
        if not isinstance(hits,list):
            # Some Osiris tools wrap the data one level deeper.
            for key in ("result","data","context"):
                nested=payload.get(key)
                if isinstance(nested,Mapping) and isinstance(nested.get("hits"),list):
                    hits=nested["hits"]; break
    elif isinstance(payload,list):
        hits=payload
    else:
        hits=()

    out=[]
    for idx,item in enumerate(hits):
        if not isinstance(item,Mapping):
            continue
        raw_ref=item.get("id") or item.get("canonical") or item.get("ref")
        if not raw_ref:
            continue
        label=item.get("display_label") or item.get("label") or item.get("canonical") or raw_ref
        raw_score=item.get("score")
        if raw_score is None:
            raw_score=item.get("rank")
        try:
            score=float(raw_score) if raw_score is not None else 1.0/(idx+1)
        except (TypeError,ValueError):
            score=1.0/(idx+1)
        # Retrieval rank is not evidence confidence. Clamp only for the context-composition interface.
        score=max(0.0,min(score,1.0))
        evidence=[]
        for key in ("evidence_refs","evidence_ids","sources"):
            value=item.get(key)
            if isinstance(value,(list,tuple)):
                evidence.extend(str(x) for x in value if x)
        source=item.get("source")
        if source:
            evidence.append(f"osiris-source:{source}")
        out.append(OsirisContextHit(
            ref=f"osiris:{raw_ref}",
            label=str(label),
            score=score,
            evidence_refs=tuple(sorted(set(evidence))),
            raw=dict(item),
        ))
    return tuple(out)


async def graph_search(
    *,
    mcp_url: str,
    query: str,
    project: Optional[str]=None,
    max_depth: int=1,
) -> tuple[OsirisContextHit,...]:
    if not query.strip():
        raise OsirisContextError("query_required")
    if not 0 <= max_depth <= 3:
        raise OsirisContextError("max_depth_must_be_0_3")
    url=_safe_mcp_url(mcp_url)

    try:
        from mcp import ClientSession
        from mcp.client.streamable_http import streamablehttp_client
    except Exception as exc:
        raise OsirisContextError("mcp_client_not_available") from exc

    args:dict[str,Any]={"query":query.strip(),"max_depth":max_depth}
    if project:
        args["project"]=project

    async with streamablehttp_client(url) as (read_stream,write_stream,_):
        async with ClientSession(read_stream,write_stream) as session:
            await session.initialize()
            result=await session.call_tool("graph_search",arguments=args)
    return normalize_graph_search(_result_payload(result))
