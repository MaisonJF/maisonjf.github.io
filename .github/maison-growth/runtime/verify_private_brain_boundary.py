#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Mapping
from urllib.parse import urlparse


class BoundaryVerificationError(RuntimeError):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@dataclass(frozen=True)
class HttpResult:
    status:int
    body:Mapping[str,Any]|None


def _safe_base_url(raw:str)->str:
    value=raw.strip().rstrip("/")
    parsed=urlparse(value)
    if parsed.scheme!="https" or not parsed.hostname:
        raise BoundaryVerificationError("private_boundary_requires_https")
    if parsed.username or parsed.password:
        raise BoundaryVerificationError("credentials_forbidden_in_url")
    return value


def _request(
    base_url:str,
    path:str,
    *,
    method:str="GET",
    bearer:str|None=None,
    access_client_id:str|None=None,
    access_client_secret:str|None=None,
    timeout:float=15.0,
)->HttpResult:
    headers={"Accept":"application/json","User-Agent":"MAISON-JF-Private-Boundary-Verifier/1.0"}
    if bearer:
        headers["Authorization"]=f"Bearer {bearer}"
    if access_client_id and access_client_secret:
        headers["CF-Access-Client-Id"]=access_client_id
        headers["CF-Access-Client-Secret"]=access_client_secret
    request=urllib.request.Request(base_url+path,headers=headers,method=method)
    opener=urllib.request.build_opener(_NoRedirect())
    try:
        with opener.open(request,timeout=timeout) as response:
            status=int(response.status)
            raw=response.read(1_000_001)
            if len(raw)>1_000_000:
                raise BoundaryVerificationError("boundary_response_too_large")
    except urllib.error.HTTPError as exc:
        status=int(exc.code)
        raw=exc.read(1_000_001)
    except urllib.error.URLError as exc:
        raise BoundaryVerificationError("private_boundary_unreachable") from exc
    body=None
    if raw:
        try:
            value=json.loads(raw.decode("utf-8"))
            body=value if isinstance(value,Mapping) else None
        except Exception:
            body=None
    return HttpResult(status=status,body=body)


def validate_results(
    *,
    stage:str,
    unauth_health:HttpResult,
    auth_health:HttpResult,
    action_inbox:HttpResult,
    proposal_probe:HttpResult|None,
    review_probe:HttpResult|None,
)->dict[str,Any]:
    if unauth_health.status not in {401,403}:
        raise BoundaryVerificationError(f"unauthenticated_health_not_denied:{unauth_health.status}")
    if auth_health.status!=200 or auth_health.body is None:
        raise BoundaryVerificationError(f"authenticated_health_failed:{auth_health.status}")
    if auth_health.body.get("status")!="ok" or auth_health.body.get("mode")!="read_only":
        raise BoundaryVerificationError("authenticated_health_not_read_only")
    if action_inbox.status!=200 or action_inbox.body is None:
        raise BoundaryVerificationError(f"action_inbox_failed:{action_inbox.status}")
    authority=action_inbox.body.get("authority")
    if not isinstance(authority,Mapping):
        raise BoundaryVerificationError("action_inbox_authority_missing")
    required=("public_write_authorized","outbound_authorized","spend_authorized","experiment_execution_authorized")
    if any(authority.get(key) is not False for key in required):
        raise BoundaryVerificationError("action_inbox_authority_drift")

    write_surfaces="not_probed_for_write_safety"
    if stage=="private_brain_read_candidate":
        if proposal_probe is None or proposal_probe.status!=404:
            raise BoundaryVerificationError("proposal_surface_must_be_hidden_in_private_read_stage")
        if review_probe is None or review_probe.status!=404:
            raise BoundaryVerificationError("review_surface_must_be_hidden_in_private_read_stage")
        write_surfaces="hidden_404"

    return {
        "kind":"maison_private_brain_boundary_verification",
        "stage":stage,
        "status":"ok",
        "unauthenticated_health_denied":True,
        "authenticated_health_read_only":True,
        "action_inbox_authority_all_false":True,
        "write_surfaces":write_surfaces,
        "writes_performed":False,
        "secrets_printed":False,
        "execution_authority":False,
    }


def verify_live(stage:str,values:Mapping[str,str])->dict[str,Any]:
    base=_safe_base_url(values["BRAIN_CONTROL_API_URL"])
    token=values["BRAIN_CONTROL_TOKEN"].strip()
    if not token:
        raise BoundaryVerificationError("brain_control_token_required")
    access_id=values.get("CF_ACCESS_CLIENT_ID","").strip() or None
    access_secret=values.get("CF_ACCESS_CLIENT_SECRET","").strip() or None
    if (access_id is None)!=(access_secret is None):
        raise BoundaryVerificationError("cloudflare_access_credentials_must_be_paired")
    unauth=_request(base,"/internal/brain/health",access_client_id=access_id,access_client_secret=access_secret)
    auth=_request(base,"/internal/brain/health",bearer=token,access_client_id=access_id,access_client_secret=access_secret)
    inbox=_request(base,"/internal/brain/action-inbox?limit=1",bearer=token,access_client_id=access_id,access_client_secret=access_secret)
    proposal=review=None
    if stage=="private_brain_read_candidate":
        proposal=_request(base,"/internal/proposals/a14",method="POST",bearer=token,access_client_id=access_id,access_client_secret=access_secret)
        review=_request(base,"/internal/reviews/a12",method="POST",bearer=token,access_client_id=access_id,access_client_secret=access_secret)
    return validate_results(
        stage=stage,
        unauth_health=unauth,
        auth_health=auth,
        action_inbox=inbox,
        proposal_probe=proposal,
        review_probe=review,
    )


def main()->None:
    parser=argparse.ArgumentParser(description="Verify the deployed Maison private Brain boundary without performing writes.")
    parser.add_argument("stage",choices=(
        "private_brain_read_candidate",
        "proposal_materialization_candidate",
        "human_review_decision_candidate",
    ))
    args=parser.parse_args()
    print(json.dumps(verify_live(args.stage,os.environ),ensure_ascii=False,indent=2,sort_keys=True))


if __name__=="__main__":
    main()
