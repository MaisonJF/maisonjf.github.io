#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Mapping, Protocol, Sequence

from semantic_memory import SemanticDocument, SemanticHit, validate_document


class PgvectorError(RuntimeError):
    pass


class EmbeddingProvider(Protocol):
    model_id: str
    dimensions: int
    def embed(self, text: str) -> Sequence[float]: ...


def _vector_literal(values: Sequence[float], dimensions: int) -> str:
    if len(values) != dimensions:
        raise PgvectorError(f"embedding_dimension_mismatch:{len(values)}!={dimensions}")
    return "[" + ",".join(format(float(x), ".10g") for x in values) + "]"


def _content_hash(doc: SemanticDocument) -> str:
    payload={
        "document_id":doc.document_id,
        "text":doc.text,
        "evidence_ref":doc.evidence_ref,
        "territory_key":doc.territory_key,
        "knowledge_type":doc.knowledge_type,
        "observed_at":doc.observed_at,
        "language":doc.language,
        "confidence":doc.confidence,
        "privacy_class":doc.privacy_class,
        "metadata":dict(doc.metadata),
    }
    raw=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(",",":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def provision_pgvector_schema(conn, *, dimensions: int, embedding_model_id: str) -> None:
    """Create/reuse the rebuildable semantic projection.

    Dimension/model are explicit configuration. A mismatch refuses startup instead
    of silently mixing incompatible embeddings in one index.
    """
    if not 1 <= dimensions <= 2000:
        raise PgvectorError("pgvector_vector_dimensions_must_be_1_2000")
    if not embedding_model_id.strip():
        raise PgvectorError("embedding_model_id_required")

    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS maison_semantic_config(
              singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
              embedding_model_id TEXT NOT NULL,
              dimensions INTEGER NOT NULL CHECK(dimensions BETWEEN 1 AND 2000),
              created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        cur.execute("SELECT embedding_model_id,dimensions FROM maison_semantic_config WHERE singleton=TRUE")
        row=cur.fetchone()
        if row is None:
            cur.execute(
                "INSERT INTO maison_semantic_config(singleton,embedding_model_id,dimensions) VALUES(TRUE,%s,%s)",
                (embedding_model_id,dimensions),
            )
        elif row[0] != embedding_model_id or int(row[1]) != dimensions:
            raise PgvectorError("semantic_embedding_configuration_mismatch")

        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS maison_semantic_documents(
              document_id TEXT PRIMARY KEY,
              text TEXT NOT NULL,
              embedding vector({dimensions}) NOT NULL,
              canonical_evidence_ref TEXT NULL,
              territory_key TEXT NULL,
              knowledge_type TEXT NOT NULL CHECK(knowledge_type IN (
                'FACT','OBSERVATION','PATTERN','INFERENCE','HYPOTHESIS','OPPORTUNITY'
              )),
              observed_at TIMESTAMPTZ NULL,
              language TEXT NULL,
              confidence REAL NULL CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 1),
              privacy_class TEXT NOT NULL CHECK(privacy_class IN (
                'public','system','aggregated','internal_non_pii'
              )),
              metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
              content_hash CHAR(64) NOT NULL,
              embedding_model_id TEXT NOT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_maison_semantic_territory
            ON maison_semantic_documents(territory_key,knowledge_type)
        """)
        cur.execute("""
            SELECT 1 FROM pg_indexes
            WHERE schemaname=current_schema()
              AND indexname='idx_maison_semantic_embedding_hnsw'
        """)
        if cur.fetchone() is None:
            cur.execute("""
                CREATE INDEX idx_maison_semantic_embedding_hnsw
                ON maison_semantic_documents
                USING hnsw (embedding vector_cosine_ops)
            """)
    conn.commit()


@dataclass
class PgvectorSemanticMemory:
    conn: object
    embedder: EmbeddingProvider

    @property
    def name(self) -> str:
        return "pgvector"

    def __post_init__(self) -> None:
        provision_pgvector_schema(
            self.conn,
            dimensions=int(self.embedder.dimensions),
            embedding_model_id=str(self.embedder.model_id),
        )

    def upsert(self, documents: Iterable[SemanticDocument]) -> None:
        rows=[]
        for doc in documents:
            validate_document(doc)
            vector=_vector_literal(self.embedder.embed(doc.text),self.embedder.dimensions)
            rows.append((
                doc.document_id,doc.text,vector,doc.evidence_ref,doc.territory_key,
                doc.knowledge_type,doc.observed_at,doc.language,doc.confidence,
                doc.privacy_class,json.dumps(dict(doc.metadata),ensure_ascii=False),
                _content_hash(doc),self.embedder.model_id,
            ))
        if not rows:
            return
        with self.conn.cursor() as cur:
            cur.executemany("""
                INSERT INTO maison_semantic_documents(
                  document_id,text,embedding,canonical_evidence_ref,territory_key,
                  knowledge_type,observed_at,language,confidence,privacy_class,
                  metadata,content_hash,embedding_model_id,updated_at
                )
                VALUES(%s,%s,%s::vector,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,now())
                ON CONFLICT(document_id) DO UPDATE SET
                  text=excluded.text,
                  embedding=excluded.embedding,
                  canonical_evidence_ref=excluded.canonical_evidence_ref,
                  territory_key=excluded.territory_key,
                  knowledge_type=excluded.knowledge_type,
                  observed_at=excluded.observed_at,
                  language=excluded.language,
                  confidence=excluded.confidence,
                  privacy_class=excluded.privacy_class,
                  metadata=excluded.metadata,
                  content_hash=excluded.content_hash,
                  embedding_model_id=excluded.embedding_model_id,
                  updated_at=now()
            """,rows)
        self.conn.commit()

    def search(self, query: str, *, limit: int, filters: Mapping[str,object]) -> Sequence[SemanticHit]:
        if limit < 1 or limit > 100:
            raise PgvectorError("limit_must_be_1_100")
        vector=_vector_literal(self.embedder.embed(query),self.embedder.dimensions)
        where=["embedding_model_id=%s"]
        params:list[object]=[self.embedder.model_id]
        allowed={"territory_key","knowledge_type","privacy_class","language"}
        for key,value in filters.items():
            if key not in allowed:
                raise PgvectorError(f"unsupported_filter:{key}")
            where.append(f"{key}=%s")
            params.append(value)
        params.extend([vector,limit])
        sql=f"""
            SELECT document_id,
                   1-(embedding <=> %s::vector) AS score,
                   canonical_evidence_ref,
                   metadata
            FROM maison_semantic_documents
            WHERE {' AND '.join(where)}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        # Query vector is needed once in SELECT and once in ORDER BY.
        query_params=[self.embedder.model_id]
        for key,value in filters.items():
            query_params.append(value)
        query_params.extend([vector,vector,limit])
        with self.conn.cursor() as cur:
            cur.execute(sql,query_params)
            rows=cur.fetchall()
        return tuple(
            SemanticHit(
                document_id=row[0],
                score=float(row[1]),
                evidence_ref=row[2],
                metadata=dict(row[3] or {}),
            )
            for row in rows
        )
