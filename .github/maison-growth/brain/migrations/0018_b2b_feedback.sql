-- Brain · B2B lifecycle feedback projection
-- Read-only projection over canonical A1/A3 data. No CRM, no parallel event store.

PRAGMA foreign_keys = ON;

CREATE VIEW brain_b2b_feedback AS
SELECT
  c.conversion_id,
  c.source_event_id,
  e.event_type,
  c.conversion_kind,
  c.journey_id,
  c.solution_id,
  c.occurred_at,
  c.revenue_minor,
  c.currency,
  e.privacy_class,
  CASE e.event_type
    WHEN 'b2b.lead' THEN 'lead'
    WHEN 'b2b.proposal' THEN 'proposal'
    WHEN 'b2b.pilot' THEN 'pilot'
    WHEN 'b2b.purchase' THEN 'purchase'
    WHEN 'b2b.recurrence' THEN 'recurrence'
    WHEN 'b2b.order' THEN 'order'
    ELSE 'unknown'
  END AS lifecycle_stage,
  json_extract(e.metadata_json,'$.interest') AS interest,
  json_extract(e.metadata_json,'$.origin') AS origin,
  json_extract(e.metadata_json,'$.business') AS business,
  json_extract(e.metadata_json,'$.goal') AS goal,
  json_extract(e.metadata_json,'$.gap') AS gap,
  json_extract(e.metadata_json,'$.client') AS client,
  json_extract(e.metadata_json,'$.model') AS model,
  json_extract(e.metadata_json,'$.scale') AS scale,
  json_extract(e.metadata_json,'$.start') AS start,
  json_extract(e.metadata_json,'$.result_type') AS result_type,
  json_extract(e.metadata_json,'$.b2b_stage') AS b2b_stage,
  json_extract(e.metadata_json,'$.offer_family') AS offer_family,
  json_extract(e.metadata_json,'$.recurrence_type') AS recurrence_type
FROM conversions c
JOIN events e ON e.event_id=c.source_event_id
WHERE e.event_type IN (
  'b2b.lead','b2b.proposal','b2b.pilot','b2b.purchase','b2b.recurrence','b2b.order'
);

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_brain_b2b_feedback_schema_version','BRAIN.B2B.1')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='BRAIN.B2B.1';
