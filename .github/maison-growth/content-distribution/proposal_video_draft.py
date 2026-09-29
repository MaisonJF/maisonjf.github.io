#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Mapping

NEGATIVE_PROMPT = "low quality, blurry, distorted, deformed, static frame, text artifacts, watermark"


class ProposalVideoDraftError(RuntimeError):
    pass


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify(value: str, fallback: str = "maison-content-proposal") -> str:
    text = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return (text or fallback)[:80].strip("-") or fallback


def _priority(proposal: Mapping[str, Any]) -> int:
    try:
        return int(proposal.get("source", {}).get("priority") or 0)
    except Exception:
        return 0


def _priority_band(proposal: Mapping[str, Any]) -> str:
    return str(proposal.get("editorial_decision", {}).get("priority_band") or "")


def select_content_proposal(payload: Mapping[str, Any], *, proposal_id: str | None = None) -> Mapping[str, Any]:
    if payload.get("state") == "ready_for_editorial_review" and payload.get("proposal_id"):
        candidates = [payload]
    else:
        candidates = []
        for item in payload.get("content_proposals") or []:
            if isinstance(item, Mapping):
                candidates.append(dict(item))
        for row in payload.get("rows") or []:
            if isinstance(row, Mapping) and isinstance(row.get("content_proposal"), Mapping):
                candidates.append(dict(row["content_proposal"]))

    candidates = [
        item for item in candidates
        if item.get("state") == "ready_for_editorial_review"
        and item.get("editorial_decision", {}).get("format") == "short_video"
    ]
    if proposal_id:
        candidates = [item for item in candidates if item.get("proposal_id") == proposal_id]
    if not candidates:
        raise ProposalVideoDraftError("no_ready_short_video_content_proposal")

    candidates.sort(
        key=lambda item: (
            0 if _priority_band(item) == "today" else 1,
            -_priority(item),
            str(item.get("proposal_id") or ""),
        )
    )
    return candidates[0]


def validate_proposal(proposal: Mapping[str, Any]) -> None:
    if proposal.get("state") != "ready_for_editorial_review":
        raise ProposalVideoDraftError("proposal_not_ready_for_editorial_review")
    if proposal.get("editorial_decision", {}).get("format") != "short_video":
        raise ProposalVideoDraftError("proposal_not_short_video")
    gates = proposal.get("gates") or {}
    if gates.get("human_editorial_review_required") is not True:
        raise ProposalVideoDraftError("human_editorial_review_gate_missing")
    for key in (
        "automatic_publication",
        "automatic_scheduling",
        "paid_generation_authorized",
        "spend_authorized",
    ):
        if gates.get(key) not in (False, None):
            raise ProposalVideoDraftError(f"{key}_must_remain_false")

    execution_gate = proposal.get("video_draft_plan", {}).get("execution_gate") or {}
    if execution_gate.get("human_editorial_review_required") is not True:
        raise ProposalVideoDraftError("video_execution_human_gate_missing")
    for key in ("automatic_publication", "automatic_generation", "spend_authorized"):
        if execution_gate.get(key) not in (False, None):
            raise ProposalVideoDraftError(f"video_{key}_must_remain_false")

    if not proposal.get("draft", {}).get("hook"):
        raise ProposalVideoDraftError("proposal_hook_missing")
    if not proposal.get("video_draft_plan", {}).get("shots"):
        raise ProposalVideoDraftError("proposal_video_shots_missing")


def build_generation_recipe(proposal: Mapping[str, Any]) -> dict[str, Any]:
    validate_proposal(proposal)
    plan = proposal.get("video_draft_plan") or {}
    shots = list(plan.get("shots") or [])
    first = shots[0]
    source_image = (
        first.get("image_url")
        or plan.get("source_image_url")
        or proposal.get("visual_brief", {}).get("source_image_url")
    )
    if not source_image or not str(source_image).startswith("https://"):
        raise ProposalVideoDraftError("source_image_url_must_be_https")

    hook = str(proposal.get("draft", {}).get("hook") or "").strip()
    caption = str(proposal.get("draft", {}).get("caption") or "").strip()
    visual = str(proposal.get("visual_brief", {}).get("subject") or "").strip()
    motion = str(first.get("motion_prompt") or "").strip()
    prompt = " ".join(
        x for x in [
            motion,
            f"Visual brief: {visual}." if visual else "",
            "Preserve the original visual identity, premium Maison JF mood, realistic subtle motion, no generated words inside the provider output.",
        ] if x
    )

    proposal_id = str(proposal.get("proposal_id") or "content-proposal")
    slug = slugify(proposal_id)
    return {
        "proposal_id": proposal_id,
        "slug": slug,
        "source_image_url": source_image,
        "prompt": prompt,
        "negative_prompt": NEGATIVE_PROMPT,
        "duration_seconds": min(3.0, max(1.0, float(first.get("duration_seconds") or 2.0))),
        "steps": 4,
        "seed": 42,
        "hook": hook,
        "caption": caption,
        "cta": str(proposal.get("draft", {}).get("cta_text") or "Vê em maison-jf.com").strip(),
        "persistent_url": str(
            proposal.get("draft", {}).get("on_screen_url")
            or proposal.get("video_draft_plan", {}).get("overlays", {}).get("persistent_url")
            or "maison-jf.com"
        ).strip(),
        "priority": _priority(proposal),
        "priority_band": _priority_band(proposal),
        "ocean_key": proposal.get("source", {}).get("ocean_key"),
        "destination": proposal.get("destination", {}).get("approved_existing_path"),
    }


def _walk_for_mp4(value: Any, out: list[str]) -> None:
    if isinstance(value, str):
        if value.lower().endswith(".mp4") and os.path.exists(value):
            out.append(value)
    elif isinstance(value, Mapping):
        for item in value.values():
            _walk_for_mp4(item, out)
    elif isinstance(value, (list, tuple)):
        for item in value:
            _walk_for_mp4(item, out)


def generate_raw_clip(recipe: Mapping[str, Any], output_dir: Path) -> Path:
    try:
        from gradio_client import Client, handle_file
    except Exception as exc:
        raise ProposalVideoDraftError("gradio_client_missing") from exc

    client = Client(
        "zerogpu-aoti/wan2-2-fp8da-aoti-faster",
        download_files=True,
        verbose=False,
    )
    result = client.predict(
        handle_file(str(recipe["source_image_url"])),
        str(recipe["prompt"]),
        int(recipe.get("steps") or 4),
        str(recipe.get("negative_prompt") or NEGATIVE_PROMPT),
        float(recipe.get("duration_seconds") or 2.0),
        1.0,
        1.0,
        int(recipe.get("seed") or 42),
        False,
        api_name="/generate_video",
    )

    candidates: list[str] = []
    _walk_for_mp4(result, candidates)
    if not candidates:
        raise ProposalVideoDraftError("zero_cost_provider_returned_no_mp4")

    output_dir.mkdir(parents=True, exist_ok=True)
    raw = output_dir / f"{recipe['slug']}-raw.mp4"
    shutil.copy2(candidates[0], raw)
    if raw.stat().st_size <= 0:
        raise ProposalVideoDraftError("generated_raw_clip_empty")
    return raw


def write_overlay_texts(recipe: Mapping[str, Any], output_dir: Path) -> tuple[Path, Path]:
    hook_file = output_dir / "hook.txt"
    url_file = output_dir / "url.txt"
    hook_file.write_text(str(recipe["hook"]).replace("—", ",").replace("–", ","), encoding="utf-8")
    url_file.write_text(str(recipe["persistent_url"] or "maison-jf.com"), encoding="utf-8")
    return hook_file, url_file


def render_final_mp4(raw_clip: Path, recipe: Mapping[str, Any], output_dir: Path) -> Path:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise ProposalVideoDraftError("ffmpeg_missing")

    hook_file, url_file = write_overlay_texts(recipe, output_dir)
    final = output_dir / f"{recipe['slug']}-review-draft.mp4"
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    fontfile = bold if Path(bold).exists() else font

    vf = (
        "scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,"
        "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.10:t=fill,"
        f"drawtext=fontfile='{fontfile}':textfile='{hook_file}':"
        "x=64:y=h-th-360:fontsize=54:fontcolor=white:"
        "line_spacing=10:box=1:boxcolor=black@0.46:boxborderw=26,"
        f"drawtext=fontfile='{fontfile}':textfile='{url_file}':"
        "x=64:y=h-130:fontsize=34:fontcolor=white:"
        "box=1:boxcolor=black@0.35:boxborderw=18"
    )
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(raw_clip),
        "-vf",
        vf,
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(final),
    ]
    subprocess.run(cmd, check=True)
    if final.stat().st_size <= 0:
        raise ProposalVideoDraftError("final_mp4_empty")
    return final


def build_manifest(proposal: Mapping[str, Any], recipe: Mapping[str, Any], *, mp4: str | None = None) -> dict[str, Any]:
    return {
        "contract_version": "MAISON-CONTENT-PROPOSAL-VIDEO-DRAFT-1.0",
        "state": "ready_for_human_approval" if mp4 else "recipe_ready",
        "proposal_id": recipe["proposal_id"],
        "source": {
            "ocean_key": recipe.get("ocean_key"),
            "priority": recipe.get("priority"),
            "priority_band": recipe.get("priority_band"),
            "destination": recipe.get("destination"),
        },
        "artifact": {
            "mp4": mp4,
            "format": "vertical_9_16_short_video",
            "publication": "not_published",
            "scheduling": "not_scheduled",
        },
        "copy": {
            "hook": recipe["hook"],
            "caption": recipe["caption"],
            "cta": recipe["cta"],
            "persistent_url": recipe["persistent_url"],
        },
        "gates": {
            "human_editorial_review_required": True,
            "automatic_publication": False,
            "automatic_scheduling": False,
            "spend_authorized": False,
            "social_api_called": False,
        },
        "original_proposal": proposal,
    }


def cmd_select(args: argparse.Namespace) -> None:
    payload = load_json(Path(args.input))
    proposal = select_content_proposal(payload, proposal_id=args.proposal_id or None)
    validate_proposal(proposal)
    write_json(Path(args.output), proposal)


def cmd_manifest(args: argparse.Namespace) -> None:
    proposal = load_json(Path(args.proposal))
    recipe = build_generation_recipe(proposal)
    manifest = build_manifest(proposal, recipe)
    write_json(Path(args.output), manifest)


def cmd_render(args: argparse.Namespace) -> None:
    proposal = load_json(Path(args.proposal))
    recipe = build_generation_recipe(proposal)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.no_generate:
        manifest = build_manifest(proposal, recipe)
        manifest_path = output_dir / f"{recipe['slug']}-manifest.json"
        write_json(manifest_path, manifest)
        print(json.dumps({"state": "recipe_ready", "manifest": str(manifest_path)}))
        return

    raw = generate_raw_clip(recipe, output_dir)
    final = render_final_mp4(raw, recipe, output_dir)
    manifest = build_manifest(proposal, recipe, mp4=str(final))
    manifest_path = output_dir / f"{recipe['slug']}-manifest.json"
    write_json(manifest_path, manifest)
    print(json.dumps({"state": "ready_for_human_approval", "mp4": str(final), "manifest": str(manifest_path)}))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a zero-cost Maison short-video draft from a Brain content proposal.")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("select", help="Select the strongest ready short-video proposal from Brain output.")
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--proposal-id", default="")
    p.set_defaults(func=cmd_select)

    p = sub.add_parser("manifest", help="Validate a proposal and write a review manifest without generating video.")
    p.add_argument("--proposal", required=True)
    p.add_argument("--output", required=True)
    p.set_defaults(func=cmd_manifest)

    p = sub.add_parser("render", help="Generate a vertical MP4 review draft.")
    p.add_argument("--proposal", required=True)
    p.add_argument("--output-dir", required=True)
    p.add_argument("--no-generate", action="store_true")
    p.set_defaults(func=cmd_render)

    args = parser.parse_args()
    try:
        args.func(args)
    except ProposalVideoDraftError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
