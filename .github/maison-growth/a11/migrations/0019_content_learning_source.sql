-- Maison Growth Engine · A11.2 Content Learning Source
-- Additive compatibility migration for existing A11.1 databases.
-- Rebuilds only the two source-kind constrained tables; preserves rows, indexes and immutability triggers.

PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

DROP TRIGGER IF EXISTS trg_learning_source_links_no_update;
DROP TRIGGER IF EXISTS trg_learning_source_links_no_delete;
DROP TRIGGER IF EXISTS trg_learning_records_no_update;
DROP TRIGGER IF EXISTS trg_learning_records_no_delete;
DROP INDEX IF EXISTS idx_learning_records_subject;
DROP INDEX IF EXISTS idx_learning_records_signal;

CREATE TABLE learning_source_links_v2 (
    learning_source_link_id TEXT PRIMARY KEY CHECK (length(learning_source_link_id)=40 AND substr(learning_source_link_id,1,4)='lsl_'),
    learning_run_id TEXT NOT NULL REFERENCES learning_runs(learning_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('decision','experiment','journey','conversion','promotion','content')),
    source_id TEXT NOT NULL CHECK (length(source_id)=40),
    decision_id TEXT NULL REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    experiment_result_id TEXT NULL REFERENCES experiment_results(experiment_result_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    journey_snapshot_id TEXT NULL REFERENCES journey_snapshots(journey_snapshot_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    conversion_id TEXT NULL REFERENCES conversions(conversion_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    economic_assessment_id TEXT NULL REFERENCES conversion_economic_assessments(economic_assessment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    promotion_run_id TEXT NULL REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_snapshot_hash TEXT NOT NULL CHECK (length(source_snapshot_hash)=64 AND source_snapshot_hash NOT GLOB '*[^0-9a-f]*'),
    observed_at TEXT NOT NULL,
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    CHECK (
      (source_kind='decision' AND decision_id=source_id AND experiment_result_id IS NULL AND journey_snapshot_id IS NULL AND conversion_id IS NULL AND promotion_run_id IS NULL)
      OR (source_kind='experiment' AND experiment_result_id=source_id AND decision_id IS NULL AND journey_snapshot_id IS NULL AND conversion_id IS NULL AND promotion_run_id IS NULL)
      OR (source_kind='journey' AND journey_snapshot_id=source_id AND decision_id IS NULL AND experiment_result_id IS NULL AND conversion_id IS NULL AND promotion_run_id IS NULL)
      OR (source_kind='conversion' AND conversion_id=source_id AND decision_id IS NULL AND experiment_result_id IS NULL AND journey_snapshot_id IS NULL AND promotion_run_id IS NULL)
      OR (source_kind='promotion' AND promotion_run_id=source_id AND decision_id IS NULL AND experiment_result_id IS NULL AND journey_snapshot_id IS NULL AND conversion_id IS NULL)
      OR (source_kind='content' AND decision_id IS NULL AND experiment_result_id IS NULL AND journey_snapshot_id IS NULL AND conversion_id IS NULL AND promotion_run_id IS NULL)
    ),
    UNIQUE(learning_run_id,source_kind,source_id,source_snapshot_hash)
);

INSERT INTO learning_source_links_v2 (
    learning_source_link_id,learning_run_id,source_kind,source_id,decision_id,
    experiment_result_id,journey_snapshot_id,conversion_id,economic_assessment_id,
    promotion_run_id,source_snapshot_hash,observed_at,evidence_refs_json
)
SELECT
    learning_source_link_id,learning_run_id,source_kind,source_id,decision_id,
    experiment_result_id,journey_snapshot_id,conversion_id,economic_assessment_id,
    promotion_run_id,source_snapshot_hash,observed_at,evidence_refs_json
FROM learning_source_links;

CREATE TABLE learning_records_v2 (
    learning_record_id TEXT PRIMARY KEY CHECK (length(learning_record_id)=40 AND substr(learning_record_id,1,4)='lrn_'),
    learning_run_id TEXT NOT NULL REFERENCES learning_runs(learning_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    learning_source_link_id TEXT NOT NULL REFERENCES learning_source_links_v2(learning_source_link_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('decision','experiment','journey','conversion','promotion','content')),
    source_id TEXT NOT NULL CHECK (length(source_id)=40),
    subject_type TEXT NOT NULL CHECK (subject_type IN ('need','intent','coverage','candidate','decision')),
    subject_id TEXT NOT NULL CHECK (length(subject_id)=40),
    signal_class TEXT NOT NULL CHECK (signal_class IN ('positive','negative','neutral','insufficient')),
    expected_json TEXT NOT NULL CHECK (json_valid(expected_json)),
    observed_json TEXT NOT NULL CHECK (json_valid(observed_json)),
    economic_value_minor INTEGER NULL,
    ctr_bps INTEGER NULL CHECK (ctr_bps IS NULL OR ctr_bps BETWEEN 0 AND 10000),
    confidence_before INTEGER NOT NULL CHECK (confidence_before BETWEEN 0 AND 100),
    confidence_after INTEGER NOT NULL CHECK (confidence_after BETWEEN 0 AND 100),
    confidence_delta INTEGER NOT NULL CHECK (confidence_delta BETWEEN -100 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    correlation_only INTEGER NOT NULL DEFAULT 1 CHECK (correlation_only=1),
    causal_claim INTEGER NOT NULL DEFAULT 0 CHECK (causal_claim=0),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    UNIQUE(learning_run_id,source_kind,source_id,subject_type,subject_id,input_hash)
);

INSERT INTO learning_records_v2 (
    learning_record_id,learning_run_id,learning_source_link_id,source_kind,source_id,
    subject_type,subject_id,signal_class,expected_json,observed_json,economic_value_minor,
    ctr_bps,confidence_before,confidence_after,confidence_delta,reason_codes_json,
    evidence_refs_json,correlation_only,causal_claim,rule_version_id,model_version_id,
    input_hash,created_at
)
SELECT
    learning_record_id,learning_run_id,learning_source_link_id,source_kind,source_id,
    subject_type,subject_id,signal_class,expected_json,observed_json,economic_value_minor,
    ctr_bps,confidence_before,confidence_after,confidence_delta,reason_codes_json,
    evidence_refs_json,correlation_only,causal_claim,rule_version_id,model_version_id,
    input_hash,created_at
FROM learning_records;

DROP TABLE learning_records;
DROP TABLE learning_source_links;

ALTER TABLE learning_source_links_v2 RENAME TO learning_source_links;
ALTER TABLE learning_records_v2 RENAME TO learning_records;

CREATE INDEX idx_learning_records_subject ON learning_records(subject_type,subject_id,created_at);
CREATE INDEX idx_learning_records_signal ON learning_records(signal_class,created_at);

CREATE TRIGGER trg_learning_source_links_no_update BEFORE UPDATE ON learning_source_links BEGIN SELECT RAISE(ABORT,'learning source links are immutable'); END;
CREATE TRIGGER trg_learning_source_links_no_delete BEFORE DELETE ON learning_source_links BEGIN SELECT RAISE(ABORT,'learning source links are immutable'); END;
CREATE TRIGGER trg_learning_records_no_update BEFORE UPDATE ON learning_records BEGIN SELECT RAISE(ABORT,'learning records are immutable'); END;
CREATE TRIGGER trg_learning_records_no_delete BEFORE DELETE ON learning_records BEGIN SELECT RAISE(ABORT,'learning records are immutable'); END;

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_growth_a11_schema_version','A11.2')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='A11.2';

COMMIT;
PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;
