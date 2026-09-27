#!/usr/bin/env python3
"""Durable, append-only recovery journal for internal MAISON commercial work.

This module preserves intent. It never writes catalogues, prices, checkout or public
surfaces. Callers must capture first, perform their separately-authorized write,
then acknowledge integration only after readback.
"""
from __future__ import annotations
import hashlib, json, sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

SCHEMA = """
CREATE TABLE IF NOT EXISTS commercial_recovery_journal (
 recovery_id TEXT PRIMARY KEY,
 kind TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 intended_destination TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('captured','pending_write','integrated','superseded','rejected')),
 source_ref TEXT,
 evidence_refs_json TEXT NOT NULL DEFAULT '[]',
 attempt_count INTEGER NOT NULL DEFAULT 0,
 last_error TEXT,
 integrated_ref TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
"""
FORBIDDEN_KEYS={"pii","private_conversation","private_conversations","paid_content_body","credentials","payment_data","password","token","secret"}

class RecoveryError(ValueError): pass

def _now()->str:
    return datetime.now(timezone.utc).isoformat()

def _json(v:Any)->str:
    return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))

def _assert_safe(value:Any,path:str="payload")->None:
    if isinstance(value,Mapping):
        for k,v in value.items():
            key=str(k).lower()
            if key in FORBIDDEN_KEYS:
                raise RecoveryError(f"forbidden_payload_key:{path}.{k}")
            _assert_safe(v,f"{path}.{k}")
    elif isinstance(value,(list,tuple)):
        for i,v in enumerate(value): _assert_safe(v,f"{path}[{i}]")

def recovery_id(kind:str,payload:Mapping[str,Any],destination:str)->str:
    digest=hashlib.sha256(_json({"kind":kind,"payload":payload,"destination":destination}).encode()).hexdigest()[:24]
    return f"recovery_{digest}"

@dataclass
class CommercialRecoveryJournal:
    connection: sqlite3.Connection
    def __post_init__(self)->None:
        self.connection.executescript(SCHEMA)

    def capture(self,*,kind:str,payload:Mapping[str,Any],intended_destination:str,source_ref:str|None=None,evidence_refs:list[str]|None=None)->str:
        _assert_safe(payload)
        rid=recovery_id(kind,payload,intended_destination)
        now=_now()
        self.connection.execute(
          """INSERT OR IGNORE INTO commercial_recovery_journal
          (recovery_id,kind,payload_json,intended_destination,state,source_ref,evidence_refs_json,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?)""",
          (rid,kind,_json(payload),intended_destination,"captured",source_ref,_json(evidence_refs or []),now,now))
        self.connection.commit()
        return rid

    def record_failure(self,recovery_id:str,error:str)->None:
        cur=self.connection.execute(
          """UPDATE commercial_recovery_journal SET state='pending_write',
          attempt_count=attempt_count+1,last_error=?,updated_at=?
          WHERE recovery_id=? AND state NOT IN ('integrated','superseded','rejected')""",
          (str(error)[:1000],_now(),recovery_id))
        if cur.rowcount!=1: raise RecoveryError("recovery_record_not_retryable")
        self.connection.commit()

    def mark_integrated(self,recovery_id:str,integrated_ref:str,*,readback_verified:bool)->None:
        if not readback_verified: raise RecoveryError("readback_required")
        cur=self.connection.execute(
          """UPDATE commercial_recovery_journal SET state='integrated',
          integrated_ref=?,last_error=NULL,updated_at=? WHERE recovery_id=?
          AND state IN ('captured','pending_write')""",
          (integrated_ref,_now(),recovery_id))
        if cur.rowcount!=1: raise RecoveryError("recovery_record_not_integratable")
        self.connection.commit()

    def unresolved(self)->list[dict[str,Any]]:
        rows=self.connection.execute(
          """SELECT recovery_id,kind,payload_json,intended_destination,state,source_ref,
          evidence_refs_json,attempt_count,last_error,created_at,updated_at
          FROM commercial_recovery_journal WHERE state IN ('captured','pending_write')
          ORDER BY created_at,recovery_id""").fetchall()
        keys=("recovery_id","kind","payload_json","intended_destination","state","source_ref","evidence_refs_json","attempt_count","last_error","created_at","updated_at")
        out=[]
        for row in rows:
            item=dict(zip(keys,row))
            item["payload"]=json.loads(item.pop("payload_json"))
            item["evidence_refs"]=json.loads(item.pop("evidence_refs_json"))
            out.append(item)
        return out
