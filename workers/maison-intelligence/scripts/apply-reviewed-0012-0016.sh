#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth-engine}"
CONFIRM="${2:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

if [[ "$CONFIRM" != "--confirm-reviewed-0012-0016" ]]; then
  echo "Refusing to apply reviewed migrations without --confirm-reviewed-0012-0016." >&2
  exit 2
fi

EXPECTED_OBJECTS=(
  opportunity_hypotheses
  opportunity_offer_hypotheses
  earned_distribution_match_assessments
  distribution_value_observations
  a14_governance_links
  a14_experiment_links
  a14_outcome_links
  a14_learning_links
  a14_realised_economics
  brain_prebrain_feed
  brain_cash_feedback
  autonomy_human_review_resolutions
  autonomy_human_queue_current
  a14_validation_plans
  a14_validation_plan_a7_links
  a14_validation_plan_a8_links
  a14_approved_offers_ready_for_planning
)

names_sql=""
for name in "${EXPECTED_OBJECTS[@]}"; do
  if [[ -n "$names_sql" ]]; then names_sql+=","; fi
  names_sql+="'$name'"
done

echo "Preflight: confirming reviewed 0012-0016 surfaces are still absent."
precheck_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command   "SELECT COUNT(*) AS existing_objects FROM sqlite_master WHERE name IN ($names_sql);")"
existing_objects="$(printf '%s' "$precheck_json" | jq -r '.[0].results[0].existing_objects')"
if [[ "$existing_objects" != "0" ]]; then
  echo "Refusing apply: found $existing_objects object(s) from migrations 0012-0016. Re-run the read-only inspector before any write." >&2
  exit 3
fi

state_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command   "SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a12_schema_version';")"
a12_state="$(printf '%s' "$state_json" | jq -r '.[0].results[0].schema_value // empty')"
if [[ "$a12_state" != "A12.1" ]]; then
  echo "Refusing apply: expected maison_growth_a12_schema_version=A12.1, got '${a12_state:-missing}'." >&2
  exit 4
fi

files=(
  ".github/maison-growth/a14/migrations/0012_universal_opportunity_earned_distribution.sql"
  ".github/maison-growth/a14/migrations/0013_a14_bridges_cash.sql"
  ".github/maison-growth/brain/migrations/0014_brain_runtime_views.sql"
  ".github/maison-growth/a12/migrations/0015_human_commercial_review_resolution.sql"
  ".github/maison-growth/a14/migrations/0016_approved_validation_planning.sql"
)

for file in "${files[@]}"; do
  echo "Applying reviewed migration: $file"
  npx wrangler d1 execute "$DB_NAME" --remote --file="$ROOT/$file"
done

echo "Reviewed migrations 0012-0016 applied. No Worker deploy, outbound activation, provider enablement, or spend authorization was performed."
