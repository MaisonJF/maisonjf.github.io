#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:---write}"
PYTHON_BIN="${PYTHON:-python}"

run_optional_discovery() {
  if [[ -f "$ROOT/build_public_discovery.mjs" ]]; then
    if [[ "$MODE" == "--check" ]]; then
      node "$ROOT/build_public_discovery.mjs" --check
    else
      node "$ROOT/build_public_discovery.mjs"
    fi
  fi
}

run_optional_b2b_validation() {
  if [[ -f "$ROOT/validate_b2b_knowledge_graph.mjs" ]]; then
    node "$ROOT/validate_b2b_knowledge_graph.mjs"
  fi
}

case "$MODE" in
  --write)
    node "$ROOT/build_vpc_ocean_signals.mjs"
    node "$ROOT/build_editorial_queue.mjs"
    node "$ROOT/build_commercial_assets.mjs"
    run_optional_discovery
    node "$ROOT/build_maison_knowledge_graph.mjs"
    run_optional_b2b_validation
    "$PYTHON_BIN" "$ROOT/digital_experience_coverage.py" --check
    "$PYTHON_BIN" "$ROOT/build_commercial_bundles.py"
    "$PYTHON_BIN" "$ROOT/build_commercial_attention.py" --check
    ;;
  --check)
    node "$ROOT/build_vpc_ocean_signals.mjs" --check
    node "$ROOT/build_editorial_queue.mjs" --check
    node "$ROOT/build_commercial_assets.mjs" --check
    run_optional_discovery
    node "$ROOT/build_maison_knowledge_graph.mjs" --check
    run_optional_b2b_validation
    "$PYTHON_BIN" "$ROOT/digital_experience_coverage.py" --check
    "$PYTHON_BIN" "$ROOT/build_commercial_bundles.py" --check
    "$PYTHON_BIN" "$ROOT/build_commercial_attention.py" --check
    ;;
  *)
    echo "usage: $0 [--write|--check]" >&2
    exit 2
    ;;
esac

echo "Maison derived commercial context: ${MODE#--} OK"
