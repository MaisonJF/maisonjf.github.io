#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth-engine}"

SQL="
SELECT '0001_data_foundation' AS migration,
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('events','schema_state')) = 2
            THEN 'present' ELSE 'missing_or_partial' END AS status
UNION ALL
SELECT '0002_journeys_economics',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('solutions','conversion_economic_assessments')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0003_living_map_radar',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('needs','radar_signals')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0004_brain',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('brain_runs','internal_candidates')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0005_decisor_commercial_discovery',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('decision_runs','commercial_candidates')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0006_experiment_manager',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('experiments','experiment_rollbacks')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0007_publisher_gateway',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('publisher_identities','publish_path_claims')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0008_ocean_promotion',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('ocean_promotion_runs','ocean_publisher_links')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0009_learning_engine',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('learning_runs','learning_sensitive_proposals')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0010_gradual_autonomy_dashboard_v2',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('autonomy_job_definitions','autonomy_human_queue')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0011_external_intelligence_runtime',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('external_intelligence_control','external_intelligence_brain_feed')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0012_universal_opportunity_earned_distribution',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('opportunity_hypotheses','distribution_value_observations')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0013_a14_bridges_cash',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('a14_governance_links','a14_realised_economics')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0014_brain_runtime_views',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('brain_prebrain_feed','brain_cash_feedback')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0015_human_commercial_review_resolution',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('autonomy_human_review_resolutions','autonomy_human_queue_current')) = 2
            THEN 'present' ELSE 'missing_or_partial' END
UNION ALL
SELECT '0016_approved_validation_planning',
       CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE name IN ('a14_validation_plans','a14_validation_plan_a8_links','a14_approved_offers_ready_for_planning')) = 3
            THEN 'present' ELSE 'missing_or_partial' END;
"

echo "Inspecting Maison Growth D1 migration sentinels on: $DB_NAME"
npx wrangler d1 execute "$DB_NAME" --remote --command "$SQL"
echo "Inspection complete. This command is read-only; it does not apply migrations."
