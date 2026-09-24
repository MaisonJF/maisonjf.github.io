#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path
from typing import Any, Mapping

from preflight_observe_host import (
    check_ports,
    docker_compose_check,
    read_dotenv,
    validate_base_env,
)
from report_private_runtime_readiness import summarize


def _host_report(values: Mapping[str, str], env_file: Path) -> dict[str, Any]:
    result = dict(validate_base_env(values))

    ports = result.get("ports", {})
    busy = check_ports(ports) if isinstance(ports, Mapping) and ports else []
    result["port_conflicts"] = busy
    if busy:
        result["errors"].extend(busy)
        result["ready"] = False

    compose_ok, compose_error = docker_compose_check(env_file)
    result["docker_compose_config_valid"] = compose_ok
    if compose_error:
        result["errors"].append(compose_error)
        result["ready"] = False

    usage = shutil.disk_usage(str(env_file.parent))
    result["host_free_disk_gib"] = round(usage.free / (1024 ** 3), 1)
    if usage.free < 5 * (1024 ** 3):
        result["warnings"].append("low_free_disk_under_5_gib")

    result["services_started"] = False
    result["remote_changes_performed"] = False
    return result


def recommend_next_step(
    credentials: Mapping[str, Any],
    *,
    env_file_present: bool,
    host_ready: bool | None,
) -> str:
    if not env_file_present:
        return "prepare_private_env"
    if host_ready is False:
        return "fix_observe_host_preflight"
    if host_ready is None:
        return "run_observe_host_preflight"
    if bool(credentials.get("access_boundary_pair_partial")):
        return "complete_or_remove_partial_access_pair"
    if not bool(credentials.get("read_only_inspection_credentials_present")):
        return "configure_read_only_cloudflare_credentials"
    if not bool(credentials.get("first_stage_credentials_present")):
        return "run_cloudflare_read_only_inspect"
    return "run_private_brain_read_preflight"


def assemble_report(
    values: Mapping[str, str],
    *,
    env_file_present: bool,
    host_report: Mapping[str, Any] | None,
) -> dict[str, Any]:
    credentials = summarize(values)
    host_ready = (
        bool(host_report.get("ready"))
        if host_report is not None
        else None
    )
    return {
        "kind": "maison_private_activation_doctor",
        "credential_readiness": credentials,
        "observe_host": dict(host_report) if host_report is not None else {
            "checked": False,
            "ready": None,
            "secret_values_printed": False,
            "services_started": False,
            "remote_changes_performed": False,
        },
        "recommended_next_step": recommend_next_step(
            credentials,
            env_file_present=env_file_present,
            host_ready=host_ready,
        ),
        "public_write_authorized": False,
        "outbound_authorized": False,
        "spend_authorized": False,
        "experiment_execution_authorized": False,
        "services_started": False,
        "remote_changes_performed": False,
        "secrets_printed": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Summarize Maison private activation readiness without starting services "
            "or changing remote state."
        )
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        help=(
            "Optional local .env.observe path. When supplied, run the no-start host "
            "preflight and merge its values with the current environment."
        ),
    )
    args = parser.parse_args()

    values = dict(os.environ)
    host = None
    env_present = args.env_file is not None

    if args.env_file is not None:
        if not args.env_file.exists():
            raise SystemExit("env_file_not_found")
        values.update(read_dotenv(args.env_file))
        host = _host_report(values, args.env_file)

    report = assemble_report(
        values,
        env_file_present=env_present,
        host_report=host,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
