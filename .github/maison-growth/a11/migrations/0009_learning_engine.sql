-- Maison Growth Engine · A11 Learning Engine
-- D1 / SQLite-compatible migration 0009
-- Depends on A1.1 + A3.1 + A7.1 + A8.1 + A10.1.
PRAGMA foreign_keys = ON;

CREATE TABLE learning_runs (
    learning_run_id TEXT PRIMARY KEY CHECK (length(learning_run_id)=40 AND substr(learning_run_id,1,4)='lru_'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    policy_version TEXT NOT NULL,
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    input_count INTEGER NOT NULL CHECK (input_count>=0),
    runtime_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (runtime_side_effects=0),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects=0),
    UNIQUE(rule_version_id,model_version_id,policy_version,input_hash)
);

CREATE TABLE learning_source_links (
    learning_source_link_id TEXT PRIMARY KEY CHECK (length(learning_source_link_id)=40 AND substr(learning_source_link_id,1,4)='lsl_'),
    learning_run_id TEXT NOT NULL REFERENCES learning_runs(learning_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('decision','experiment','journey','conversion','promotion')),
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
    ),
    UNIQUE(learning_run_id,source_kind,source_id,source_snapshot_hash)
);

CREATE TABLE learning_records (
    learning_record_id TEXT PRIMARY KEY CHECK (length(learning_record_id)=40 AND substr(learning_record_id,1,4)='lrn_'),
    learning_run_id TEXT NOT NULL REFERENCES learning_runs(learning_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    learning_source_link_id TEXT NOT NULL REFERENCES learning_source_links(learning_source_link_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('decision','experiment','journey','conversion','promotion')),
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
CREATE INDEX idx_learning_records_subject ON learning_records(subject_type,subject_id,created_at);
CREATE INDEX idx_learning_records_signal ON learning_records(signal_class,created_at);

CREATE TABLE learning_feedback (
    feedback_id TEXT PRIMARY KEY CHECK (length(feedback_id)=40 AND substr(feedback_id,1,4)='lfb_'),
    learning_record_id TEXT NOT NULL REFERENCES learning_records(learning_record_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    target_type TEXT NOT NULL CHECK (target_type IN ('need','intent','coverage','candidate','decision')),
    target_id TEXT NOT NULL CHECK (length(target_id)=40),
    action TEXT NOT NULL CHECK (action IN ('increase_confidence','decrease_confidence','hold_confidence','observe','review')),
    confidence_delta INTEGER NOT NULL CHECK (confidence_delta BETWEEN -100 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    execution_mode TEXT NOT NULL DEFAULT 'append_only_internal' CHECK (execution_mode='append_only_internal'),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects=0),
    created_at TEXT NOT NULL
);

CREATE TABLE learning_patterns (
    pattern_id TEXT PRIMARY KEY CHECK (length(pattern_id)=40 AND substr(pattern_id,1,4)='lpt_'),
    pattern_key TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('positive','negative','neutral')),
    occurrence_count INTEGER NOT NULL CHECK (occurrence_count>=3),
    learning_record_ids_json TEXT NOT NULL CHECK (json_valid(learning_record_ids_json)),
    reason_code TEXT NOT NULL CHECK (reason_code='REPEATED_CORRELATED_PATTERN'),
    correlation_only INTEGER NOT NULL DEFAULT 1 CHECK (correlation_only=1),
    causal_claim INTEGER NOT NULL DEFAULT 0 CHECK (causal_claim=0),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL
);

CREATE TABLE learning_sensitive_proposals (
    proposal_id TEXT PRIMARY KEY CHECK (length(proposal_id)=40 AND substr(proposal_id,1,4)='lpr_'),
    protected_domain TEXT NOT NULL CHECK (protected_domain IN (
      'hard_gates','permissions','security_policy','pricing','discounts','checkout','catalogue',
      'paid_content','legal_policy','commercial_promises','protected_architecture','public_authorization'
    )),
    recommendation TEXT NOT NULL CHECK (length(trim(recommendation)) BETWEEN 1 AND 2000),
    reason_code TEXT NOT NULL CHECK (reason_code='SENSITIVE_RULE_CHANGE_REQUIRES_HUMAN'),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    status TEXT NOT NULL DEFAULT 'human_review_required' CHECK (status IN ('human_review_required','rejected','archived','approved_for_future_manual_change')),
    execution_authorized INTEGER NOT NULL DEFAULT 0 CHECK (execution_authorized=0),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects=0),
    created_at TEXT NOT NULL
);

INSERT INTO schema_state(schema_key,schema_value) VALUES ('maison_growth_a11_schema_version','A11.1');

CREATE TRIGGER trg_learning_runs_no_update BEFORE UPDATE ON learning_runs BEGIN SELECT RAISE(ABORT,'learning runs are immutable'); END;
CREATE TRIGGER trg_learning_runs_no_delete BEFORE DELETE ON learning_runs BEGIN SELECT RAISE(ABORT,'learning runs are immutable'); END;
CREATE TRIGGER trg_learning_source_links_no_update BEFORE UPDATE ON learning_source_links BEGIN SELECT RAISE(ABORT,'learning source links are immutable'); END;
CREATE TRIGGER trg_learning_source_links_no_delete BEFORE DELETE ON learning_source_links BEGIN SELECT RAISE(ABORT,'learning source links are immutable'); END;
CREATE TRIGGER trg_learning_records_no_update BEFORE UPDATE ON learning_records BEGIN SELECT RAISE(ABORT,'learning records are immutable'); END;
CREATE TRIGGER trg_learning_records_no_delete BEFORE DELETE ON learning_records BEGIN SELECT RAISE(ABORT,'learning records are immutable'); END;
CREATE TRIGGER trg_learning_feedback_no_update BEFORE UPDATE ON learning_feedback BEGIN SELECT RAISE(ABORT,'learning feedback is append-only'); END;
CREATE TRIGGER trg_learning_feedback_no_delete BEFORE DELETE ON learning_feedback BEGIN SELECT RAISE(ABORT,'learning feedback is append-only'); END;
CREATE TRIGGER trg_learning_patterns_no_update BEFORE UPDATE ON learning_patterns BEGIN SELECT RAISE(ABORT,'learning patterns are immutable'); END;
CREATE TRIGGER trg_learning_patterns_no_delete BEFORE DELETE ON learning_patterns BEGIN SELECT RAISE(ABORT,'learning patterns are immutable'); END;
CREATE TRIGGER trg_learning_sensitive_proposals_no_update BEFORE UPDATE ON learning_sensitive_proposals BEGIN SELECT RAISE(ABORT,'sensitive proposals are immutable recommendations'); END;
CREATE TRIGGER trg_learning_sensitive_proposals_no_delete BEFORE DELETE ON learning_sensitive_proposals BEGIN SELECT RAISE(ABORT,'sensitive proposals are immutable recommendations'); END;
