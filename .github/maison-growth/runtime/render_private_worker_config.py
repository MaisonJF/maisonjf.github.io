#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "observe-only-policy.json"
PRIVATE_STAGES = (
    "private_brain_read_candidate",
    "proposal_materialization_candidate",
    "human_review_decision_candidate",
)


def _private_hostname(private_url: str) -> str:
    raw = private_url.strip()
    parsed = urlparse(raw)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("private_worker_url_must_be_https")
    if parsed.username or parsed.password:
        raise ValueError("private_worker_url_credentials_forbidden")
    if parsed.port is not None:
        raise ValueError("private_worker_url_port_forbidden")
    if parsed.path not in ("", "/") or parsed.params or parsed.query or parsed.fragment:
        raise ValueError("private_worker_url_must_be_origin_only")

    host = parsed.hostname.rstrip(".").lower()
    if "." not in host or host in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("private_worker_url_requires_custom_domain_hostname")
    return host.encode("idna").decode("ascii")


def render_private_worker_config(
    *,
    stage_name: str,
    template: dict[str, Any],
    database_id: str | None = None,
    private_url: str | None = None,
) -> dict[str, Any]:
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    if stage_name not in PRIVATE_STAGES:
        raise ValueError("private_worker_stage_not_allowed")
    stage = policy["stages"][stage_name]

    if stage.get("worker_enabled") is not False or stage.get("kill_switch") is not True:
        raise ValueError("private_surface_stage_must_keep_collection_killed")
    if stage.get("osiris_osint_enabled") is not False or stage.get("osiris_memory_enabled") is not False:
        raise ValueError("private_surface_stage_must_keep_osiris_off")
    for key in ("outbound_authorized", "spend_authorized", "public_write_authorized"):
        if stage.get(key) is not False:
            raise ValueError(f"private_surface_stage_{key}_must_be_false")
    if stage.get("experiment_execution_authorized", False) is not False:
        raise ValueError("private_surface_stage_experiment_execution_must_be_false")

    config = json.loads(json.dumps(template))

    # Private Brain bring-up is HTTP + D1 only. Do not inherit collection/event
    # triggers or model/queue bindings from the wider intelligence Worker.
    for key in ("route", "routes", "triggers", "queues", "ai"):
        config.pop(key, None)
    config["workers_dev"] = False
    config["preview_urls"] = False

    if private_url is not None:
        hostname = _private_hostname(private_url)
        config["routes"] = [{"pattern": hostname, "custom_domain": True}]

    vars_ = config.setdefault("vars", {})
    vars_.update({
        "WORKER_ENABLED": "false",
        "KILL_SWITCH": "true",
        "OSIRIS_ENABLED": "false",
        "OSIRIS_MEMORY_ENABLED": "false",
        "WORKERS_AI_ENABLED": "false",
        "OSIRIS_GATEWAY_ENABLED": "false",
        "OPENROUTER_ENABLED": "false",
        "OPENAI_ENABLED": "false",
        "GEMINI_ENABLED": "false",
        "PERPLEXITY_ENABLED": "false",
        "ANTHROPIC_ENABLED": "false",
        "PUBLIC_DATA_ENABLED": "false",
        "SEARCH_VISIBILITY_ENABLED": "false",
        "GOOGLE_SEARCH_CONSOLE_ENABLED": "false",
        "BING_WEBMASTER_ENABLED": "false",
        "SEARCH_VISIBILITY_PROBES_ENABLED": "false",
        "EUROSTAT_ENABLED": "false",
        "BASE_PT_ENABLED": "false",
        "OPENALEX_ENABLED": "false",
        "BRAIN_CONTROL_API_ENABLED": str(bool(stage.get("brain_control_api_enabled", False))).lower(),
        "BRAIN_PROPOSAL_API_ENABLED": str(bool(stage.get("brain_proposal_api_enabled", False))).lower(),
        "BRAIN_REVIEW_DECISION_ENABLED": str(bool(stage.get("brain_review_decision_enabled", False))).lower(),
    })

    databases = config.get("d1_databases")
    if not isinstance(databases, list) or len(databases) != 1:
        raise ValueError("exactly_one_growth_d1_binding_required")
    selected_database_id = (
        database_id.strip()
        if database_id is not None
        else str(databases[0].get("database_id") or "").strip()
    )
    if (
        not selected_database_id
        or "REPLACE_WITH" in selected_database_id
        or len(selected_database_id) < 16
    ):
        raise ValueError("valid_d1_database_id_required")
    databases[0]["database_id"] = selected_database_id

    return config


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render a temporary Wrangler config for private Brain surfaces only."
    )
    parser.add_argument("stage", choices=PRIVATE_STAGES)
    parser.add_argument("--template", type=Path, required=True)
    parser.add_argument("--database-id")
    parser.add_argument("--private-url")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    template = json.loads(args.template.read_text(encoding="utf-8"))
    config = render_private_worker_config(
        stage_name=args.stage,
        template=template,
        database_id=args.database_id,
        private_url=args.private_url,
    )
    hostname = None
    routes = config.get("routes")
    if isinstance(routes, list) and routes:
        hostname = routes[0].get("pattern")

    args.output.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "stage": args.stage,
        "output": str(args.output),
        "private_custom_domain_configured": hostname is not None,
        "private_hostname": hostname,
        "workers_dev_enabled": False,
        "scheduled_triggers_present": False,
        "queue_bindings_present": False,
        "ai_binding_present": False,
        "collection_enabled": False,
        "public_write_authorized": False,
        "outbound_authorized": False,
        "spend_authorized": False,
        "experiment_execution_authorized": False,
        "secrets_embedded": False,
    }, indent=2))


if __name__ == "__main__":
    main()
