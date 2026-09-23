-- Maison Growth Engine · A12.2 Human commercial review resolution
-- D1 / SQLite-compatible migration 0015.
-- Approval authorizes experiment planning only. It never authorizes execution/public writes/outbound/spend.
PRAGMA foreign_keys = ON;

CREATE TABLE autonomy_human_review_resolutions (
  review_resolution_id TEXT PRIMARY KEY
    CHECK(length(review_resolution_id)=40 AND substr(review_resolution_id,1,4)='rvr_'),
  queue_id TEXT NOT NULL UNIQUE
    REFERENCES autonomy_human_queue(queue_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  action_id TEXT NOT NULL
    REFERENCES autonomy_action_log(action_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),
  approved_scope TEXT NOT NULL CHECK(approved_scope='experiment_planning_only'),
  decision_reason TEXT NOT NULL CHECK(length(trim(decision_reason)) BETWEEN 3 AND 2000),
  evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence_refs_json)),
  actor_kind TEXT NOT NULL CHECK(actor_kind='human'),
  public_write_authorized INTEGER NOT NULL DEFAULT 0 CHECK(public_write_authorized=0),
  outbound_authorized INTEGER NOT NULL DEFAULT 0 CHECK(outbound_authorized=0),
  spend_authorized INTEGER NOT NULL DEFAULT 0 CHECK(spend_authorized=0),
  experiment_execution_authorized INTEGER NOT NULL DEFAULT 0 CHECK(experiment_execution_authorized=0),
  decided_at TEXT NOT NULL,
  UNIQUE(queue_id,action_id)
);

CREATE VIEW autonomy_human_queue_current AS
SELECT
  q.queue_id,
  q.action_id,
  q.priority,
  q.status AS original_status,
  CASE
    WHEN r.decision IS NOT NULL THEN r.decision
    ELSE q.status
  END AS effective_status,
  q.reason_codes_json,
  q.created_at,
  r.review_resolution_id,
  r.approved_scope,
  r.decision_reason,
  r.evidence_refs_json AS resolution_evidence_refs_json,
  r.decided_at,
  COALESCE(r.public_write_authorized,0) AS public_write_authorized,
  COALESCE(r.outbound_authorized,0) AS outbound_authorized,
  COALESCE(r.spend_authorized,0) AS spend_authorized,
  COALESCE(r.experiment_execution_authorized,0) AS experiment_execution_authorized
FROM autonomy_human_queue q
LEFT JOIN autonomy_human_review_resolutions r ON r.queue_id=q.queue_id;

CREATE TRIGGER trg_a12_review_resolution_no_update
BEFORE UPDATE ON autonomy_human_review_resolutions
BEGIN
  SELECT RAISE(ABORT,'A12 human review resolutions are immutable');
END;

CREATE TRIGGER trg_a12_review_resolution_no_delete
BEFORE DELETE ON autonomy_human_review_resolutions
BEGIN
  SELECT RAISE(ABORT,'A12 human review resolutions are immutable');
END;

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_growth_a12_schema_version','A12.2')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='A12.2';
