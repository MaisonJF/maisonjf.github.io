#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
from pathlib import Path
from typing import Mapping


ROOT=Path(__file__).resolve().parent
COMPOSE=ROOT/"docker-compose.observe.yml"
BASE_REQUIRED=("POSTGRES_PASSWORD","MAISON_OSIRIS_BRIDGE_TOKEN")
PORT_KEYS={
    "POSTGRES_PORT":5432,
    "REDIS_PORT":6379,
    "OSIRIS_MCP_PORT":8790,
    "MAISON_OSIRIS_BRIDGE_PORT":8791,
    "BRAIN_MCP_HOST_PORT":8792,
}
PLACEHOLDER_MARKERS=("CHANGE_ME","REPLACE_WITH","EXAMPLE_SECRET")


def read_dotenv(path: Path) -> dict[str,str]:
    values={}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line=raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key,value=line.split("=",1)
        values[key.strip()]=value.strip().strip('"').strip("'")
    return values


def _placeholder(value: str) -> bool:
    upper=value.upper()
    return any(marker in upper for marker in PLACEHOLDER_MARKERS)


def validate_base_env(values: Mapping[str,str]) -> dict[str,object]:
    errors=[]
    warnings=[]
    present={}
    for name in BASE_REQUIRED:
        value=str(values.get(name,"") or "").strip()
        present[name]=bool(value) and not _placeholder(value)
        if not value:
            errors.append(f"{name}:missing")
        elif _placeholder(value):
            errors.append(f"{name}:placeholder")
        elif len(value)<20:
            warnings.append(f"{name}:short_secret")

    postgres=str(values.get("POSTGRES_PASSWORD","") or "").strip()
    bridge=str(values.get("MAISON_OSIRIS_BRIDGE_TOKEN","") or "").strip()
    if (
        postgres and bridge
        and not _placeholder(postgres) and not _placeholder(bridge)
        and postgres==bridge
    ):
        errors.append("base_secrets_must_be_distinct")

    ports={}
    seen={}
    for name,default in PORT_KEYS.items():
        raw=str(values.get(name,default) or default).strip()
        try:
            port=int(raw)
        except ValueError:
            errors.append(f"{name}:invalid_port")
            continue
        if not 1 <= port <= 65535:
            errors.append(f"{name}:invalid_port")
            continue
        ports[name]=port
        if port in seen:
            errors.append(f"host_port_collision:{seen[port]}:{name}")
        else:
            seen[port]=name

    return {
        "ready":not errors,
        "errors":errors,
        "warnings":warnings,
        "required_secret_presence":present,
        "ports":ports,
        "secret_values_printed":False,
    }


def check_ports(ports: Mapping[str,int]) -> list[str]:
    busy=[]
    for name,port in ports.items():
        sock=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
        try:
            sock.bind(("127.0.0.1",port))
        except OSError:
            busy.append(f"{name}:port_in_use")
        finally:
            sock.close()
    return busy


def docker_compose_check(env_file: Path) -> tuple[bool,str | None]:
    if shutil.which("docker") is None:
        return False,"docker_not_found"
    version=subprocess.run(
        ["docker","compose","version"],
        capture_output=True,text=True,
    )
    if version.returncode:
        return False,"docker_compose_plugin_unavailable"

    # Compose expands required variables even for optional profiles. Supply local-only
    # structural placeholders for those optional remote profiles when the operator has
    # not configured them yet. This does not weaken the runtime preflight for activation.
    values=dict(os.environ)
    values.update(read_dotenv(env_file))
    compose_env=dict(os.environ)
    optional_profile_defaults={
        "BRAIN_CONTROL_API_URL":"http://maison-intelligence",
        "BRAIN_CONTROL_TOKEN":"host-preflight-only",
        "BRAIN_PROPOSAL_API_URL":"http://maison-intelligence",
        "BRAIN_PROPOSAL_TOKEN":"host-preflight-only",
    }
    for key,value in optional_profile_defaults.items():
        if not str(values.get(key,"") or "").strip() or _placeholder(str(values.get(key,""))):
            compose_env[key]=value

    proc=subprocess.run(
        [
            "docker","compose",
            "--env-file",str(env_file),
            "-f",str(COMPOSE),
            "config","--quiet",
        ],
        cwd=str(ROOT.parents[2]),
        env=compose_env,
        capture_output=True,text=True,
    )
    if proc.returncode:
        return False,"compose_config_invalid"
    return True,None


def main() -> None:
    parser=argparse.ArgumentParser(
        description="Preflight the private persistent observe host without starting any service."
    )
    parser.add_argument("--env-file",type=Path,required=True)
    parser.add_argument("--skip-port-check",action="store_true")
    args=parser.parse_args()

    if not args.env_file.exists():
        raise SystemExit("env_file_not_found")

    values=dict(os.environ)
    values.update(read_dotenv(args.env_file))
    result=validate_base_env(values)

    if not args.skip_port_check and result["ports"]:
        busy=check_ports(result["ports"])
        result["port_conflicts"]=busy
        if busy:
            result["errors"].extend(busy)
            result["ready"]=False
    else:
        result["port_conflicts"]=[]

    compose_ok,compose_error=docker_compose_check(args.env_file)
    result["docker_compose_config_valid"]=compose_ok
    if compose_error:
        result["errors"].append(compose_error)
        result["ready"]=False

    usage=shutil.disk_usage(str(ROOT))
    result["host_free_disk_gib"]=round(usage.free/(1024**3),1)
    if usage.free < 5*(1024**3):
        result["warnings"].append("low_free_disk_under_5_gib")

    result["services_started"]=False
    result["remote_changes_performed"]=False
    print(json.dumps(result,ensure_ascii=False,indent=2,sort_keys=True))
    if not result["ready"]:
        raise SystemExit(2)


if __name__=="__main__":
    main()
