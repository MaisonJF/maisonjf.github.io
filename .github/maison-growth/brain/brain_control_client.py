#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Mapping, Optional
from urllib.parse import urlparse


class BrainControlError(RuntimeError):
    pass


def _safe_base_url(raw: str) -> str:
    value=raw.strip().rstrip("/")
    if not value:
        raise BrainControlError("brain_control_url_required")
    parsed=urlparse(value)
    if parsed.scheme not in {"http","https"}:
        raise BrainControlError("unsupported_brain_control_scheme")
    local={"127.0.0.1","localhost","::1","maison-intelligence"}
    if parsed.scheme=="http" and parsed.hostname not in local:
        raise BrainControlError("remote_brain_control_requires_https")
    if parsed.username or parsed.password:
        raise BrainControlError("credentials_must_not_be_in_url")
    return value


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _default_transport(
    url: str,
    *,
    token: str,
    access_client_id: Optional[str],
    access_client_secret: Optional[str],
    timeout: float,
    max_bytes: int,
) -> Mapping[str,Any]:
    headers={
        "Accept":"application/json",
        "Authorization":f"Bearer {token}",
        "User-Agent":"MAISON-JF-Brain/1.0",
    }
    if access_client_id and access_client_secret:
        headers["CF-Access-Client-Id"]=access_client_id
        headers["CF-Access-Client-Secret"]=access_client_secret

    request=urllib.request.Request(url,headers=headers,method="GET")
    opener=urllib.request.build_opener(_NoRedirect())
    try:
        with opener.open(request,timeout=timeout) as response:
            raw=response.read(max_bytes+1)
            if len(raw)>max_bytes:
                raise BrainControlError("brain_control_response_too_large")
            content_type=response.headers.get("content-type","")
            if "application/json" not in content_type.lower():
                raise BrainControlError("brain_control_non_json_response")
    except urllib.error.HTTPError as exc:
        raise BrainControlError(f"brain_control_http_{exc.code}") from exc
    except urllib.error.URLError as exc:
        raise BrainControlError("brain_control_unreachable") from exc

    try:
        value=json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise BrainControlError("brain_control_invalid_json") from exc
    if not isinstance(value,Mapping):
        raise BrainControlError("brain_control_invalid_payload")
    return value


@dataclass(frozen=True)
class BrainControlClient:
    base_url: str
    token: str
    access_client_id: Optional[str]=None
    access_client_secret: Optional[str]=None
    timeout: float=15.0
    max_bytes: int=2_000_000
    transport: Callable[...,Mapping[str,Any]]=_default_transport

    def __post_init__(self) -> None:
        object.__setattr__(self,"base_url",_safe_base_url(self.base_url))
        if not self.token.strip():
            raise BrainControlError("brain_control_token_required")
        if (self.access_client_id is None) != (self.access_client_secret is None):
            raise BrainControlError("cloudflare_access_credentials_must_be_paired")
        if not 1 <= self.timeout <= 120:
            raise BrainControlError("invalid_timeout")
        if not 1024 <= self.max_bytes <= 10_000_000:
            raise BrainControlError("invalid_max_bytes")

    def _get(self,path: str,params: Optional[Mapping[str,object]]=None) -> Mapping[str,Any]:
        query=urllib.parse.urlencode(
            [(key,str(value)) for key,value in (params or {}).items() if value is not None]
        )
        url=self.base_url+path+("?" + query if query else "")
        return self.transport(
            url,
            token=self.token,
            access_client_id=self.access_client_id,
            access_client_secret=self.access_client_secret,
            timeout=self.timeout,
            max_bytes=self.max_bytes,
        )

    def health(self) -> Mapping[str,Any]:
        return self._get("/internal/brain/health")

    def feed(
        self,
        *,
        limit: int=100,
        after: Optional[str]=None,
        after_id: Optional[str]=None,
    ) -> Mapping[str,Any]:
        return self._get("/internal/brain/feed",{
            "limit":limit,"after":after,"after_id":after_id
        })

    def cash_feedback(
        self,
        *,
        limit: int=100,
        after: Optional[str]=None,
        after_id: Optional[str]=None,
    ) -> Mapping[str,Any]:
        return self._get("/internal/brain/cash-feedback",{
            "limit":limit,"after":after,"after_id":after_id
        })

    def learning(
        self,
        *,
        limit: int=100,
        after: Optional[str]=None,
        after_id: Optional[str]=None,
    ) -> Mapping[str,Any]:
        return self._get("/internal/brain/learning",{
            "limit":limit,"after":after,"after_id":after_id
        })

    def solutions(self, *, status: Optional[str]=None, limit: int=100) -> Mapping[str,Any]:
        return self._get("/internal/brain/solutions",{"status":status,"limit":limit})

    def solution_links(
        self,
        *,
        territory_key: Optional[str]=None,
        limit: int=100,
    ) -> Mapping[str,Any]:
        return self._get("/internal/brain/solution-links",{
            "territory_key":territory_key,"limit":limit
        })
