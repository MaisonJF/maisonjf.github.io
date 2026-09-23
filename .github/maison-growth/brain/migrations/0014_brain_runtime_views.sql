-- Maison Brain runtime views · migration 0014
-- D1 / SQLite compatible. Depends on A4 + A13 + A14.2.
-- Views only: no autonomous execution, no new source of truth.

PRAGMA foreign_keys = ON;

CREATE VIEW brain_prebrain_feed AS
SELECT
  o.observation_id,
  o.event_id,
  o.territory_key,
  o.provider_id,
  o.model_id,
  o.source_class,
  o.grounding_state,
  o.response_excerpt,
  o.observed_at,
  e.evidence_id,
  e.strength,
  e.confidence_class,
  CASE
    WHEN e.strength IS NULL THEN 0.0
    ELSE CAST(e.strength AS REAL)/100.0
  END AS confidence,
  COALESCE(
    (SELECT json_group_array(root_url)
     FROM external_intelligence_observation_roots r
     WHERE r.observation_id=o.observation_id),
    '[]'
  ) AS independent_roots_json,
  COALESCE(
    CASE WHEN e.evidence_id IS NULL THEN '[]' ELSE json_array(e.evidence_id) END,
    '[]'
  ) AS evidence_refs_json
FROM external_intelligence_observations o
LEFT JOIN map_evidence e
  ON e.source_event_id=o.event_id;

CREATE VIEW brain_cash_feedback AS
SELECT
  c.conversion_id,
  e.economic_assessment_id,
  e.economics_version_id,
  c.solution_id,
  c.conversion_kind,
  c.occurred_at,
  e.created_at AS assessment_created_at,
  e.revenue_minor,
  c.currency,
  e.variable_cost_minor,
  e.human_effort_minutes,
  e.human_effort_cost_minor,
  e.immediate_contribution_minor,
  e.continuation_expected_value_minor,
  e.expected_total_value_minor,
  e.scalability_score,
  e.repeatability_class,
  e.confidence_class,
  e.calculation_version,
  COALESCE((
    SELECT json_group_array(DISTINCT l.opportunity_id)
    FROM a14_outcome_links l
    WHERE l.conversion_id=c.conversion_id
      AND (l.economic_assessment_id IS NULL OR l.economic_assessment_id=e.economic_assessment_id)
  ),'[]') AS opportunity_ids_json,
  COALESCE((
    SELECT json_group_array(DISTINCT l.offer_hypothesis_id)
    FROM a14_outcome_links l
    WHERE l.conversion_id=c.conversion_id
      AND l.offer_hypothesis_id IS NOT NULL
      AND (l.economic_assessment_id IS NULL OR l.economic_assessment_id=e.economic_assessment_id)
  ),'[]') AS offer_hypothesis_ids_json,
  COALESCE((
    SELECT json_group_array(DISTINCT l.distribution_match_id)
    FROM a14_outcome_links l
    WHERE l.conversion_id=c.conversion_id
      AND l.distribution_match_id IS NOT NULL
      AND (l.economic_assessment_id IS NULL OR l.economic_assessment_id=e.economic_assessment_id)
  ),'[]') AS distribution_match_ids_json
FROM conversion_economic_assessments e
JOIN conversions c ON c.conversion_id=e.conversion_id;

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_brain_runtime_schema_version','BRAIN.1')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='BRAIN.1';
