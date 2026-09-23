#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Mapping

ROOT = Path(__file__).resolve().parent
BRAIN = ROOT.parent / "brain"
sys.path.insert(0, str(BRAIN))

from brain_control_client import BrainControlClient


def validate_health(payload: Mapping[str, Any]) -> dict[str, object]:
    if payload.get("status") != "ok":
        raise ValueError("private_brain_health_not_ok")
    if payload.get("mode") != "read_only":
        raise ValueError("private_brain_health_not_read_only")
    return {
        "kind": "maison_private_brain_health",
        "status": "ok",
        "mode": "read_only",
        "writes_performed": False,
        "execution_authority": False,
    }


def main() -> None:
    client = BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID") or None,
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET") or None,
    )
    result = validate_health(client.health())
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
