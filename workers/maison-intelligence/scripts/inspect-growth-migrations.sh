#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth-engine}"

SQL=$(cat <<'SQL'
WITH expected(migration, name) AS (
  VALUES
    ('0001_data_foundation', 'events'),
    ('0001_data_foundation', 'schema_state'),
    ('0002_journeys_economics', 'solutions'),
    ('0002_journeys_economics', 'conversion_economic_assessments'),
    ('0003_living_map_radar', 'needs'),
    ('0003_living_map_radar', 'radar_signals'),
    ('0004_brain', 'brain_runs'),
    ('0004_brain', 'internal_candidates'),
    ('0005_decisor_commercial_discovery', 'decision_runs'),
    ('0005_decisor_commercial_discovery', 'commercial_candidates'),
    ('0006_experiment_manager', 'experiments'),
    ('0006_experiment_manager', 'experiment_rollbacks'),
    ('0007_publisher_gateway', 'publisher_identities'),
    ('0007_publisher_gateway', 'publish_path_claims'),
    ('0008_ocean_promotion', 'ocean_promotion_runs'),
    ('0008_ocean_promotion', 'ocean_publisher_links'),
    ('0009_learning_engine', 'learning_runs'),
    ('0009_learning_engine', 'learning_sensitive_proposals'),
    ('0010_gradual_autonomy_dashboard_v2', 'autonomy_job_definitions'),
    ('0010_gradual_autonomy_dashboard_v2', 'autonomy_human_queue'),
    ('0011_external_intelligence_runtime', 'external_intelligence_control'),
    ('0011_external_intelligence_runtime', 'external_intelligence_brain_feed'),
    ('0012_universal_opportunity_earned_distribution', 'opportunity_hypotheses'),
    ('0012_universal_opportunity_earned_distribution', 'distribution_value_observations'),
    ('0013_a14_bridges_cash', 'a14_governance_links'),
    ('0013_a14_bridges_cash', 'a14_realised_economics'),
    ('0014_brain_runtime_views', 'brain_prebrain_feed'),
    ('0014_brain_runtime_views', 'brain_cash_feedback'),
    ('0015_human_commercial_review_resolution', 'autonomy_human_review_resolutions'),
    ('0015_human_commercial_review_resolution', 'autonomy_human_queue_current'),
    ('0016_approved_validation_planning', 'a14_validation_plans'),
    ('0016_approved_validation_planning', 'a14_validation_plan_a8_links'),
    ('0016_approved_validation_planning', 'a14_approved_offers_ready_for_planning'),
    ('0018_b2b_feedback', 'brain_b2b_feedback')
)
SELECT
  e.migration,
  CASE
    WHEN COUNT(s.name) = COUNT(*) THEN 'present'
    ELSE 'missing_or_partial'
  END AS status
FROM expected AS e
LEFT JOIN sqlite_master AS s
  ON s.name = e.name
GROUP BY e.migration
ORDER BY e.migration;
SQL
)

echo "Inspecting Maison Growth D1 migration sentinels on: $DB_NAME"
npx wrangler d1 execute "$DB_NAME" --remote --command "$SQL"


echo
echo "Canonical B2B solution seed (0017):"
npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT '0017_b2b_canonical_solution' AS migration, CASE WHEN EXISTS(SELECT 1 FROM solutions WHERE solution_key='maison-b2b' AND solution_id='sol_0199a4b2-7f00-7000-8000-000000000001') THEN 'present' ELSE 'missing_or_partial' END AS status;"

echo
echo "Detailed state for the pending/runtime surfaces:"
OBJECT_SQL="
SELECT type,name
FROM sqlite_master
WHERE name IN (
  'opportunity_hypotheses',
  'opportunity_offer_hypotheses',
  'earned_distribution_match_assessments',
  'distribution_value_observations',
  'a14_governance_links',
  'a14_experiment_links',
  'a14_outcome_links',
  'a14_learning_links',
  'a14_realised_economics',
  'brain_prebrain_feed',
  'brain_cash_feedback',
  'brain_b2b_feedback',
  'autonomy_human_review_resolutions',
  'autonomy_human_queue_current',
  'a14_validation_plans',
  'a14_validation_plan_a7_links',
  'a14_validation_plan_a8_links',
  'a14_approved_offers_ready_for_planning'
)
ORDER BY type,name;
"
npx wrangler d1 execute "$DB_NAME" --remote --command "$OBJECT_SQL"

echo
echo "Relevant schema_state values:"
STATE_SQL="
SELECT schema_key,schema_value
FROM schema_state
WHERE schema_key IN (
  'maison_growth_a14_schema_version',
  'maison_brain_runtime_schema_version',
  'maison_growth_a12_schema_version',
  'maison_brain_b2b_feedback_schema_version'
)
ORDER BY schema_key;
"
npx wrangler d1 execute "$DB_NAME" --remote --command "$STATE_SQL"

echo "Inspection complete. This command is read-only; it does not apply migrations."
