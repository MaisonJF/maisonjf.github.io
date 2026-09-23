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
  opportunity_id,
  offer_hypothesis_id,
  distribution_match_id,
  conversion_id,
  economic_assessment_id,
  attribution_role,
  solution_id,
  occurred_at,
  revenue_minor,
  currency,
  variable_cost_minor,
  human_effort_cost_minor,
  immediate_contribution_minor,
  repeatability_class,
  confidence_class
FROM a14_realised_economics;

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_brain_runtime_schema_version','BRAIN.1')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='BRAIN.1';
