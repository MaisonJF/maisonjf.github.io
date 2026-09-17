#!/usr/bin/env python3
from __future__ import annotations

import fnmatch
import hashlib
import json
import posixpath
import re
from dataclasses import dataclass
from pathlib import PurePosixPath, Path
from typing import Any, Iterable, Mapping, Optional

ROOT = Path(__file__).resolve().parent
POLICY = json.loads((ROOT / "publisher-policy.json").read_text(encoding="utf-8"))

HEX40_RE = re.compile(r"^[0-9a-f]{40}$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")
ID_RE = re.compile(r"^[a-z]{3}_[0-9a-f]{36}$")

class GatewayError(Exception): pass
class ValidationError(GatewayError): pass
class ForbiddenPath(GatewayError): pass
class AllowlistViolation(GatewayError): pass
class DiffTampered(GatewayError): pass
class GuardFailed(GatewayError): pass
class PublishConflict(GatewayError): pass

@dataclass(frozen=True)
class DiffFile:
    path: str
    change_type: str
    before_content: Optional[str]
    after_content: Optional[str]
    before_hash: Optional[str]
    after_hash: Optional[str]
    mutation_capabilities: tuple[str, ...] = ()

@dataclass(frozen=True)
class ValidationRecord:
    key: str
    passed: bool
    detail: str


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def stable_id(prefix: str, payload: Any) -> str:
    return prefix + hashlib.sha256(canonical(payload).encode("utf-8")).hexdigest()[:36]

def validate_growth_id(value: Optional[str], prefix: str, required: bool=True) -> None:
    if value is None:
        if required: raise ValidationError(f"{prefix} id required")
        return
    if len(value) != 40 or not value.startswith(prefix) or not ID_RE.match(value):
        raise ValidationError(f"invalid {prefix} id")

def validate_commit_sha(value: str) -> None:
    if not isinstance(value, str) or not HEX40_RE.match(value): raise ValidationError("baseline commit must be 40 lowercase hex chars")

def normalize_repo_path(path: str) -> str:
    if not isinstance(path, str) or not path or "\\" in path or path.startswith("/"):
        raise ValidationError("invalid repository path")
    normalized = posixpath.normpath(path)
    if normalized in (".", "..") or normalized.startswith("../") or "/../" in f"/{normalized}/":
        raise ValidationError("path traversal rejected")
    if normalized != path or any(part in ("", ".", "..") for part in PurePosixPath(path).parts):
        raise ValidationError("non-canonical repository path")
    return normalized

def matches_pattern(path: str, pattern: str) -> bool:
    if pattern.endswith("/**"):
        root = pattern[:-3]
        return path == root or path.startswith(root + "/")
    return fnmatch.fnmatchcase(path, pattern)

def assert_not_protected(path: str, mutation_capabilities: Iterable[str]) -> None:
    for pattern in POLICY["protected_paths"]:
        if matches_pattern(path, pattern): raise ForbiddenPath(f"protected path: {path}")
    protected = set(POLICY["protected_capabilities"])
    overlap = protected.intersection(mutation_capabilities)
    if overlap: raise AllowlistViolation(f"protected capability: {sorted(overlap)}")

def validate_hashes(item: DiffFile) -> None:
    if item.change_type not in {"create","update","delete"}: raise ValidationError("unsupported change type")
    if item.change_type == "create" and (item.before_content is not None or item.before_hash is not None): raise DiffTampered("create must not declare previous content")
    if item.change_type == "delete" and (item.after_content is not None or item.after_hash is not None): raise DiffTampered("delete must not declare after content")
    if item.before_content is not None:
        actual = sha256_text(item.before_content)
        if item.before_hash != actual: raise DiffTampered("before hash mismatch")
    if item.after_content is not None:
        actual = sha256_text(item.after_content)
        if item.after_hash != actual: raise DiffTampered("after hash mismatch")
    for h in (item.before_hash, item.after_hash):
        if h is not None and not HEX64_RE.match(h): raise DiffTampered("invalid content hash")

def is_content_create_allowed(path: str) -> bool:
    if not path.endswith(".html"): return False
    for root in POLICY["actions"]["ocean_promotion"]["create_content_roots"]:
        if path.startswith(root) and path.count("/") == root.count("/"):
            return len(path) > len(root) + len(".html")
    return False

def validate_action_allowlist(action: str, request: Mapping[str, Any], item: DiffFile) -> None:
    path = normalize_repo_path(item.path)
    assert_not_protected(path, item.mutation_capabilities)
    if action == "ocean_promotion":
        if item.mutation_capabilities: raise AllowlistViolation("ocean promotion cannot declare unrelated mutation capabilities")
        if item.change_type == "create":
            if is_content_create_allowed(path): return
            if fnmatch.fnmatchcase(path, "sitemap-oceans-*.xml"): return
            raise AllowlistViolation(f"create outside Ocean allowlist: {path}")
        if item.change_type == "update" and path == "sitemap.xml": return
        raise AllowlistViolation(f"Ocean diff not allowed: {item.change_type} {path}")
    if action == "cta_experiment":
        target = normalize_repo_path(str(request.get("target_asset_path", "")))
        if path != target or item.change_type != "update": raise AllowlistViolation("CTA experiment may update only its exact target asset")
        allowed = set(POLICY["actions"][action]["allowed_mutation_capabilities"])
        if not item.mutation_capabilities or not set(item.mutation_capabilities) <= allowed:
            raise AllowlistViolation("CTA mutation capability outside allowlist")
        return
    if action == "rollback":
        original = request.get("rollback_original_files")
        if not isinstance(original, list): raise ValidationError("rollback original files required")
        indexed = {str(x["path"]): x for x in original}
        if path not in indexed: raise AllowlistViolation("rollback file not in original run")
        spec = indexed[path]
        expected_after = spec.get("before_hash")
        if item.after_hash != expected_after: raise DiffTampered("rollback does not restore exact previous hash")
        return
    raise ValidationError("unsupported action")

def validate_required_links(request: Mapping[str, Any]) -> None:
    action = request.get("action")
    if action not in POLICY["actions"]: raise ValidationError("unknown action")
    validate_growth_id(request.get("decision_id"), "dec_")
    validate_commit_sha(str(request.get("baseline_commit_sha", "")))
    snapshot_hash = request.get("snapshot_hash")
    if not isinstance(snapshot_hash, str) or not HEX64_RE.match(snapshot_hash): raise ValidationError("snapshot_hash required")
    if action == "ocean_promotion": validate_growth_id(request.get("candidate_id"), "can_")
    if action == "cta_experiment": validate_growth_id(request.get("experiment_id"), "exp_")
    if action == "rollback": validate_growth_id(request.get("rollback_of_publish_run_id"), "pub_")

def validate_guard(action: str, guard_result: Mapping[str, Any]) -> None:
    if POLICY["actions"][action].get("ocean_guard_required"):
        if guard_result.get("name") != "Oceans Guard" or guard_result.get("conclusion") != "success":
            raise GuardFailed("required Oceans Guard did not pass")

def validate_prepublication(action: str, supplied: Mapping[str, Any]) -> list[ValidationRecord]:
    if not isinstance(supplied, Mapping): raise ValidationError("prepublication validation results required")
    records=[]
    for key in POLICY["actions"][action]["required_validations"]:
        if key in {"diff_allowlist","ocean_guard"}: continue
        result=supplied.get(key)
        if not isinstance(result, Mapping) or result.get("passed") is not True:
            raise ValidationError(f"required prepublication validation failed or missing: {key}")
        records.append(ValidationRecord(key,True,str(result.get("detail","passed"))))
    return records

def diff_fingerprint(files: Iterable[DiffFile]) -> str:
    data=[]
    for f in sorted(files, key=lambda x:x.path):
        data.append({"path":f.path,"change_type":f.change_type,"before_hash":f.before_hash,"after_hash":f.after_hash,"mutation_capabilities":list(f.mutation_capabilities)})
    return sha256_text(canonical(data))

def detect_conflict(new_paths: Iterable[str], active_runs: Iterable[Mapping[str, Any]]) -> None:
    wanted=set(new_paths)
    for run in active_runs:
        if run.get("status") not in {"planned","validated","branch_prepared","awaiting_guard","ready_for_human_merge"}: continue
        overlap = wanted.intersection(set(run.get("claimed_paths", [])))
        if overlap: raise PublishConflict(f"overlapping active publish run paths: {sorted(overlap)}")

def build_dry_run(request: Mapping[str, Any], files: Iterable[DiffFile], *, guard_result: Mapping[str, Any], active_runs: Iterable[Mapping[str, Any]]=()) -> dict[str, Any]:
    if POLICY.get("mode") != "dry_run_only": raise ValidationError("A9 repository implementation must stay dry-run only")
    validate_required_links(request)
    action=str(request["action"])
    prepared=tuple(files)
    if not prepared: raise ValidationError("empty diff")
    seen=set()
    records=[]
    for item in prepared:
        path=normalize_repo_path(item.path)
        if path in seen: raise ValidationError("duplicate diff path")
        seen.add(path)
        validate_hashes(item)
        validate_action_allowlist(action, request, item)
        records.append(ValidationRecord("file_allowlist",True,path))
    if action == "rollback":
        original_paths={str(x["path"]) for x in request["rollback_original_files"]}
        if seen != original_paths: raise AllowlistViolation("rollback must restore exact original file set")
    detect_conflict(seen, active_runs)
    records.extend(validate_prepublication(action, request.get("prepublication_results", {})))
    validate_guard(action, guard_result)
    fp=diff_fingerprint(prepared)
    idempotency={
        "action":action,"decision_id":request["decision_id"],"candidate_id":request.get("candidate_id"),
        "experiment_id":request.get("experiment_id"),"rollback_of":request.get("rollback_of_publish_run_id"),
        "baseline":request["baseline_commit_sha"],"snapshot":request["snapshot_hash"],"diff":fp
    }
    run_id=stable_id("pub_", idempotency)
    branch=POLICY["branch_prefix"]+run_id
    rollback_plan=[{"path":f.path,"restore_hash":f.before_hash,"from_hash":f.after_hash} for f in sorted(prepared,key=lambda x:x.path)]
    return {
        "publish_run_id":run_id,"mode":"dry_run","action":action,"decision_id":request["decision_id"],
        "candidate_id":request.get("candidate_id"),"experiment_id":request.get("experiment_id"),
        "rollback_of_publish_run_id":request.get("rollback_of_publish_run_id"),
        "baseline_commit_sha":request["baseline_commit_sha"],"snapshot_hash":request["snapshot_hash"],
        "branch_name":branch,"diff_fingerprint":fp,"claimed_paths":sorted(seen),
        "validations":[r.__dict__ for r in records]+[{"key":"ocean_guard","passed":True,"detail":"success"}],
        "rollback_plan":rollback_plan,"ready_for_public_write":False,"requires_future_publisher_credential":True,
        "public_side_effects":False
    }
