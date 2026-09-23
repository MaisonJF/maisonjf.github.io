#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    contract = json.loads((ROOT / "a14-contract.json").read_text(encoding="utf-8"))
    assert contract["mode"] == "analysis_only"
    assert contract["principles"]["unknown_is_not_default"] is True
    assert contract["principles"]["public_side_effects"] is False
    source = (ROOT / "opportunity_engine.py").read_text(encoding="utf-8").lower()
    for prohibited in ("requests.post(", "smtplib", "sendgrid", "checkout-session", "price_write"):
        assert prohibited not in source
    proc = subprocess.run(
        [sys.executable, str(ROOT / "test_a14.py")],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode:
        print(proc.stdout)
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(proc.returncode)
    print(proc.stdout, end="")
    print("A14 Universal Opportunity + Earned Distribution: OK")


if __name__ == "__main__":
    main()
