-- Maison Growth Engine · A7 Decisor + Commercial Discovery
-- D1 / SQLite-compatible migration 0005
-- Depends on A1.1 + A3.1 + A4.1 + A5.1. Never required by the public Maison site.
PRAGMA foreign_keys = ON;

CREATE TABLE decision_runs (
    decision_run_id TEXT PRIMARY KEY CHECK (length(decision_run_id)=40 AND substr(decision_run_id,1,4)='drn_'),
    run_kind TEXT NOT NULL CHECK (run_kind IN ('decision','commercial_discovery','mixed')),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    policy_version TEXT NOT NULL CHECK (length(trim(policy_version)) BETWEEN 1 AND 120),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    input_count INTEGER NOT NULL CHECK (input_count >= 0),
    notes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(notes_json)),
    UNIQUE(run_kind,rule_version_id,model_version_id,policy_version,input_hash)
);

CREATE TABLE decision_gate_results (
    decision_run_id TEXT NOT NULL REFERENCES decision_runs(decision_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('need','intent','cluster','candidate','gap','solution','journey')),
    subject_id TEXT NOT NULL CHECK (length(subject_id)=40),
    gate_name TEXT NOT NULL CHECK (length(trim(gate_name)) BETWEEN 1 AND 120),
    gate_ordinal INTEGER NOT NULL CHECK (gate_ordinal >= 1),
    passed INTEGER NOT NULL CHECK (passed IN (0,1)),
    reason_code TEXT NOT NULL CHECK (length(trim(reason_code)) BETWEEN 1 AND 160),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    evaluated_at TEXT NOT NULL,
    PRIMARY KEY(decision_run_id,subject_type,subject_id,gate_name),
    UNIQUE(decision_run_id,subject_type,subject_id,gate_ordinal)
) WITHOUT ROWID;

CREATE TABLE decision_records (
    decision_id TEXT PRIMARY KEY CHECK (length(decision_id)=40 AND substr(decision_id,1,4)='dec_'),
    decision_run_id TEXT NOT NULL REFERENCES decision_runs(decision_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('need','intent','cluster','candidate','gap','solution','journey')),
    subject_id TEXT NOT NULL CHECK (length(subject_id)=40),
    decision_type TEXT NOT NULL CHECK (decision_type IN ('observe','alias','reinforce','interlink','test_cta','create_internal_candidate','propose_promotion','recommend_solution','commercial_gap','reject')),
    hard_gates_passed INTEGER NOT NULL CHECK (hard_gates_passed IN (0,1)),
    discovery_score INTEGER NULL CHECK (discovery_score IS NULL OR discovery_score BETWEEN 0 AND 100),
    commercial_score INTEGER NULL CHECK (commercial_score IS NULL OR commercial_score BETWEEN 0 AND 100),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    recommended_solution_id TEXT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    human_review_required INTEGER NOT NULL DEFAULT 0 CHECK (human_review_required IN (0,1)),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects = 0),
    evaluation_order_json TEXT NOT NULL CHECK (json_valid(evaluation_order_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(decision_run_id,subject_type,subject_id,input_hash),
    CHECK (decision_type <> 'propose_promotion' OR hard_gates_passed = 1)
);
CREATE INDEX idx_decisions_subject ON decision_records(subject_type,subject_id,created_at);
CREATE INDEX idx_decisions_type ON decision_records(decision_type,created_at);

CREATE TABLE decision_alternatives (
    decision_id TEXT NOT NULL REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    alternative_ordinal INTEGER NOT NULL CHECK (alternative_ordinal >= 1),
    alternative_decision TEXT NOT NULL CHECK (alternative_decision IN ('observe','alias','reinforce','interlink','test_cta','create_internal_candidate','propose_promotion','recommend_solution','commercial_gap','reject')),
    rejected_reason_codes_json TEXT NOT NULL CHECK (json_valid(rejected_reason_codes_json)),
    PRIMARY KEY(decision_id,alternative_ordinal)
) WITHOUT ROWID;

CREATE TABLE commercial_gap_assessments (
    commercial_gap_id TEXT PRIMARY KEY CHECK (length(commercial_gap_id)=40 AND substr(commercial_gap_id,1,4)='cgp_'),
    decision_run_id TEXT NOT NULL REFERENCES decision_runs(decision_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    need_id TEXT NOT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    gap_type TEXT NOT NULL CHECK (gap_type IN ('content','journey','product','positioning')),
    status TEXT NOT NULL CHECK (status IN ('observe','detected','resolved_by_existing_solution')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    existing_solution_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(existing_solution_ids_json)),
    recommended_solution_id TEXT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(decision_run_id,need_id,intent_id,gap_type,input_hash)
);

CREATE TABLE commercial_candidates (
    commercial_candidate_id TEXT PRIMARY KEY CHECK (length(commercial_candidate_id)=40 AND substr(commercial_candidate_id,1,4)='ccn_'),
    decision_run_id TEXT NOT NULL REFERENCES decision_runs(decision_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    commercial_gap_id TEXT NOT NULL REFERENCES commercial_gap_assessments(commercial_gap_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    working_name TEXT NOT NULL CHECK (length(trim(working_name)) BETWEEN 1 AND 240),
    candidate_type TEXT NOT NULL CHECK (candidate_type IN ('digital_product','ebook','physical_product','service','accompaniment','subscription','experience','oracle_usage','b2b','uncategorized')),
    primary_need_id TEXT NOT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(intent_ids_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    existing_solution_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(existing_solution_ids_json)),
    commercial_score INTEGER NOT NULL CHECK (commercial_score BETWEEN 0 AND 100),
    economy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(economy_json)),
    complexity_class TEXT NOT NULL CHECK (complexity_class IN ('low','medium','high','unknown')),
    human_effort_class TEXT NOT NULL CHECK (human_effort_class IN ('low','medium','high','unknown')),
    risk_class TEXT NOT NULL CHECK (risk_class IN ('low','medium','high','unknown')),
    differentiation_score INTEGER NOT NULL CHECK (differentiation_score BETWEEN 0 AND 100),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    status TEXT NOT NULL DEFAULT 'human_review_required' CHECK (status IN ('observe','human_review_required','rejected','archived')),
    human_decision_required INTEGER NOT NULL DEFAULT 1 CHECK (human_decision_required = 1),
    launch_authorized INTEGER NOT NULL DEFAULT 0 CHECK (launch_authorized = 0),
    price_authorized INTEGER NOT NULL DEFAULT 0 CHECK (price_authorized = 0),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects = 0),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(decision_run_id,commercial_gap_id,input_hash)
);

INSERT INTO schema_state(schema_key,schema_value) VALUES ('maison_growth_a7_schema_version','A7.1');

CREATE TRIGGER trg_decision_runs_no_update BEFORE UPDATE ON decision_runs BEGIN SELECT RAISE(ABORT,'decision runs are immutable'); END;
CREATE TRIGGER trg_decision_runs_no_delete BEFORE DELETE ON decision_runs BEGIN SELECT RAISE(ABORT,'decision runs are immutable'); END;
CREATE TRIGGER trg_decision_gates_no_update BEFORE UPDATE ON decision_gate_results BEGIN SELECT RAISE(ABORT,'decision gates are immutable'); END;
CREATE TRIGGER trg_decision_gates_no_delete BEFORE DELETE ON decision_gate_results BEGIN SELECT RAISE(ABORT,'decision gates are immutable'); END;
CREATE TRIGGER trg_decisions_no_update BEFORE UPDATE ON decision_records BEGIN SELECT RAISE(ABORT,'decisions are immutable; append a new decision'); END;
CREATE TRIGGER trg_decisions_no_delete BEFORE DELETE ON decision_records BEGIN SELECT RAISE(ABORT,'decisions are immutable'); END;
CREATE TRIGGER trg_decision_alternatives_no_update BEFORE UPDATE ON decision_alternatives BEGIN SELECT RAISE(ABORT,'decision alternatives are immutable'); END;
CREATE TRIGGER trg_decision_alternatives_no_delete BEFORE DELETE ON decision_alternatives BEGIN SELECT RAISE(ABORT,'decision alternatives are immutable'); END;
CREATE TRIGGER trg_commercial_gaps_no_update BEFORE UPDATE ON commercial_gap_assessments BEGIN SELECT RAISE(ABORT,'commercial gap assessments are immutable'); END;
CREATE TRIGGER trg_commercial_gaps_no_delete BEFORE DELETE ON commercial_gap_assessments BEGIN SELECT RAISE(ABORT,'commercial gap assessments are immutable'); END;
CREATE TRIGGER trg_commercial_candidates_no_update BEFORE UPDATE ON commercial_candidates BEGIN SELECT RAISE(ABORT,'commercial candidates are immutable proposals'); END;
CREATE TRIGGER trg_commercial_candidates_no_delete BEFORE DELETE ON commercial_candidates BEGIN SELECT RAISE(ABORT,'commercial candidates are immutable proposals'); END;
