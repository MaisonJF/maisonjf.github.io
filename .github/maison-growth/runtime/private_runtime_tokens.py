#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import hmac
import os
from pathlib import Path
from typing import Mapping

_LABELS = {
    "proposal": b"maison-private-runtime/proposal/v1",
    "review": b"maison-private-runtime/review/v1",
}


class PrivateRuntimeTokenError(ValueError):
    pass


def _root_token(values: Mapping[str, str]) -> str:
    value = str(
        values.get("MAISON_BRAIN_CONTROL_TOKEN")
        or values.get("BRAIN_CONTROL_TOKEN")
        or ""
    ).strip()
    if len(value) < 24:
        raise PrivateRuntimeTokenError("brain_control_token_missing_or_too_short")
    if "\n" in value or "\r" in value:
        raise PrivateRuntimeTokenError("brain_control_token_multiline_forbidden")
    return value


def derive_private_token(root_token: str, scope: str) -> str:
    root = str(root_token or "").strip()
    if len(root) < 24:
        raise PrivateRuntimeTokenError("brain_control_token_missing_or_too_short")
    if scope not in _LABELS:
        raise PrivateRuntimeTokenError("unknown_private_runtime_scope")
    digest = hmac.new(root.encode("utf-8"), _LABELS[scope], hashlib.sha256).hexdigest()
    prefix = "mrt_proposal_" if scope == "proposal" else "mrt_review_"
    return prefix + digest


def resolve_private_runtime_tokens(values: Mapping[str, str]) -> dict[str, str]:
    root = _root_token(values)
    proposal = str(
        values.get("MAISON_BRAIN_PROPOSAL_TOKEN")
        or values.get("BRAIN_PROPOSAL_TOKEN")
        or ""
    ).strip() or derive_private_token(root, "proposal")
    review = str(
        values.get("MAISON_BRAIN_REVIEW_DECISION_TOKEN")
        or values.get("BRAIN_REVIEW_DECISION_TOKEN")
        or ""
    ).strip() or derive_private_token(root, "review")
    if len({root, proposal, review}) != 3:
        raise PrivateRuntimeTokenError("private_runtime_tokens_must_be_distinct")
    return {
        "BRAIN_CONTROL_TOKEN": root,
        "BRAIN_PROPOSAL_TOKEN": proposal,
        "BRAIN_REVIEW_DECISION_TOKEN": review,
    }


def write_github_env(values: Mapping[str, str], path: Path) -> None:
    tokens = resolve_private_runtime_tokens(values)
    with path.open("a", encoding="utf-8") as handle:
        for name, value in tokens.items():
            if name == "BRAIN_CONTROL_TOKEN":
                continue
            handle.write(f"{name}={value}\n")
    for name, value in tokens.items():
        if name == "BRAIN_CONTROL_TOKEN":
            continue
        print(f"::add-mask::{value}")
    print("Prepared scoped private-runtime credentials from the existing Brain control token.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Derive scoped Maison private-runtime credentials from one root token."
    )
    parser.add_argument(
        "--github-env",
        type=Path,
        help="Append derived proposal/review tokens to a GitHub Actions GITHUB_ENV file.",
    )
    args = parser.parse_args()
    if args.github_env is None:
        tokens = resolve_private_runtime_tokens(os.environ)
        print("private_runtime_tokens_ready=true")
        print("proposal_token_source=derived_or_explicit")
        print("review_token_source=derived_or_explicit")
        print(f"tokens_distinct={len(set(tokens.values())) == 3}")
        return
    write_github_env(os.environ, args.github_env)


if __name__ == "__main__":
    main()
