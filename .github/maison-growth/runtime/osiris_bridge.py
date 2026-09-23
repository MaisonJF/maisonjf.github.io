from __future__ import annotations

import hmac
import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from src.actions.core import Actions
from src.db.pool import create_pool
from src.parsers.base import EvidenceClass


EXPECTED_SCHEMA = "maison.osiris-memory.observation.v1"
ACTOR = "maison:a13-bridge"
SOURCE_ID = "maison:a13"


class A13Observation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema: str
    source: str
    observation_id: str = Field(min_length=1, max_length=160)
    event_id: str = Field(min_length=1, max_length=160)
    provider_id: str = Field(min_length=1, max_length=160)
    model_id: str | None = Field(default=None, max_length=240)
    source_class: str = Field(min_length=1, max_length=80)
    territory_key: str = Field(min_length=1, max_length=120)
    grounding_state: str = Field(min_length=1, max_length=40)
    observed_at: str = Field(min_length=1, max_length=80)
    confidence_class: str | None = Field(default=None, max_length=80)
    independent_evidence_roots: int = Field(ge=0)
    citations: list[str] = Field(default_factory=list, max_length=100)
    text: str = Field(min_length=1, max_length=9000)


def _parse_observed_at(value: str) -> datetime:
    raw=value[:-1] + "+00:00" if value.endswith("Z") else value
    dt=datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        raise ValueError("observed_at_requires_timezone")
    return dt.astimezone(UTC)


def _bearer_ok(header: str | None) -> bool:
    expected=os.environ.get("MAISON_OSIRIS_BRIDGE_TOKEN","")
    if not expected or not header or not header.startswith("Bearer "):
        return False
    supplied=header.removeprefix("Bearer ").strip()
    return hmac.compare_digest(supplied,expected)


@asynccontextmanager
async def lifespan(app: FastAPI):
    dsn=os.environ["DATABASE_URL"]
    pool=await create_pool(dsn,min_size=1,max_size=5,application_name="maison-osiris-bridge")
    app.state.pool=pool
    try:
        yield
    finally:
        await pool.close()


app=FastAPI(title="Maison A13 → Osiris Memory Bridge",lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status":"ok","mode":"observe_only"}


@app.post("/ingest/a13")
async def ingest_a13(
    body: A13Observation,
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if not _bearer_ok(authorization):
        raise HTTPException(status_code=401,detail="unauthorized")
    if body.schema != EXPECTED_SCHEMA or body.source != "maison-a13":
        raise HTTPException(status_code=400,detail="unsupported_envelope")
    try:
        observed_at=_parse_observed_at(body.observed_at)
    except ValueError as exc:
        raise HTTPException(status_code=400,detail=str(exc)) from exc

    pool=request.app.state.pool
    actions=Actions(pool)
    canonical=f"maison:a13:{body.observation_id}"

    async with actions.atomic() as tx:
        oid=await tx.create_or_find_object(
            "MaisonExternalObservation",
            canonical,
            actor=ACTOR,
        )
        props={
            "observation_id":body.observation_id,
            "event_id":body.event_id,
            "provider_id":body.provider_id,
            "model_id":body.model_id,
            "source_class":body.source_class,
            "territory_key":body.territory_key,
            "grounding_state":body.grounding_state,
            "confidence_class":body.confidence_class,
            "independent_evidence_roots":body.independent_evidence_roots,
            "citations":body.citations,
            "text":body.text,
            "source_system":"maison-a13",
        }
        for name,value in props.items():
            if value is None:
                continue
            await tx.assert_property(
                oid,
                name,
                value,
                SOURCE_ID,
                observed_at,
                0.9,
                evidence_class=EvidenceClass.DIRECT_OBSERVATION.value,
                actor=ACTOR,
            )

    return {
        "mirrored":True,
        "canonical":canonical,
        "observation_id":body.observation_id,
    }
