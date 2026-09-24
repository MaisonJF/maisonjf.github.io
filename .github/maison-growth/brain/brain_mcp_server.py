#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any, Optional

import psycopg
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations

from commercial_assets import CommercialAssetContext
from commercial_ocean_matrix import build_ocean_matrix
from build_commercial_attention import load_attention as load_commercial_attention
from digital_experience_coverage import load_coverage as load_digital_experience_coverage
from commercial_readiness_board import build_board
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


def _commercial_assets() -> CommercialAssetContext:
    # MCP intentionally exposes catalogue-derived context only. Private stock/cost overlay
    # is not loaded through this general agent-facing read surface.
    return CommercialAssetContext.from_files(ROOT/"commercial-assets.generated.json")


def _commercial_attention() -> dict[str,Any]:
    return load_commercial_attention()


def _commercial_bundles() -> dict[str,Any]:
    return json.loads((ROOT/"commercial-bundles.generated.json").read_text(encoding="utf-8"))


def _digital_experience_coverage() -> dict[str,Any]:
    return load_digital_experience_coverage()


def _semantic_search_sync(
    query: str,
    *,
    territory_key: Optional[str],
    knowledge_type: Optional[str],
    language: Optional[str],
    privacy_class: Optional[str],
    limit: int,
) -> list[dict[str,Any]]:
    dsn=os.environ.get("MAISON_SEMANTIC_DATABASE_URL","").strip()
    if not dsn:
        return [{"state":"not_configured","reason":"MAISON_SEMANTIC_DATABASE_URL_missing"}]
    filters:dict[str,object]={}
    if privacy_class:
        if privacy_class not in {"public","system","aggregated","internal_non_pii"}:
            raise ValueError("unsupported_privacy_class")
        filters["privacy_class"]=privacy_class
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
def maison_commercial_action_inbox(limit: int=20) -> dict[str,Any]:
    """Read-only commercial decision/manual-pilot/A8-draft inbox. No execution authority."""
    if not 1 <= limit <= 100:
        raise ValueError("limit_must_be_1_100")
    client=_control_client()
    result=dict(client.action_inbox(limit=limit))
    result["mcp_public_write_authorized"]=False
    result["mcp_outbound_authorized"]=False
    result["mcp_spend_authorized"]=False
    result["mcp_experiment_execution_authorized"]=False
    return result


@mcp.tool(annotations=READ_ONLY)
def maison_commercial_asset_search(query: str, limit: int=6) -> dict[str,Any]:
    """Search Maison's derived product/service catalogue context; no private stock/cost overlay."""
    if not query.strip():
        raise ValueError("query_required")
    if not 1 <= limit <= 30:
        raise ValueError("limit_must_be_1_30")
    hits=_commercial_assets().search(query,limit=limit)
    return {
        "query":query,
        "private_operational_overlay_exposed":False,
        "hits":[
            {
                "ref":hit.ref,
                "label":hit.label,
                "score":hit.score,
                "asset_type":hit.asset_type,
                "lifecycle_status":hit.lifecycle_status,
                "public":hit.public,
                "price_minor":hit.price_minor,
                "currency":hit.currency,
                "catalogue_availability":hit.catalogue_availability,
                "known_operational_fields":hit.known_operational_fields,
                "unknown_operational_fields":hit.unknown_operational_fields,
            }
            for hit in hits
        ],
    }


@mcp.tool(annotations=READ_ONLY)
def maison_commercial_attention(
    limit: int=10,
    asset_type: str | None=None,
) -> dict[str,Any]:
    """Read the internal Ocean-informed commercial attention ranking; never a profit forecast."""
    if not 1 <= limit <= 30:
        raise ValueError("limit_must_be_1_30")
    allowed={None,"physical_product","digital_product","service","b2b_service"}
    if asset_type not in allowed:
        raise ValueError("unsupported_asset_type")
    payload=_commercial_attention()
    rows=payload.get("assets",[])
    if asset_type is not None:
        rows=[row for row in rows if row.get("asset_type")==asset_type]
    return {
        "mode":"read_only",
        "attention_score_is_not_profit_score":True,
        "execution_authority":False,
        "summary":payload.get("summary",{}),
        "assets":rows[:limit],
    }


@mcp.tool(annotations=READ_ONLY)
def maison_digital_experience_coverage(
    territory: str | None=None,
    limit: int=20,
) -> dict[str,Any]:
    """Read how current Oceans feed Oráculo and PÁRA DE IGNORAR! without exposing paid bodies."""
    if not 1 <= limit <= 100:
        raise ValueError("limit_must_be_1_100")
    payload=_digital_experience_coverage()
    rows=payload.get("oceans",[])
    if territory is not None:
        key=territory.strip()
        if not key:
            raise ValueError("territory_required")
        rows=[row for row in rows if row.get("territory")==key]
    return {
        "mode":"read_only",
        "paid_bodies_exposed":False,
        "automatic_activation_authorized":False,
        "execution_authority":False,
        "summary":payload.get("summary",{}),
        "products":payload.get("products",{}),
        "oceans":rows[:limit],
    }


@mcp.tool(annotations=READ_ONLY)
def maison_ocean_commercial_matrix(
    territory: str | None=None,
    limit: int=20,
) -> dict[str,Any]:
    """Read current Ocean → digital-feed + existing-offer coverage; no launch recommendation or execution."""
    if not 1 <= limit <= 100:
        raise ValueError("limit_must_be_1_100")
    payload=build_ocean_matrix()
    rows=payload.get("oceans",[])
    if territory is not None:
        key=territory.strip()
        if not key:
            raise ValueError("territory_required")
        rows=[row for row in rows if row.get("territory")==key]
    return {
        "mode":"read_only",
        "attention_score_is_not_profit_score":True,
        "feed_eligibility_is_not_commercial_demand":True,
        "execution_authority":False,
        "summary":payload.get("summary",{}),
        "oceans":rows[:limit],
    }


@mcp.tool(annotations=READ_ONLY)
def maison_commercial_readiness(limit: int=12) -> dict[str,Any]:
    """Read commercial readiness and next fact to verify; current stock is never a structural gate."""
    if not 1 <= limit <= 30:
        raise ValueError("limit_must_be_1_30")
    board=build_board()
    return {
        "mode":"read_only",
        "private_operational_overlay_exposed":False,
        "stock_snapshot_is_readiness_gate":False,
        "replenishment_capacity_is_structural":True,
        "execution_authority":False,
        "summary":board.get("summary",{}),
        "rows":board.get("rows",[])[:limit],
    }


@mcp.tool(annotations=READ_ONLY)
def maison_commercial_bundle_hypotheses(limit: int=10) -> dict[str,Any]:
    """Read internal physical bundle drafts; catalogue subtotals are not approved bundle prices."""
    if not 1 <= limit <= 30:
        raise ValueError("limit_must_be_1_30")
    payload=_commercial_bundles()
    return {
        "mode":"read_only",
        "bundle_price_authorized":False,
        "public_write_authorized":False,
        "automatic_checkout_authorized":False,
        "summary":payload.get("summary",{}),
        "bundles":payload.get("bundles",[])[:limit],
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
    privacy_class: str | None=None,
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
        privacy_class=privacy_class,
        limit=limit,
    )
    return {"query":query,"hits":hits}


if __name__=="__main__":
    mcp.run(transport="streamable-http")
