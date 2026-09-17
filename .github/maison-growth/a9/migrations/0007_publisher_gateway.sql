-- Maison Growth Engine · A9 Publisher Gateway
-- D1 / SQLite-compatible migration 0007
-- Depends on A1.1 + A5.1 + A7.1 + A8.1. Never required by the public Maison site.
-- A9 repository state is dry-run only; no production credential or public write authorization is stored here.
PRAGMA foreign_keys = ON;

CREATE TABLE publisher_identities (
    publisher_identity_id TEXT PRIMARY KEY CHECK (length(publisher_identity_id)=40 AND substr(publisher_identity_id,1,4)='pid_'),
    principal_key TEXT NOT NULL UNIQUE CHECK (principal_key='maison-growth-publisher'),
    credential_kind TEXT NOT NULL CHECK (credential_kind='not_provisioned'),
    production_write_enabled INTEGER NOT NULL DEFAULT 0 CHECK (production_write_enabled=0),
    secret_material_stored INTEGER NOT NULL DEFAULT 0 CHECK (secret_material_stored=0),
    created_at TEXT NOT NULL
);

CREATE TABLE publish_runs (
    publish_run_id TEXT PRIMARY KEY CHECK (length(publish_run_id)=40 AND substr(publish_run_id,1,4)='pub_'),
    action_type TEXT NOT NULL CHECK (action_type IN ('ocean_promotion','cta_experiment','rollback')),
    mode TEXT NOT NULL CHECK (mode='dry_run'),
    decision_id TEXT NOT NULL REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    candidate_id TEXT NULL CHECK (candidate_id IS NULL OR (length(candidate_id)=40 AND substr(candidate_id,1,4)='can_')),
    experiment_id TEXT NULL REFERENCES experiments(experiment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    rollback_of_publish_run_id TEXT NULL REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    baseline_commit_sha TEXT NOT NULL CHECK (length(baseline_commit_sha)=40 AND baseline_commit_sha NOT GLOB '*[^0-9a-f]*'),
    snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash)=64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'),
    branch_name TEXT NOT NULL UNIQUE CHECK (substr(branch_name,1,15)='growth/publish/'),
    diff_fingerprint TEXT NOT NULL CHECK (length(diff_fingerprint)=64 AND diff_fingerprint NOT GLOB '*[^0-9a-f]*'),
    status TEXT NOT NULL CHECK (status IN ('planned','validated','blocked','branch_prepared','awaiting_guard','ready_for_human_merge','completed','failed','reverted')),
    public_write_authorized INTEGER NOT NULL DEFAULT 0 CHECK (public_write_authorized=0),
    created_at TEXT NOT NULL,
    UNIQUE(action_type,decision_id,candidate_id,experiment_id,rollback_of_publish_run_id,baseline_commit_sha,snapshot_hash,diff_fingerprint),
    CHECK (action_type <> 'ocean_promotion' OR candidate_id IS NOT NULL),
    CHECK (action_type <> 'cta_experiment' OR experiment_id IS NOT NULL),
    CHECK (action_type <> 'rollback' OR rollback_of_publish_run_id IS NOT NULL)
);

CREATE TABLE publish_run_files (
    publish_run_id TEXT NOT NULL REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    path TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('create','update','delete')),
    before_hash TEXT NULL CHECK (before_hash IS NULL OR (length(before_hash)=64 AND before_hash NOT GLOB '*[^0-9a-f]*')),
    after_hash TEXT NULL CHECK (after_hash IS NULL OR (length(after_hash)=64 AND after_hash NOT GLOB '*[^0-9a-f]*')),
    allowlist_rule TEXT NOT NULL CHECK (length(trim(allowlist_rule)) BETWEEN 1 AND 240),
    PRIMARY KEY(publish_run_id,path)
) WITHOUT ROWID;

CREATE TABLE publish_validations (
    publish_run_id TEXT NOT NULL REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    validation_key TEXT NOT NULL CHECK (length(trim(validation_key)) BETWEEN 1 AND 120),
    passed INTEGER NOT NULL CHECK (passed IN (0,1)),
    detail_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(detail_json)),
    validated_at TEXT NOT NULL,
    PRIMARY KEY(publish_run_id,validation_key)
) WITHOUT ROWID;

CREATE TABLE publish_run_results (
    publish_result_id TEXT PRIMARY KEY CHECK (length(publish_result_id)=40 AND substr(publish_result_id,1,4)='prs_'),
    publish_run_id TEXT NOT NULL UNIQUE REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    outcome TEXT NOT NULL CHECK (outcome IN ('dry_run_validated','blocked','failed','completed','reverted')),
    before_commit_sha TEXT NOT NULL CHECK (length(before_commit_sha)=40 AND before_commit_sha NOT GLOB '*[^0-9a-f]*'),
    branch_head_commit_sha TEXT NULL CHECK (branch_head_commit_sha IS NULL OR (length(branch_head_commit_sha)=40 AND branch_head_commit_sha NOT GLOB '*[^0-9a-f]*')),
    merge_commit_sha TEXT NULL CHECK (merge_commit_sha IS NULL OR (length(merge_commit_sha)=40 AND merge_commit_sha NOT GLOB '*[^0-9a-f]*')),
    result_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(result_json)),
    completed_at TEXT NOT NULL,
    CHECK (outcome <> 'dry_run_validated' OR (branch_head_commit_sha IS NULL AND merge_commit_sha IS NULL))
);

CREATE TABLE publish_run_events (
    publish_event_id TEXT PRIMARY KEY CHECK (length(publish_event_id)=40 AND substr(publish_event_id,1,4)='pev_'),
    publish_run_id TEXT NOT NULL REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    event_type TEXT NOT NULL CHECK (event_type IN ('planned','validated','blocked','branch_prepared','guard_passed','guard_failed','merge_requested','completed','failed','rollback_planned','reverted')),
    actor TEXT NOT NULL CHECK (length(trim(actor)) BETWEEN 1 AND 160),
    details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
    occurred_at TEXT NOT NULL
);
CREATE INDEX idx_publish_events_run ON publish_run_events(publish_run_id,occurred_at);

CREATE TABLE publish_rollback_plans (
    rollback_plan_id TEXT PRIMARY KEY CHECK (length(rollback_plan_id)=40 AND substr(rollback_plan_id,1,4)='rbk_'),
    publish_run_id TEXT NOT NULL UNIQUE REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    exact_file_set_hash TEXT NOT NULL CHECK (length(exact_file_set_hash)=64 AND exact_file_set_hash NOT GLOB '*[^0-9a-f]*'),
    restore_manifest_json TEXT NOT NULL CHECK (json_valid(restore_manifest_json)),
    created_at TEXT NOT NULL,
    executable_in_a9 INTEGER NOT NULL DEFAULT 0 CHECK (executable_in_a9=0)
);

CREATE TABLE publish_path_claims (
    publish_run_id TEXT NOT NULL REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    path TEXT NOT NULL,
    claim_state TEXT NOT NULL CHECK (claim_state IN ('active','released')),
    claimed_at TEXT NOT NULL,
    PRIMARY KEY(publish_run_id,path,claim_state)
) WITHOUT ROWID;
CREATE INDEX idx_publish_path_claims ON publish_path_claims(path,claim_state);

INSERT INTO schema_state(schema_key,schema_value) VALUES ('maison_growth_a9_schema_version','A9.1');

CREATE TRIGGER trg_publisher_identity_no_update BEFORE UPDATE ON publisher_identities BEGIN SELECT RAISE(ABORT,'publisher identities are immutable'); END;
CREATE TRIGGER trg_publisher_identity_no_delete BEFORE DELETE ON publisher_identities BEGIN SELECT RAISE(ABORT,'publisher identities are immutable'); END;
CREATE TRIGGER trg_publish_runs_no_update BEFORE UPDATE ON publish_runs BEGIN SELECT RAISE(ABORT,'publish runs are immutable; append events instead'); END;
CREATE TRIGGER trg_publish_runs_no_delete BEFORE DELETE ON publish_runs BEGIN SELECT RAISE(ABORT,'publish runs are immutable'); END;
CREATE TRIGGER trg_publish_files_no_update BEFORE UPDATE ON publish_run_files BEGIN SELECT RAISE(ABORT,'publish run files are immutable'); END;
CREATE TRIGGER trg_publish_files_no_delete BEFORE DELETE ON publish_run_files BEGIN SELECT RAISE(ABORT,'publish run files are immutable'); END;
CREATE TRIGGER trg_publish_validations_no_update BEFORE UPDATE ON publish_validations BEGIN SELECT RAISE(ABORT,'publish validations are immutable'); END;
CREATE TRIGGER trg_publish_validations_no_delete BEFORE DELETE ON publish_validations BEGIN SELECT RAISE(ABORT,'publish validations are immutable'); END;
CREATE TRIGGER trg_publish_results_no_update BEFORE UPDATE ON publish_run_results BEGIN SELECT RAISE(ABORT,'publish results are immutable'); END;
CREATE TRIGGER trg_publish_results_no_delete BEFORE DELETE ON publish_run_results BEGIN SELECT RAISE(ABORT,'publish results are immutable'); END;
CREATE TRIGGER trg_publish_events_no_update BEFORE UPDATE ON publish_run_events BEGIN SELECT RAISE(ABORT,'publish events are append-only'); END;
CREATE TRIGGER trg_publish_events_no_delete BEFORE DELETE ON publish_run_events BEGIN SELECT RAISE(ABORT,'publish events are append-only'); END;
CREATE TRIGGER trg_publish_rollback_no_update BEFORE UPDATE ON publish_rollback_plans BEGIN SELECT RAISE(ABORT,'rollback plans are immutable'); END;
CREATE TRIGGER trg_publish_rollback_no_delete BEFORE DELETE ON publish_rollback_plans BEGIN SELECT RAISE(ABORT,'rollback plans are immutable'); END;
CREATE TRIGGER trg_publish_claims_no_update BEFORE UPDATE ON publish_path_claims BEGIN SELECT RAISE(ABORT,'publish claims are append-only'); END;
CREATE TRIGGER trg_publish_claims_no_delete BEFORE DELETE ON publish_path_claims BEGIN SELECT RAISE(ABORT,'publish claims are append-only'); END;
