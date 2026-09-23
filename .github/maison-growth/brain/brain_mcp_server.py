#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any, Optional

import psycopg
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations

from knowledge_context import OceanEditorialContext
from local_embeddings import MultilingualE5SmallProvider
from osiris_context import graph_search as osiris_graph_search
from semantic_pgvector import PgvectorSemanticReader


ROOT=Path(__file__).resolve().parent
GROWTH=ROOT.parent
PORT=int(os.environ.get("MAISON_BRAIN_MCP_PORT","8792"))

READ_ONLY=ToolAnnotations(
    readOnlyHint=True,
    destructiveHint=False,
    idempotentHint=True,
    openWorldHint=False,
)

mcp=FastMCP(
    "Maison Brain Read Context",
    instructions=(
        "Read-only Maison intelligence context. Tools may retrieve internal status, "
        "curated Oceanos metadata, Semantic Memory projections and private Osiris graph context. "
        "This server has no outreach, publishing, catalogue, price, checkout or spend tools."
    ),
    host="0.0.0.0",
    port=PORT,
    streamable_http_path="/mcp",
    json_response=True,
    stateless_http=True,
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[
            f"127.0.0.1:{PORT}",
            f"localhost:{PORT}",
            f"brain-mcp:{PORT}",
        ],
        allowed_origins=[],
    ),
)


def _status_text() -> str:
    return (GROWTH/"BRAIN_RUNTIME_STATUS.md").read_text(encoding="utf-8")


def _ocean_context() -> OceanEditorialContext:
    return OceanEditorialContext.from_file(ROOT/"editorial-queue.json")


def _semantic_search_sync(
    query: str,
    *,
    territory_key: Optional[str],
    knowledge_type: Optional[str],
    language: Optional[str],
    limit: int,
) -> list[dict[str,Any]]:
    dsn=os.environ.get("MAISON_SEMANTIC_DATABASE_URL","").strip()
    if not dsn:
        return [{"state":"not_configured","reason":"MAISON_SEMANTIC_DATABASE_URL_missing"}]
    filters:dict[str,object]={"privacy_class":"public"}
    if territory_key: filters["territory_key"]=territory_key
    if knowledge_type: filters["knowledge_type"]=knowledge_type
    if language: filters["language"]=language
    embedder=MultilingualE5SmallProvider(device=os.environ.get("MAISON_EMBEDDING_DEVICE","cpu"))
    with psycopg.connect(dsn) as conn:
        reader=PgvectorSemanticReader(conn=conn,embedder=embedder)
        hits=reader.search(query,limit=limit,filters=filters)
    return [
        {
            "ref":f"semantic:{hit.document_id}",
            "score":hit.score,
            "canonical_evidence_ref":hit.evidence_ref,
            "metadata":dict(hit.metadata),
        }
        for hit in hits
    ]


@mcp.tool(annotations=READ_ONLY)
def maison_brain_status() -> dict[str,Any]:
    """Return the canonical repository status of Maison Brain organs and runtime."""
    return {"mode":"read_only","status_markdown":_status_text()}


@mcp.tool(annotations=READ_ONLY)
def maison_ocean_search(query: str, limit: int=8) -> dict[str,Any]:
    """Search internal Oceanos/editorial metadata only; never returns paid Oráculo bodies."""
    if not 1 <= limit <= 30:
        raise ValueError("limit_must_be_1_30")
    hits=_ocean_context().search(query,limit=limit)
    return {
        "query":query,
        "hits":[
            {
                "ref":hit.ref,
                "label":hit.label,
                "score":hit.score,
                "source_kind":hit.source_kind,
                "evidence_refs":hit.evidence_refs,
            }
            for hit in hits
        ],
    }


@mcp.tool(annotations=READ_ONLY)
async def maison_osiris_search(
    query: str,
    project: str | None=None,
    max_depth: int=1,
) -> dict[str,Any]:
    """Search private Osiris graph context through MCP; no direct graph database access."""
    url=os.environ.get("OSIRIS_MCP_URL","http://osiris-mcp:8790/mcp")
    hits=await osiris_graph_search(
        mcp_url=url,
        query=query,
        project=project,
        max_depth=max_depth,
    )
    return {
        "query":query,
        "hits":[
            {
                "ref":hit.ref,
                "label":hit.label,
                "score":hit.score,
                "evidence_refs":hit.evidence_refs,
            }
            for hit in hits
        ],
    }


@mcp.tool(annotations=READ_ONLY)
async def maison_semantic_search(
    query: str,
    territory_key: str | None=None,
    knowledge_type: str | None=None,
    language: str | None=None,
    limit: int=10,
) -> dict[str,Any]:
    """Search the rebuildable pgvector Semantic Memory projection read-only."""
    if not query.strip():
        raise ValueError("query_required")
    if not 1 <= limit <= 30:
        raise ValueError("limit_must_be_1_30")
    hits=await asyncio.to_thread(
        _semantic_search_sync,
        query,
        territory_key=territory_key,
        knowledge_type=knowledge_type,
        language=language,
        limit=limit,
    )
    return {"query":query,"hits":hits}


if __name__=="__main__":
    mcp.run(transport="streamable-http")
