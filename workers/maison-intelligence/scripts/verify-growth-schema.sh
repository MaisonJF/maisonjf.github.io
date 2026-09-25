#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth-engine}"

SQL="
SELECT 1 AS ok FROM external_intelligence_control LIMIT 0;
SELECT observation_id,event_id,territory_key,evidence_id FROM brain_prebrain_feed LIMIT 0;
SELECT economic_assessment_id,solution_id FROM brain_cash_feedback LIMIT 0;
SELECT queue_id,effective_status,review_resolution_id FROM autonomy_human_queue_current LIMIT 0;
SELECT opportunity_id,offer_hypothesis_id,review_resolution_id FROM a14_approved_offers_ready_for_planning LIMIT 0;
SELECT validation_plan_id,review_resolution_id,state FROM a14_validation_plans LIMIT 0;
SELECT experiment_version_id FROM a14_validation_plan_a8_links LIMIT 0;
SELECT solution_id,solution_type,status FROM solutions WHERE solution_key='b2b' LIMIT 1;
"

echo "Verifying Maison Growth D1 schema on: $DB_NAME"
npx wrangler d1 execute "$DB_NAME" --remote --command "$SQL"
echo "Maison Growth D1 schema through Brain/A12/A14 planning surfaces + B2B solution probe: OK"
