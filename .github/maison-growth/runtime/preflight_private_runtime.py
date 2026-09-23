#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Mapping
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "observe-only-policy.json"
PLACEHOLDERS = ("CHANGE_ME", "REPLACE_WITH_", "example", "placeholder")


def _read_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        raise FileNotFoundError(path)
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def _is_placeholder(value: str) -> bool:
    low = value.lower()
    return (not value.strip()) or any(marker.lower() in low for marker in PLACEHOLDERS)


def _check_secret(name: str, values: Mapping[str, str], blockers: list[str]) -> None:
    value = values.get(name, "").strip()
    if _is_placeholder(value):
        blockers.append(f"{name}:missing_or_placeholder")
        return
    if len(value) < 24:
        blockers.append(f"{name}:too_short")


def _check_https_url(name: str, values: Mapping[str, str], blockers: list[str]) -> None:
    raw = values.get(name, "").strip()
    if _is_placeholder(raw):
        blockers.append(f"{name}:missing_or_placeholder")
        return
    parsed = urlparse(raw)
    if parsed.scheme != "https" or not parsed.hostname:
        blockers.append(f"{name}:private_remote_requires_https")
    if parsed.username or parsed.password:
        blockers.append(f"{name}:credentials_forbidden_in_url")


def _paired(left: str, right: str, values: Mapping[str, str], blockers: list[str]) -> None:
    a = bool(values.get(left, "").strip())
    b = bool(values.get(right, "").strip())
    if a != b:
        blockers.append(f"{left}+{right}:must_be_paired")


def _required_for(stage_name: str) -> tuple[tuple[str, ...], tuple[str, ...]]:
    urls = ["BRAIN_CONTROL_API_URL"]
    tokens = ["BRAIN_CONTROL_TOKEN"]
    if stage_name in {"proposal_materialization_candidate", "human_review_decision_candidate", "a8_draft_candidate"}:
        urls.append("BRAIN_PROPOSAL_API_URL")
        tokens.append("BRAIN_PROPOSAL_TOKEN")
    if stage_name == "human_review_decision_candidate":
        urls.append("BRAIN_REVIEW_DECISION_API_URL")
        tokens.append("BRAIN_REVIEW_DECISION_TOKEN")
    return tuple(urls), tuple(tokens)


def build_preflight(stage_name: str, values: Mapping[str, str]) -> dict[str, object]:
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    stages = policy["stages"]
    if stage_name not in stages:
        raise ValueError("unknown_stage")
    stage = stages[stage_name]

    blockers: list[str] = []
    warnings: list[str] = []

    for key in ("outbound_authorized", "spend_authorized", "public_write_authorized"):
        if stage.get(key) is not False:
            blockers.append(f"policy:{key}_must_remain_false")
    if stage.get("experiment_execution_authorized", False) is not False:
        blockers.append("policy:experiment_execution_authorized_must_remain_false")

    if stage_name != "infra_only" and not stage.get("requires_explicit_activation", False):
        blockers.append("policy:explicit_activation_required")

    if stage.get("requires_private_https_access", False):
        urls, tokens = _required_for(stage_name)
        for name in urls:
            _check_https_url(name, values, blockers)
        for name in tokens:
            _check_secret(name, values, blockers)

        present_tokens = [(name, values.get(name, "").strip()) for name in tokens]
        present_tokens = [(name, value) for name, value in present_tokens if value and not _is_placeholder(value)]
        for i, (left_name, left_value) in enumerate(present_tokens):
            for right_name, right_value in present_tokens[i + 1:]:
                if left_value == right_value:
                    blockers.append(f"{left_name}+{right_name}:tokens_must_be_distinct")

        _paired("CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET", values, blockers)
        if not values.get("CF_ACCESS_CLIENT_ID", "").strip():
            warnings.append("cloudflare_access_not_configured:bearer_only_boundary")

    if stage.get("requires_https_bridge_smoke_test", False):
        _check_secret("MAISON_OSIRIS_BRIDGE_TOKEN", values, blockers)
        warnings.append("osiris_bridge_https_smoke_must_pass_before_remote_mirroring")

    if stage.get("requires_private_cta_context", False):
        configured = values.get("MAISON_CTA_CONTEXT_PATH", "").strip()
        candidate = Path(configured) if configured else ROOT / ".private" / "cta-context.json"
        if not candidate.exists():
            blockers.append("MAISON_CTA_CONTEXT_PATH:private_cta_context_missing")

    switches = {
        "WORKER_ENABLED": str(bool(stage.get("worker_enabled", False))).lower(),
        "KILL_SWITCH": str(bool(stage.get("kill_switch", True))).lower(),
        "OSIRIS_ENABLED": str(bool(stage.get("osiris_osint_enabled", False))).lower(),
        "OSIRIS_MEMORY_ENABLED": str(bool(stage.get("osiris_memory_enabled", False))).lower(),
        "BRAIN_CONTROL_API_ENABLED": str(bool(stage.get("brain_control_api_enabled", False))).lower(),
        "BRAIN_PROPOSAL_API_ENABLED": str(bool(stage.get("brain_proposal_api_enabled", False))).lower(),
        "BRAIN_REVIEW_DECISION_ENABLED": str(bool(stage.get("brain_review_decision_enabled", False))).lower(),
        "OPENROUTER_ENABLED": "false",
        "OSIRIS_GATEWAY_ENABLED": "false",
    }

    return {
        "kind": "maison_private_runtime_preflight",
        "stage": stage_name,
        "ready": not blockers,
        "blockers": sorted(set(blockers)),
        "warnings": sorted(set(warnings)),
        "required_switches": switches,
        "authority": {
            "public_write_authorized": False,
            "outbound_authorized": False,
            "spend_authorized": False,
            "experiment_execution_authorized": False,
        },
        "secrets_printed": False,
    }


def main() -> None:
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    parser = argparse.ArgumentParser(
        description="Validate private Maison runtime activation prerequisites without changing remote state."
    )
    parser.add_argument("stage", choices=tuple(policy["stages"]))
    parser.add_argument("--env-file", type=Path)
    args = parser.parse_args()

    values = dict(os.environ)
    if args.env_file is not None:
        values.update(_read_dotenv(args.env_file))

    result = build_preflight(args.stage, values)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    if not result["ready"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
