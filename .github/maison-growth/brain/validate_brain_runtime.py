#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent


def main() -> None:
    contract=json.loads((ROOT/"brain-runtime-contract.json").read_text(encoding="utf-8"))
    assert contract["mode"]=="analysis_only"
    assert "A12 controls external action" in contract["hard_rules"]
    assert contract["memory_roles"]["DuckDB/Polars"]=="analytical preprocessing only"
    proc=subprocess.run(
        [sys.executable,str(ROOT/"test_brain_runtime.py")],
        cwd=str(ROOT),capture_output=True,text=True,
    )
    if proc.returncode:
        print(proc.stdout)
        print(proc.stderr,file=sys.stderr)
        raise SystemExit(proc.returncode)
    print(proc.stdout,end="")
    print("Maison Brain runtime contracts: OK")


if __name__=="__main__":
    main()
