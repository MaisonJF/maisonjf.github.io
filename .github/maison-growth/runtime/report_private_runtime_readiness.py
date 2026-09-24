#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
from typing import Mapping

FIRST_STAGE_REQUIRED = (
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "MAISON_BRAIN_PRIVATE_URL",
    "MAISON_BRAIN_CONTROL_TOKEN",
)
ACCESS_PAIR = (
    "MAISON_CF_ACCESS_CLIENT_ID",
    "MAISON_CF_ACCESS_CLIENT_SECRET",
)
LATER_STAGE = (
    "MAISON_BRAIN_PROPOSAL_TOKEN",
    "MAISON_BRAIN_REVIEW_DECISION_TOKEN",
)


def summarize(values: Mapping[str, str]) -> dict[str, object]:
    def present(name: str) -> bool:
        return bool(str(values.get(name, "") or "").strip())

    configured = [name for name in FIRST_STAGE_REQUIRED if present(name)]
    missing = [name for name in FIRST_STAGE_REQUIRED if not present(name)]
    access = [present(name) for name in ACCESS_PAIR]
    access_client_id = str(values.get("MAISON_CF_ACCESS_CLIENT_ID", "") or "").strip()
    access_client_secret = str(values.get("MAISON_CF_ACCESS_CLIENT_SECRET", "") or "").strip()
    access_client_id_shape_ok = bool(access_client_id) and access_client_id.endswith(".access")
    access_client_secret_shape_ok = bool(access_client_secret) and (
        access_client_secret.startswith("cfast_")
        or bool(re.fullmatch(r"[0-9a-fA-F]{64}", access_client_secret))
    )
    dedicated_read_token=present("CLOUDFLARE_READ_API_TOKEN")
    deploy_token=present("CLOUDFLARE_API_TOKEN")
    account_id=present("CLOUDFLARE_ACCOUNT_ID")
    read_token_source=(
        "dedicated_read"
        if dedicated_read_token
        else "deployment_fallback"
        if deploy_token
        else "missing"
    )

    return {
        "kind": "maison_private_runtime_credential_readiness",
        "first_stage_required": list(FIRST_STAGE_REQUIRED),
        "first_stage_configured": configured,
        "first_stage_missing": missing,
        "first_stage_credentials_present": not missing,
        "read_only_inspection_credentials_present": account_id and (dedicated_read_token or deploy_token),
        "read_only_inspection_token_source": read_token_source,
        "access_boundary_pair_present": all(access),
        "access_boundary_pair_partial": any(access) and not all(access),
        "access_client_id_shape_ok": access_client_id_shape_ok,
        "access_client_secret_shape_ok": access_client_secret_shape_ok,
        "access_pair_shape_ok": access_client_id_shape_ok and access_client_secret_shape_ok,
        "access_client_id_length": len(access_client_id),
        "access_client_secret_length": len(access_client_secret),
        "later_stage_configured": [name for name in LATER_STAGE if present(name)],
        "later_stage_missing": [name for name in LATER_STAGE if not present(name)],
        "secrets_printed": False,
        "note": "Presence only. This does not verify Cloudflare access, route reachability, D1 schema, or Brain health.",
    }


def main() -> None:
    result = summarize(os.environ)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
