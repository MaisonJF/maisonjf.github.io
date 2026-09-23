#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Mapping, Optional

from brain_control_client import BrainControlError, _NoRedirect, _safe_base_url


class BrainReviewDecisionError(BrainControlError):
    pass


@dataclass(frozen=True)
class BrainReviewDecisionClient:
    base_url: str
    token: str
    access_client_id: Optional[str]=None
    access_client_secret: Optional[str]=None
    timeout: float=20.0
    max_bytes: int=1_000_000

    def __post_init__(self) -> None:
        object.__setattr__(self,"base_url",_safe_base_url(self.base_url))
        if not self.token.strip():
            raise BrainReviewDecisionError("brain_review_decision_token_required")
        if (self.access_client_id is None)!=(self.access_client_secret is None):
            raise BrainReviewDecisionError("cloudflare_access_credentials_must_be_paired")

    def decide(
        self,
        *,
        queue_id: str,
        decision: str,
        decision_reason: str,
        evidence_refs: tuple[str,...]=(),
    ) -> Mapping[str,Any]:
        payload={
            "schema":"maison.a12-review-decision.v1",
            "queue_id":queue_id,
            "decision":decision,
            "decision_reason":decision_reason,
            "evidence_refs":list(evidence_refs),
        }
        raw=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf-8")
        headers={
            "Accept":"application/json",
            "Content-Type":"application/json",
            "Authorization":f"Bearer {self.token}",
            "User-Agent":"MAISON-JF-Human-Review/1.0",
        }
        if self.access_client_id and self.access_client_secret:
            headers["CF-Access-Client-Id"]=self.access_client_id
            headers["CF-Access-Client-Secret"]=self.access_client_secret
        request=urllib.request.Request(
            self.base_url+"/internal/reviews/a12",
            data=raw,headers=headers,method="POST",
        )
        opener=urllib.request.build_opener(_NoRedirect())
        try:
            with opener.open(request,timeout=self.timeout) as response:
                body=response.read(self.max_bytes+1)
                if len(body)>self.max_bytes:
                    raise BrainReviewDecisionError("brain_review_response_too_large")
        except urllib.error.HTTPError as exc:
            detail=""
            try: detail=exc.read(65536).decode("utf-8","replace")
            except Exception: pass
            raise BrainReviewDecisionError(f"brain_review_http_{exc.code}:{detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise BrainReviewDecisionError("brain_review_unreachable") from exc

        try:
            value=json.loads(body.decode("utf-8"))
        except Exception as exc:
            raise BrainReviewDecisionError("brain_review_invalid_json") from exc
        if not isinstance(value,Mapping):
            raise BrainReviewDecisionError("brain_review_invalid_payload")
        return value
