#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Mapping, Optional
from urllib.parse import urlparse


class A11LearningClientError(RuntimeError):
    pass


def _safe_base_url(raw: str) -> str:
    value=raw.strip().rstrip("/")
    if not value:
        raise A11LearningClientError("a11_learning_url_required")
    parsed=urlparse(value)
    if parsed.scheme not in {"http","https"}:
        raise A11LearningClientError("unsupported_a11_learning_scheme")
    local={"127.0.0.1","localhost","::1","maison-intelligence"}
    if parsed.scheme=="http" and parsed.hostname not in local:
        raise A11LearningClientError("remote_a11_learning_requires_https")
    if parsed.username or parsed.password:
        raise A11LearningClientError("credentials_must_not_be_in_url")
    return value


def _default_transport(
    url: str,
    payload: Mapping[str,Any],
    *,
    token: str,
    access_client_id: Optional[str],
    access_client_secret: Optional[str],
    timeout: float,
    max_bytes: int,
) -> Mapping[str,Any]:
    body=json.dumps(payload,separators=(",",":"),ensure_ascii=False).encode("utf-8")
    headers={
        "Accept":"application/json",
        "Content-Type":"application/json",
        "Authorization":f"Bearer {token}",
        "User-Agent":"MAISON-JF-A11/1.0",
    }
    if access_client_id and access_client_secret:
        headers["CF-Access-Client-Id"]=access_client_id
        headers["CF-Access-Client-Secret"]=access_client_secret
    request=urllib.request.Request(url,data=body,headers=headers,method="POST")
    try:
        with urllib.request.urlopen(request,timeout=timeout) as response:
            raw=response.read(max_bytes+1)
            if len(raw)>max_bytes:
                raise A11LearningClientError("a11_learning_response_too_large")
            if "application/json" not in response.headers.get("content-type","").lower():
                raise A11LearningClientError("a11_learning_non_json_response")
    except urllib.error.HTTPError as exc:
        try:
            detail=json.loads(exc.read().decode("utf-8"))
            code=detail.get("error") if isinstance(detail,Mapping) else None
        except Exception:
            code=None
        raise A11LearningClientError(code or f"a11_learning_http_{exc.code}") from exc
    except urllib.error.URLError as exc:
        raise A11LearningClientError("a11_learning_unreachable") from exc

    try:
        value=json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise A11LearningClientError("a11_learning_invalid_json") from exc
    if not isinstance(value,Mapping):
        raise A11LearningClientError("a11_learning_invalid_payload")
    return value


@dataclass(frozen=True)
class A11LearningClient:
    base_url: str
    token: str
    access_client_id: Optional[str]=None
    access_client_secret: Optional[str]=None
    timeout: float=15.0
    max_bytes: int=1_000_000
    transport: Callable[...,Mapping[str,Any]]=_default_transport

    def __post_init__(self) -> None:
        object.__setattr__(self,"base_url",_safe_base_url(self.base_url))
        if not self.token.strip():
            raise A11LearningClientError("a11_learning_token_required")
        if (self.access_client_id is None)!=(self.access_client_secret is None):
            raise A11LearningClientError("cloudflare_access_credentials_must_be_paired")

    def append_content_learning(self,payload: Mapping[str,Any]) -> Mapping[str,Any]:
        return self.transport(
            self.base_url+"/internal/a11/content-learning",
            payload,
            token=self.token,
            access_client_id=self.access_client_id,
            access_client_secret=self.access_client_secret,
            timeout=self.timeout,
            max_bytes=self.max_bytes,
        )
