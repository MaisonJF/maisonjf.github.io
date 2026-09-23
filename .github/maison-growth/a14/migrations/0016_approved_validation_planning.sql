-- Maison Growth Engine · A14.3 approved-opportunity validation planning
-- D1 / SQLite-compatible migration 0016.
-- Converts an approved A12 commercial review into an append-only validation plan.
-- It does NOT execute A8, publish, contact anyone, spend, or change price/catalogue.

PRAGMA foreign_keys = ON;

CREATE TABLE a14_validation_plans (
  validation_plan_id TEXT PRIMARY KEY
    CHECK(length(validation_plan_id)=40 AND substr(validation_plan_id,1,4)='vpl_'),
  review_resolution_id TEXT NOT NULL UNIQUE
    REFERENCES autonomy_human_review_resolutions(review_resolution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  opportunity_id TEXT NOT NULL
    REFERENCES opportunity_hypotheses(opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  offer_hypothesis_id TEXT NOT NULL
    REFERENCES opportunity_offer_hypotheses(offer_hypothesis_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  plan_kind TEXT NOT NULL CHECK(plan_kind IN ('a8_cta_existing_solution','manual_b2b_pilot','manual_service_pilot','manual_physical_pilot','manual_distribution_pilot','manual_validation')),
  existing_solution_id TEXT NULL
    REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  a7_decision_id TEXT NULL
    REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  a8_experiment_id TEXT NULL
    REFERENCES experiments(experiment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  hypothesis TEXT NOT NULL CHECK(length(trim(hypothesis)) BETWEEN 10 AND 1000),
  validation_mode TEXT NULL,
  primary_metric_key TEXT NULL,
  evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence_refs_json)),
  reason_codes_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(reason_codes_json)),
  state TEXT NOT NULL CHECK(state IN ('planning','blocked_needs_a7_decision','ready_for_a8_draft','manual_pilot_required','rejected')),
  public_write_authorized INTEGER NOT NULL DEFAULT 0 CHECK(public_write_authorized=0),
  outbound_authorized INTEGER NOT NULL DEFAULT 0 CHECK(outbound_authorized=0),
  spend_authorized INTEGER NOT NULL DEFAULT 0 CHECK(spend_authorized=0),
  experiment_execution_authorized INTEGER NOT NULL DEFAULT 0 CHECK(experiment_execution_authorized=0),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_a14_validation_plan_state ON a14_validation_plans(state,created_at);
CREATE INDEX idx_a14_validation_plan_offer ON a14_validation_plans(offer_hypothesis_id,created_at);

CREATE TABLE a14_validation_plan_a7_links (
  validation_plan_id TEXT NOT NULL
    REFERENCES a14_validation_plans(validation_plan_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  decision_id TEXT NOT NULL
    REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence_refs_json)),
  linked_at TEXT NOT NULL,
  PRIMARY KEY(validation_plan_id,decision_id)
) WITHOUT ROWID;

CREATE VIEW a14_approved_offers_ready_for_planning AS
SELECT
  r.review_resolution_id,
  r.queue_id,
  r.action_id,
  g.opportunity_id,
  json_extract(a.result_json,'$.offer_hypothesis_id') AS offer_hypothesis_id,
  o.territory_code,
  o.opportunity_score,
  o.confidence AS opportunity_confidence,
  h.offer_type,
  h.a3_solution_type,
  h.existing_solution_id,
  h.fit_score,
  h.fit_confidence,
  h.validation_mode,
  h.economics_json,
  h.evidence_refs_json,
  h.reason_codes_json,
  r.decided_at
FROM autonomy_human_review_resolutions r
JOIN autonomy_action_log a ON a.action_id=r.action_id
JOIN a14_governance_links g ON g.action_id=r.action_id
JOIN opportunity_hypotheses o ON o.opportunity_id=g.opportunity_id
JOIN opportunity_offer_hypotheses h
  ON h.offer_hypothesis_id=json_extract(a.result_json,'$.offer_hypothesis_id')
LEFT JOIN a14_validation_plans p ON p.review_resolution_id=r.review_resolution_id
WHERE r.decision='approved'
  AND r.approved_scope='experiment_planning_only'
  AND r.public_write_authorized=0
  AND r.outbound_authorized=0
  AND r.spend_authorized=0
  AND r.experiment_execution_authorized=0
  AND p.validation_plan_id IS NULL;

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_growth_a14_schema_version','A14.3')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='A14.3';

CREATE TRIGGER trg_a14_validation_plan_no_update
BEFORE UPDATE ON a14_validation_plans
BEGIN SELECT RAISE(ABORT,'A14 validation plans are immutable; append a new plan'); END;

CREATE TRIGGER trg_a14_validation_plan_no_delete
BEFORE DELETE ON a14_validation_plans
BEGIN SELECT RAISE(ABORT,'A14 validation plans are immutable'); END;

CREATE TRIGGER trg_a14_validation_a7_link_no_update
BEFORE UPDATE ON a14_validation_plan_a7_links
BEGIN SELECT RAISE(ABORT,'A14 validation A7 links are append-only'); END;

CREATE TRIGGER trg_a14_validation_a7_link_no_delete
BEFORE DELETE ON a14_validation_plan_a7_links
BEGIN SELECT RAISE(ABORT,'A14 validation A7 links are append-only'); END;
