#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth-engine}"
CONFIRM="${2:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

if [[ "$CONFIRM" != "--confirm-reviewed-0017-b2b" ]]; then
  echo "Refusing to apply 0017 without --confirm-reviewed-0017-b2b." >&2
  exit 2
fi

echo "Preflight: inspecting canonical B2B solution state."
state_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command   "SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_b2b_solution_seed_version';")"
seed_state="$(printf '%s' "$state_json" | jq -r '.[0].results[0].schema_value // empty')"
if [[ "$seed_state" == "0017" ]]; then
  echo "0017 already recorded; nothing to apply."
  exit 0
fi

solution_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command   "SELECT solution_type,delivery_mode,capacity_class,status FROM solutions WHERE solution_key='b2b' LIMIT 1;")"
existing_type="$(printf '%s' "$solution_json" | jq -r '.[0].results[0].solution_type // empty')"
if [[ -n "$existing_type" ]]; then
  existing_delivery="$(printf '%s' "$solution_json" | jq -r '.[0].results[0].delivery_mode // empty')"
  existing_capacity="$(printf '%s' "$solution_json" | jq -r '.[0].results[0].capacity_class // empty')"
  existing_status="$(printf '%s' "$solution_json" | jq -r '.[0].results[0].status // empty')"
  if [[ "$existing_type" != "b2b" || "$existing_delivery" != "human" || "$existing_capacity" != "negotiated" || "$existing_status" != "active" ]]; then
    echo "Refusing apply: existing solution_key=b2b is incompatible with the reviewed canonical mapping." >&2
    exit 3
  fi
fi

echo "Applying reviewed migration 0017."
npx wrangler d1 execute "$DB_NAME" --remote --file="$ROOT/.github/maison-growth/a3/migrations/0017_b2b_canonical_solution.sql"

verify_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command   "SELECT s.solution_id,s.solution_type,s.delivery_mode,s.capacity_class,s.status,
          (SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_b2b_solution_seed_version') AS seed_version
   FROM solutions s WHERE s.solution_key='b2b' LIMIT 1;")"
ok="$(printf '%s' "$verify_json" | jq -r '.[0].results[0] | select(.solution_type=="b2b" and .delivery_mode=="human" and .capacity_class=="negotiated" and .status=="active" and .seed_version=="0017") | .solution_id // empty')"
if [[ -z "$ok" ]]; then
  echo "0017 post-apply verification failed." >&2
  exit 4
fi

echo "0017 applied and verified. No Worker deploy, outbound authority, provider activation or spend authority was changed."
