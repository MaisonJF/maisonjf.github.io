#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth-engine}"

SQL="
SELECT 1 AS ok FROM external_intelligence_control LIMIT 0;
SELECT observation_id,event_id,territory_key,evidence_id FROM brain_prebrain_feed LIMIT 0;
SELECT economic_assessment_id,solution_id FROM brain_cash_feedback LIMIT 0;
SELECT conversion_id,lifecycle_stage,solution_id FROM brain_b2b_feedback LIMIT 0;
SELECT queue_id,effective_status,review_resolution_id FROM autonomy_human_queue_current LIMIT 0;
SELECT opportunity_id,offer_hypothesis_id,review_resolution_id FROM a14_approved_offers_ready_for_planning LIMIT 0;
SELECT validation_plan_id,review_resolution_id,state FROM a14_validation_plans LIMIT 0;
SELECT experiment_version_id FROM a14_validation_plan_a8_links LIMIT 0;
"

echo "Verifying Maison Growth D1 schema on: $DB_NAME"
npx wrangler d1 execute "$DB_NAME" --remote --command "$SQL"

b2b_seed_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command "SELECT COUNT(*) AS n FROM solutions WHERE solution_key='maison-b2b' AND solution_id='sol_0199a4b2-7f00-7000-8000-000000000001';")"
b2b_seed_count="$(printf '%s' "$b2b_seed_json" | jq -r '.[0].results[0].n')"
if [[ "$b2b_seed_count" != "1" ]]; then
  echo "Canonical Maison B2B solution seed is missing or duplicated." >&2
  exit 3
fi

a11_schema_json="$(npx wrangler d1 execute "$DB_NAME" --remote --json --command "SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a11_schema_version';")"
a11_schema_version="$(printf '%s' "$a11_schema_json" | jq -r '.[0].results[0].schema_value // empty')"
if [[ "$a11_schema_version" != "A11.2" ]]; then
  echo "A11.2 content learning schema is not active." >&2
  exit 4
fi
echo "Maison Growth D1 schema through Brain/A12/A14 planning/B2B feedback surfaces: OK"
