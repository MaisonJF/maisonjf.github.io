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
    for test_file in ("test_brain_runtime.py","test_orchestrator.py","test_context_adapters.py","test_semantic_pgvector.py","test_local_embeddings.py","test_osiris_context.py","test_brain_control_client.py","test_schema_chain.py","test_a14_projection.py","test_runtime_memory_context.py","test_semantic_sync.py","test_commercial_assets.py","test_materialize_a14.py","test_validation_planner.py","test_plan_approved_validations.py","test_a8_draft_planner.py","test_plan_a8_drafts.py"):
        proc=subprocess.run(
            [sys.executable,str(ROOT/test_file)],
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
