-- Maison Growth Engine · A8 Experiment Manager
-- D1 / SQLite-compatible migration 0006
-- Depends on A1.1 + A3.1 + A4.1 + A7.1. Never required by the public Maison site.
PRAGMA foreign_keys = ON;

CREATE TABLE experiments (
    experiment_id TEXT PRIMARY KEY CHECK (length(experiment_id)=40 AND substr(experiment_id,1,4)='exp_'),
    experiment_key TEXT NOT NULL UNIQUE CHECK (length(trim(experiment_key)) BETWEEN 1 AND 180 AND experiment_key=lower(experiment_key)),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects = 0)
);

CREATE TABLE experiment_versions (
    experiment_version_id TEXT PRIMARY KEY CHECK (length(experiment_version_id)=40 AND substr(experiment_version_id,1,4)='exv_'),
    experiment_id TEXT NOT NULL REFERENCES experiments(experiment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    decision_id TEXT NOT NULL REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    hypothesis TEXT NOT NULL CHECK (length(trim(hypothesis)) BETWEEN 10 AND 1000),
    change_class TEXT NOT NULL CHECK (change_class = 'cta_route_existing_solution'),
    eligible_population_json TEXT NOT NULL CHECK (json_valid(eligible_population_json)),
    primary_metric_key TEXT NOT NULL CHECK (primary_metric_key IN ('economic_value_per_eligible_session','cta_click_rate','conversion_rate')),
    secondary_metrics_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(secondary_metrics_json)),
    stop_rules_json TEXT NOT NULL CHECK (json_valid(stop_rules_json)),
    success_criteria_json TEXT NOT NULL CHECK (json_valid(success_criteria_json)),
    split_json TEXT NOT NULL CHECK (json_valid(split_json)),
    compatibility_key TEXT NOT NULL CHECK (length(trim(compatibility_key)) BETWEEN 1 AND 200),
    policy_version TEXT NOT NULL CHECK (length(trim(policy_version)) BETWEEN 1 AND 120),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    UNIQUE(experiment_id,version_number),
    UNIQUE(experiment_id,input_hash)
);

CREATE TABLE experiment_variants (
    experiment_variant_id TEXT PRIMARY KEY CHECK (length(experiment_variant_id)=40 AND substr(experiment_variant_id,1,4)='var_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    variant_key TEXT NOT NULL CHECK (variant_key IN ('control','variant_a','variant_b')),
    allocation_basis_points INTEGER NOT NULL CHECK (allocation_basis_points BETWEEN 1 AND 9999),
    variant_payload_json TEXT NOT NULL CHECK (json_valid(variant_payload_json)),
    payload_hash TEXT NOT NULL CHECK (length(payload_hash)=64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    UNIQUE(experiment_version_id,variant_key)
);

CREATE TABLE experiment_snapshots (
    experiment_snapshot_id TEXT PRIMARY KEY CHECK (length(experiment_snapshot_id)=40 AND substr(experiment_snapshot_id,1,4)='snp_'),
    experiment_version_id TEXT NOT NULL UNIQUE REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_asset_id TEXT NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    cta_slot_key TEXT NOT NULL CHECK (length(trim(cta_slot_key)) BETWEEN 1 AND 160),
    previous_state_json TEXT NOT NULL CHECK (json_valid(previous_state_json)),
    previous_state_hash TEXT NOT NULL CHECK (length(previous_state_hash)=64 AND previous_state_hash NOT GLOB '*[^0-9a-f]*'),
    captured_at TEXT NOT NULL,
    captured_by TEXT NOT NULL CHECK (length(trim(captured_by)) BETWEEN 1 AND 160),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects = 0)
);

CREATE TABLE experiment_state_events (
    state_event_id TEXT PRIMARY KEY CHECK (length(state_event_id)=40 AND substr(state_event_id,1,4)='xst_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    from_state TEXT NULL CHECK (from_state IS NULL OR from_state IN ('draft','ready','running','paused','stopped','completed','reverted')),
    to_state TEXT NOT NULL CHECK (to_state IN ('draft','ready','running','paused','stopped','completed','reverted')),
    reason_code TEXT NOT NULL CHECK (length(trim(reason_code)) BETWEEN 1 AND 160),
    occurred_at TEXT NOT NULL,
    actor_kind TEXT NOT NULL CHECK (actor_kind IN ('system_simulation','human','future_runtime')),
    details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json))
);
CREATE INDEX idx_experiment_state ON experiment_state_events(experiment_version_id,occurred_at);

CREATE TABLE experiment_compatibility_claims (
    compatibility_claim_id TEXT PRIMARY KEY CHECK (length(compatibility_claim_id)=40 AND substr(compatibility_claim_id,1,4)='xcl_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    compatibility_key TEXT NOT NULL,
    scope_hash TEXT NOT NULL CHECK (length(scope_hash)=64 AND scope_hash NOT GLOB '*[^0-9a-f]*'),
    claim_state TEXT NOT NULL CHECK (claim_state IN ('ready','running','released')),
    claimed_at TEXT NOT NULL,
    UNIQUE(experiment_version_id,compatibility_key,scope_hash,claim_state)
);
CREATE INDEX idx_experiment_compatibility ON experiment_compatibility_claims(compatibility_key,scope_hash,claim_state);

CREATE TABLE experiment_exposures (
    exposure_id TEXT PRIMARY KEY CHECK (length(exposure_id)=40 AND substr(exposure_id,1,4)='xps_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    pseudonymous_exposure_key TEXT NOT NULL CHECK (length(pseudonymous_exposure_key)=64 AND pseudonymous_exposure_key NOT GLOB '*[^0-9a-f]*'),
    journey_id TEXT NULL CHECK (journey_id IS NULL OR (length(journey_id)=40 AND substr(journey_id,1,4)='jrn_')),
    experiment_variant_id TEXT NOT NULL REFERENCES experiment_variants(experiment_variant_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    eligible INTEGER NOT NULL CHECK (eligible IN (0,1)),
    eligibility_reason_code TEXT NOT NULL CHECK (length(trim(eligibility_reason_code)) BETWEEN 1 AND 160),
    bucket INTEGER NOT NULL CHECK (bucket BETWEEN 0 AND 9999),
    exposed_at TEXT NOT NULL,
    UNIQUE(experiment_version_id,pseudonymous_exposure_key)
);
CREATE INDEX idx_exposures_variant ON experiment_exposures(experiment_version_id,experiment_variant_id,exposed_at);

CREATE TABLE experiment_metric_observations (
    metric_observation_id TEXT PRIMARY KEY CHECK (length(metric_observation_id)=40 AND substr(metric_observation_id,1,4)='xmo_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    exposure_id TEXT NOT NULL REFERENCES experiment_exposures(exposure_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    journey_id TEXT NULL CHECK (journey_id IS NULL OR (length(journey_id)=40 AND substr(journey_id,1,4)='jrn_')),
    conversion_id TEXT NULL REFERENCES conversions(conversion_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    economic_assessment_id TEXT NULL REFERENCES conversion_economic_assessments(economic_assessment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    metric_key TEXT NOT NULL CHECK (metric_key IN ('eligible_session','cta_click','conversion','economic_value_minor','technical_error','abandonment')),
    metric_value INTEGER NOT NULL,
    currency TEXT NULL CHECK (currency IS NULL OR (length(currency)=3 AND currency=upper(currency) AND currency NOT GLOB '*[^A-Z]*')),
    observed_at TEXT NOT NULL,
    source_event_id TEXT NULL REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    UNIQUE(experiment_version_id,exposure_id,metric_key,input_hash)
);

CREATE TABLE experiment_results (
    experiment_result_id TEXT PRIMARY KEY CHECK (length(experiment_result_id)=40 AND substr(experiment_result_id,1,4)='xrs_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    evaluation_number INTEGER NOT NULL CHECK (evaluation_number >= 1),
    sample_size INTEGER NOT NULL CHECK (sample_size >= 0),
    variant_metrics_json TEXT NOT NULL CHECK (json_valid(variant_metrics_json)),
    primary_metric_key TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('success','neutral','worse','insufficient')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    stop_recommended INTEGER NOT NULL CHECK (stop_recommended IN (0,1)),
    rollback_recommended INTEGER NOT NULL CHECK (rollback_recommended IN (0,1)),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    evaluated_at TEXT NOT NULL,
    UNIQUE(experiment_version_id,evaluation_number),
    UNIQUE(experiment_version_id,input_hash)
);

CREATE TABLE experiment_rollbacks (
    rollback_id TEXT PRIMARY KEY CHECK (length(rollback_id)=40 AND substr(rollback_id,1,4)='rbk_'),
    experiment_version_id TEXT NOT NULL REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    experiment_snapshot_id TEXT NOT NULL REFERENCES experiment_snapshots(experiment_snapshot_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    result_id TEXT NULL REFERENCES experiment_results(experiment_result_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    rollback_target_json TEXT NOT NULL CHECK (json_valid(rollback_target_json)),
    rollback_target_hash TEXT NOT NULL CHECK (length(rollback_target_hash)=64 AND rollback_target_hash NOT GLOB '*[^0-9a-f]*'),
    status TEXT NOT NULL CHECK (status IN ('planned','validated','simulated')),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    publisher_gateway_required INTEGER NOT NULL DEFAULT 1 CHECK (publisher_gateway_required = 1),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects = 0),
    created_at TEXT NOT NULL,
    UNIQUE(experiment_version_id,experiment_snapshot_id,rollback_target_hash)
);

INSERT INTO schema_state(schema_key,schema_value) VALUES ('maison_growth_a8_schema_version','A8.1');

CREATE TRIGGER trg_experiments_no_update BEFORE UPDATE ON experiments BEGIN SELECT RAISE(ABORT,'experiments are immutable identities'); END;
CREATE TRIGGER trg_experiments_no_delete BEFORE DELETE ON experiments BEGIN SELECT RAISE(ABORT,'experiments are immutable'); END;
CREATE TRIGGER trg_experiment_versions_no_update BEFORE UPDATE ON experiment_versions BEGIN SELECT RAISE(ABORT,'experiment versions are immutable; create a new version'); END;
CREATE TRIGGER trg_experiment_versions_no_delete BEFORE DELETE ON experiment_versions BEGIN SELECT RAISE(ABORT,'experiment versions are immutable'); END;
CREATE TRIGGER trg_experiment_variants_no_update BEFORE UPDATE ON experiment_variants BEGIN SELECT RAISE(ABORT,'experiment variants are immutable'); END;
CREATE TRIGGER trg_experiment_variants_no_delete BEFORE DELETE ON experiment_variants BEGIN SELECT RAISE(ABORT,'experiment variants are immutable'); END;
CREATE TRIGGER trg_experiment_snapshots_no_update BEFORE UPDATE ON experiment_snapshots BEGIN SELECT RAISE(ABORT,'experiment snapshots are immutable'); END;
CREATE TRIGGER trg_experiment_snapshots_no_delete BEFORE DELETE ON experiment_snapshots BEGIN SELECT RAISE(ABORT,'experiment snapshots are immutable'); END;
CREATE TRIGGER trg_experiment_state_no_update BEFORE UPDATE ON experiment_state_events BEGIN SELECT RAISE(ABORT,'experiment state history is append-only'); END;
CREATE TRIGGER trg_experiment_state_no_delete BEFORE DELETE ON experiment_state_events BEGIN SELECT RAISE(ABORT,'experiment state history is append-only'); END;
CREATE TRIGGER trg_experiment_claims_no_update BEFORE UPDATE ON experiment_compatibility_claims BEGIN SELECT RAISE(ABORT,'compatibility claims are append-only'); END;
CREATE TRIGGER trg_experiment_claims_no_delete BEFORE DELETE ON experiment_compatibility_claims BEGIN SELECT RAISE(ABORT,'compatibility claims are append-only'); END;
CREATE TRIGGER trg_experiment_exposures_no_update BEFORE UPDATE ON experiment_exposures BEGIN SELECT RAISE(ABORT,'experiment exposures are immutable'); END;
CREATE TRIGGER trg_experiment_exposures_no_delete BEFORE DELETE ON experiment_exposures BEGIN SELECT RAISE(ABORT,'experiment exposures are immutable'); END;
CREATE TRIGGER trg_experiment_metrics_no_update BEFORE UPDATE ON experiment_metric_observations BEGIN SELECT RAISE(ABORT,'experiment metrics are immutable'); END;
CREATE TRIGGER trg_experiment_metrics_no_delete BEFORE DELETE ON experiment_metric_observations BEGIN SELECT RAISE(ABORT,'experiment metrics are immutable'); END;
CREATE TRIGGER trg_experiment_results_no_update BEFORE UPDATE ON experiment_results BEGIN SELECT RAISE(ABORT,'experiment results are immutable'); END;
CREATE TRIGGER trg_experiment_results_no_delete BEFORE DELETE ON experiment_results BEGIN SELECT RAISE(ABORT,'experiment results are immutable'); END;
CREATE TRIGGER trg_experiment_rollbacks_no_update BEFORE UPDATE ON experiment_rollbacks BEGIN SELECT RAISE(ABORT,'rollback plans are immutable'); END;
CREATE TRIGGER trg_experiment_rollbacks_no_delete BEFORE DELETE ON experiment_rollbacks BEGIN SELECT RAISE(ABORT,'rollback plans are immutable'); END;
