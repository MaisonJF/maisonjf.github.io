#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Optional, Protocol


class PreBrainError(ValueError):
    pass


@dataclass(frozen=True)
class Signal:
    signal_id: str
    territory_key: str
    source_kind: str
    text: str
    evidence_refs: tuple[str, ...]
    independent_roots: tuple[str, ...]
    observed_at: str
    confidence: float
    metadata: Mapping[str, Any]


@dataclass(frozen=True)
class SignalGroup:
    group_id: str
    territory_key: str
    signal_ids: tuple[str, ...]
    evidence_refs: tuple[str, ...]
    independent_roots: tuple[str, ...]
    representative_text: str
    confidence: float
    convergence_count: int


class AnalyticalBackend(Protocol):
    name: str
    def available(self) -> bool: ...
    def summarize(self, rows: Iterable[Mapping[str, Any]]) -> Mapping[str, Any]: ...


class DuckDBBackend:
    name = "duckdb"

    def available(self) -> bool:
        try:
            import duckdb  # noqa:F401
            return True
        except Exception:
            return False

    def summarize(self, rows: Iterable[Mapping[str, Any]]) -> Mapping[str, Any]:
        try:
            import duckdb
        except Exception as exc:
            raise PreBrainError("duckdb_not_available") from exc
        materialized=[dict(x) for x in rows]
        con=duckdb.connect(":memory:")
        try:
            con.execute("CREATE TABLE signals(territory_key VARCHAR, confidence DOUBLE)")
            con.executemany(
                "INSERT INTO signals VALUES (?,?)",
                [(str(r.get("territory_key","")),float(r.get("confidence",0))) for r in materialized],
            )
            out=con.execute(
                "SELECT territory_key,count(*) AS n,avg(confidence) AS avg_confidence "
                "FROM signals GROUP BY territory_key ORDER BY territory_key"
            ).fetchall()
            return {"backend":self.name,"groups":[
                {"territory_key":row[0],"count":row[1],"avg_confidence":row[2]} for row in out
            ]}
        finally:
            con.close()


class PolarsBackend:
    name = "polars"

    def available(self) -> bool:
        try:
            import polars  # noqa:F401
            return True
        except Exception:
            return False

    def summarize(self, rows: Iterable[Mapping[str, Any]]) -> Mapping[str, Any]:
        try:
            import polars as pl
        except Exception as exc:
            raise PreBrainError("polars_not_available") from exc
        materialized=[dict(x) for x in rows]
        if not materialized:
            return {"backend":self.name,"groups":[]}
        frame=pl.DataFrame(materialized)
        out=(frame.group_by("territory_key")
             .agg(pl.len().alias("count"),pl.col("confidence").mean().alias("avg_confidence"))
             .sort("territory_key"))
        return {"backend":self.name,"groups":out.to_dicts()}


def _canonical(value: Any) -> str:
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))


def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _tokens(text: str) -> frozenset[str]:
    return frozenset(x for x in "".join(ch.lower() if ch.isalnum() else " " for ch in text).split() if len(x)>2)


def _similarity(left: str,right: str) -> float:
    a,b=_tokens(left),_tokens(right)
    if not a and not b: return 1.0
    if not a or not b: return 0.0
    return len(a & b)/len(a | b)


def normalize_a13_observation(row: Mapping[str, Any]) -> Signal:
    required=("observation_id","territory_key","source_class","response_excerpt","observed_at")
    missing=[k for k in required if not row.get(k)]
    if missing:
        raise PreBrainError("missing_a13_fields:"+",".join(missing))
    evidence=tuple(sorted(set(str(x) for x in row.get("evidence_refs",()) if x)))
    roots=tuple(sorted(set(str(x) for x in row.get("independent_roots",()) if x)))
    confidence=float(row.get("confidence",0.0))
    if not 0 <= confidence <= 1:
        raise PreBrainError("confidence_must_be_0_1")
    return Signal(
        signal_id=str(row["observation_id"]),
        territory_key=str(row["territory_key"]),
        source_kind=str(row["source_class"]),
        text=str(row["response_excerpt"]).strip(),
        evidence_refs=evidence,
        independent_roots=roots,
        observed_at=str(row["observed_at"]),
        confidence=confidence,
        metadata=dict(row.get("metadata",{})),
    )


def converge_signals(
    signals: Iterable[Signal],
    *,
    similarity_threshold: float,
    minimum_independent_roots: int,
) -> tuple[SignalGroup,...]:
    if not 0 <= similarity_threshold <= 1:
        raise PreBrainError("invalid_similarity_threshold")
    if minimum_independent_roots < 1:
        raise PreBrainError("minimum_independent_roots_must_be_positive")
    ordered=sorted(signals,key=lambda x:(x.territory_key,x.observed_at,x.signal_id))
    used:set[str]=set()
    groups:list[SignalGroup]=[]
    for seed in ordered:
        if seed.signal_id in used: continue
        members=[seed]; used.add(seed.signal_id)
        for other in ordered:
            if other.signal_id in used or other.territory_key != seed.territory_key: continue
            if _similarity(seed.text,other.text) >= similarity_threshold:
                members.append(other); used.add(other.signal_id)
        roots=tuple(sorted(set(r for m in members for r in m.independent_roots)))
        evidence=tuple(sorted(set(e for m in members for e in m.evidence_refs)))
        confidence=sum(m.confidence for m in members)/len(members)
        if len(roots) < minimum_independent_roots:
            confidence *= len(roots)/minimum_independent_roots
        payload={
            "territory_key":seed.territory_key,
            "signal_ids":[m.signal_id for m in members],
            "roots":roots,
        }
        groups.append(SignalGroup(
            group_id="pbg_"+_sha(payload)[:36],
            territory_key=seed.territory_key,
            signal_ids=tuple(m.signal_id for m in members),
            evidence_refs=evidence,
            independent_roots=roots,
            representative_text=max(members,key=lambda x:len(x.text)).text,
            confidence=round(min(max(confidence,0.0),1.0),4),
            convergence_count=len(members),
        ))
    return tuple(groups)
