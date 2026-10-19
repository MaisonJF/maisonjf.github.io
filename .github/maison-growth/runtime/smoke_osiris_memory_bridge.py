#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def smoke_bridge(url: str, token: str) -> dict[str, object]:
    raw=url.strip()
    parsed=urlparse(raw)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("osiris_memory_bridge_https_required")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("osiris_memory_bridge_url_invalid")
    if not token.strip() or len(token.strip()) < 24:
        raise ValueError("osiris_memory_bridge_token_missing_or_too_short")
    if not parsed.path.rstrip("/").endswith("/ingest/a13"):
        raise ValueError("osiris_memory_bridge_must_target_ingest_endpoint")

    # Deliberately invalid schema: the bridge must authenticate this request,
    # then reject it before any Actions write. This verifies HTTPS + bearer
    # authentication + route contract without inserting synthetic memory.
    payload={
        "schema":"maison.osiris-memory.smoke-test.invalid",
        "source":"maison-a13",
        "observation_id":"connectivity-only",
        "event_id":"connectivity-only",
        "provider_id":"maison-runtime-smoke",
        "source_class":"synthetic_test",
        "territory_key":"runtime_smoke",
        "grounding_state":"test",
        "observed_at":"2026-10-19T00:00:00+00:00",
        "independent_evidence_roots":0,
        "citations":[],
        "text":"Non-persisting connectivity/authentication smoke test."
    }
    request=Request(
        raw,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization":"Bearer "+token.strip(),"Content-Type":"application/json"},
        method="POST",
    )
    try:
        with urlopen(request,timeout=12) as response:
            status=response.status
            body=response.read(2000).decode("utf-8","replace")
    except HTTPError as exc:
        status=exc.code
        body=exc.read(2000).decode("utf-8","replace")
    except (URLError,TimeoutError) as exc:
        raise RuntimeError("osiris_memory_bridge_unreachable") from exc

    try:
        response_data=json.loads(body)
    except json.JSONDecodeError:
        response_data={}
    if status != 400 or response_data.get("detail") != "unsupported_envelope":
        if status == 401:
            raise RuntimeError("osiris_memory_bridge_authentication_failed")
        raise RuntimeError(f"osiris_memory_bridge_smoke_unexpected_response:{status}")
    return {"https":True,"bearer_authenticated":True,"write_performed":False,"status":status}


def main() -> int:
    parser=argparse.ArgumentParser(description="Non-writing HTTPS/auth smoke test for the private OSIRIS Memory bridge.")
    parser.add_argument("--url",default=os.environ.get("OSIRIS_MEMORY_BRIDGE_URL",""))
    parser.add_argument("--token",default=os.environ.get("MAISON_OSIRIS_BRIDGE_TOKEN",""))
    args=parser.parse_args()
    try:
        result=smoke_bridge(args.url,args.token)
    except Exception as exc:
        print(str(exc),file=sys.stderr)
        return 1
    print(json.dumps(result,sort_keys=True))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
