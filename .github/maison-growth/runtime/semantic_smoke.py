#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

BRAIN=Path(__file__).resolve().parents[1]/"brain"
sys.path.insert(0,str(BRAIN))

from local_embeddings import MultilingualE5SmallProvider
from semantic_memory import SemanticDocument
from semantic_pgvector import PgvectorSemanticMemory


def main() -> None:
    dsn=os.environ["MAISON_SEMANTIC_DATABASE_URL"]
    embedder=MultilingualE5SmallProvider(device=os.environ.get("MAISON_EMBEDDING_DEVICE","cpu"))
    with psycopg.connect(dsn) as conn:
        memory=PgvectorSemanticMemory(conn=conn,embedder=embedder)
        doc=SemanticDocument(
            document_id="smoke:maison-semantic-memory",
            text="Maison semantic memory smoke test",
            evidence_ref=None,
            territory_key="system",
            knowledge_type="OBSERVATION",
            observed_at=None,
            language="en",
            confidence=1.0,
            privacy_class="system",
            metadata={"fixture":True},
        )
        memory.upsert((doc,))
        hits=memory.search(
            "semantic memory smoke test",
            limit=3,
            filters={"territory_key":"system","privacy_class":"system"},
        )
        if not hits or hits[0].document_id != doc.document_id:
            raise SystemExit("semantic_smoke_failed")
        print("Maison Semantic Memory pgvector smoke: OK")


if __name__=="__main__":
    main()
