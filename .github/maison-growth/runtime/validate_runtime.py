#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parent
GROWTH=ROOT.parent


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def main() -> None:
    compose=(ROOT/"docker-compose.observe.yml").read_text(encoding="utf-8")
    dockerfile=(ROOT/"Dockerfile.osiris").read_text(encoding="utf-8")
    bridge=(ROOT/"osiris_bridge.py").read_text(encoding="utf-8")
    env=(ROOT/".env.observe.example").read_text(encoding="utf-8")
    policy=json.loads((ROOT/"observe-only-policy.json").read_text(encoding="utf-8"))

    require("pgvector/pgvector:0.8.6-pg16" in compose,"pgvector image must be pinned")
    require("redis:7.4.11-alpine" in compose,"redis image must be pinned")
    require("181658e1db85ce4d2e8702124423b674b3cb136f" in dockerfile,"Osiris source must be pinned")
    require("UV_VERSION=0.12.18" in dockerfile,"uv version must be pinned")

    exposed=re.findall(r'"([0-9.]*):?\$?\{?[^"]*:[0-9]+"',compose)
    for line in compose.splitlines():
        if re.search(r'-\s*"[^"]*:[0-9]+:[0-9]+"',line):
            require("127.0.0.1:" in line,f"non-localhost published port: {line.strip()}")

    require("from src.actions.core import Actions" in bridge,"bridge must use Osiris Actions Waist")
    forbidden_sql=("INSERT INTO objects","UPDATE assertions","DELETE FROM","asyncpg.connect")
    require(not any(x in bridge for x in forbidden_sql),"bridge must not write Osiris tables directly")
    require("MAISON_OSIRIS_BRIDGE_TOKEN" in bridge,"bridge bearer token required")
    require("EvidenceClass.DIRECT_OBSERVATION" in bridge,"bridge must preserve observation provenance class")

    require("CHANGE_ME_LONG_RANDOM" in env,"env example must contain placeholders")
    require(not re.search(r'(?i)(api[_-]?key|token|password)=([A-Za-z0-9_\-]{20,})',env.replace("CHANGE_ME_LONG_RANDOM","")),
            "env example appears to contain a real secret")

    require(policy["current_stage"]=="infra_only","repository stage must remain infra_only")
    for stage in policy["stages"].values():
        require(stage["outbound_authorized"] is False,"observe runtime cannot authorize outbound")
        require(stage["spend_authorized"] is False,"observe runtime cannot authorize spend")
        require(stage["public_write_authorized"] is False,"observe runtime cannot authorize public writes")

    status=(GROWTH/"BRAIN_RUNTIME_STATUS.md").read_text(encoding="utf-8")
    require("Code-ready does not mean live" in status,"runtime status safety notice missing")
    print("Maison persistent observe runtime: OK")


if __name__=="__main__":
    main()
