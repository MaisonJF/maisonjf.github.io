#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

import psycopg

from brain_control_client import BrainControlClient
from local_embeddings import MultilingualE5SmallProvider
from semantic_memory import SemanticDocument
from semantic_pgvector import PgvectorSemanticMemory


SOURCE_KEY="a13_control_feed_v1"


@dataclass(frozen=True)
class SyncStats:
    pages: int
    rows_seen: int
    documents_upserted: int
    rows_skipped: int
    final_after: str | None
    final_after_id: str | None


def _prefixes(raw: str) -> tuple[str,...]:
    return tuple(dict.fromkeys(
        item.strip().lower()
        for item in raw.split(",")
        if item.strip()
    ))


def semantic_row_eligible(
    row: Mapping[str,Any],
    *,
    provider_prefixes: Sequence[str],
) -> bool:
    provider=str(row.get("provider_id") or "").lower()
    text=str(row.get("response_excerpt") or "").strip()
    evidence=str(row.get("evidence_id") or "").strip()
    if not provider or not text or not evidence:
        return False
    if not provider_prefixes:
        return False
    return any(provider.startswith(prefix) for prefix in provider_prefixes)


def row_to_document(row: Mapping[str,Any]) -> SemanticDocument:
    observation_id=str(row["observation_id"])
    roots=row.get("independent_roots",[])
    root_count=len(roots) if isinstance(roots,(list,tuple)) else 0
    return SemanticDocument(
        document_id=f"a13:{observation_id}",
        text=str(row["response_excerpt"]),
        evidence_ref=str(row["evidence_id"]),
        territory_key=str(row.get("territory_key") or "") or None,
        knowledge_type="OBSERVATION",
        observed_at=str(row.get("observed_at") or "") or None,
        language=None,
        confidence=float(row["confidence"]) if row.get("confidence") is not None else None,
        privacy_class="system",
        metadata={
            "source_projection":"a13",
            "provider_id":str(row.get("provider_id") or ""),
            "model_id":row.get("model_id"),
            "source_class":str(row.get("source_class") or ""),
            "grounding_state":str(row.get("grounding_state") or ""),
            "need_id":row.get("need_id"),
            "intent_id":row.get("intent_id"),
            "semantic_observation_id":row.get("semantic_observation_id"),
            "independent_root_count":root_count,
        },
    )


def _cursor(conn) -> tuple[str|None,str|None]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT after_ts,after_id FROM maison_semantic_sync_state WHERE source_key=%s",
            (SOURCE_KEY,),
        )
        row=cur.fetchone()
    return (row[0],row[1]) if row else (None,None)


def _save_cursor(conn, after: str|None, after_id: str|None) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO maison_semantic_sync_state(source_key,after_ts,after_id,updated_at)
            VALUES(%s,%s,%s,now())
            ON CONFLICT(source_key) DO UPDATE SET
              after_ts=excluded.after_ts,
              after_id=excluded.after_id,
              updated_at=now()
        """,(SOURCE_KEY,after,after_id))
    conn.commit()


def sync_semantic_projection(
    *,
    client: BrainControlClient,
    conn,
    embedder: MultilingualE5SmallProvider,
    provider_prefixes: Sequence[str],
    page_size: int=100,
    max_pages: int=20,
) -> SyncStats:
    if not 1 <= page_size <= 100:
        raise ValueError("page_size_must_be_1_100")
    if not 1 <= max_pages <= 1000:
        raise ValueError("max_pages_must_be_1_1000")

    memory=PgvectorSemanticMemory(conn=conn,embedder=embedder)
    after,after_id=_cursor(conn)
    pages=rows_seen=upserted=skipped=0

    while pages < max_pages:
        payload=client.feed(limit=page_size,after=after,after_id=after_id)
        rows=payload.get("rows",[])
        if not isinstance(rows,list) or not rows:
            break
        pages+=1
        rows_seen+=len(rows)

        docs=[]
        for row in rows:
            if not isinstance(row,Mapping):
                skipped+=1
                continue
            if not semantic_row_eligible(row,provider_prefixes=provider_prefixes):
                skipped+=1
                continue
            docs.append(row_to_document(row))

        if docs:
            memory.upsert(docs)
            upserted+=len(docs)

        cursor=payload.get("next_cursor")
        if not isinstance(cursor,Mapping):
            break
        next_after=str(cursor.get("after") or "") or None
        next_id=str(cursor.get("after_id") or "") or None
        if not next_after or not next_id:
            break
        if next_after==after and next_id==after_id:
            raise RuntimeError("semantic_sync_cursor_did_not_advance")
        after,after_id=next_after,next_id
        _save_cursor(conn,after,after_id)

        if len(rows) < page_size:
            break

    return SyncStats(
        pages=pages,
        rows_seen=rows_seen,
        documents_upserted=upserted,
        rows_skipped=skipped,
        final_after=after,
        final_after_id=after_id,
    )


def main() -> None:
    prefixes=_prefixes(os.environ.get("MAISON_SEMANTIC_SYNC_PROVIDER_PREFIXES",""))
    if not prefixes:
        raise SystemExit("No semantic-sync provider prefixes approved; refusing to embed.")

    client=BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )
    embedder=MultilingualE5SmallProvider(
        device=os.environ.get("MAISON_EMBEDDING_DEVICE","cpu")
    )
    with psycopg.connect(os.environ["MAISON_SEMANTIC_DATABASE_URL"]) as conn:
        stats=sync_semantic_projection(
            client=client,
            conn=conn,
            embedder=embedder,
            provider_prefixes=prefixes,
            page_size=int(os.environ.get("MAISON_SEMANTIC_SYNC_PAGE_SIZE","100")),
            max_pages=int(os.environ.get("MAISON_SEMANTIC_SYNC_MAX_PAGES","20")),
        )
    print(json.dumps(stats.__dict__,indent=2,sort_keys=True))


if __name__=="__main__":
    main()
