#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:---write}"
PYTHON_BIN="${PYTHON:-python}"

case "$MODE" in
  --write)
    node "$ROOT/build_vpc_ocean_signals.mjs"
    node "$ROOT/build_editorial_queue.mjs"
    node "$ROOT/build_commercial_assets.mjs"
    node "$ROOT/build_digital_experience_coverage.mjs"
    "$PYTHON_BIN" "$ROOT/build_commercial_bundles.py"
    "$PYTHON_BIN" "$ROOT/build_commercial_attention.py"
    ;;
  --check)
    node "$ROOT/build_vpc_ocean_signals.mjs" --check
    node "$ROOT/build_editorial_queue.mjs" --check
    node "$ROOT/build_commercial_assets.mjs" --check
    node "$ROOT/build_digital_experience_coverage.mjs" --check
    "$PYTHON_BIN" "$ROOT/build_commercial_bundles.py" --check
    "$PYTHON_BIN" "$ROOT/build_commercial_attention.py" --check
    ;;
  *)
    echo "usage: $0 [--write|--check]" >&2
    exit 2
    ;;
esac

echo "Maison derived commercial context: ${MODE#--} OK"
