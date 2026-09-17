-- Maison Growth Engine · A3 Journeys + Economics
-- D1 / SQLite-compatible migration 0002
-- Depends on A1.1. This migration is never required by the public Maison site.

PRAGMA foreign_keys = ON;

CREATE TABLE solutions (
    solution_id TEXT PRIMARY KEY
        CHECK (length(solution_id) = 40 AND substr(solution_id, 1, 4) = 'sol_'),
    solution_key TEXT NOT NULL UNIQUE
        CHECK (length(trim(solution_key)) BETWEEN 1 AND 160 AND solution_key = lower(solution_key)),
    solution_type TEXT NOT NULL
        CHECK (solution_type IN (
            'oracle','physical_product','service','ebook','b2b',
            'company','digital_collection','future_product'
        )),
    delivery_mode TEXT NOT NULL
        CHECK (delivery_mode IN ('automatic','human','mixed','external_fulfilment')),
    capacity_class TEXT NOT NULL
        CHECK (capacity_class IN ('scalable','human_limited','inventory_limited','negotiated','unknown')),
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned','active','paused','retired')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE TABLE solution_economics_versions (
    economics_version_id TEXT PRIMARY KEY
        CHECK (length(economics_version_id) = 40 AND substr(economics_version_id, 1, 4) = 'eco_'),
    solution_id TEXT NOT NULL
        REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    version_label TEXT NOT NULL CHECK (length(trim(version_label)) BETWEEN 1 AND 80),
    currency TEXT NOT NULL
        CHECK (length(currency) = 3 AND currency = upper(currency) AND currency NOT GLOB '*[^A-Z]*'),
    reference_price_minor INTEGER NULL CHECK (reference_price_minor IS NULL OR reference_price_minor >= 0),
    variable_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (variable_cost_minor >= 0),
    human_effort_minutes INTEGER NOT NULL DEFAULT 0 CHECK (human_effort_minutes >= 0),
    human_effort_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (human_effort_cost_minor >= 0),
    continuation_expected_value_minor INTEGER NULL,
    repeatability_class TEXT NOT NULL DEFAULT 'unknown'
        CHECK (repeatability_class IN ('none','low','medium','high','recurring','unknown')),
    scalability_score INTEGER NOT NULL
        CHECK (scalability_score BETWEEN 0 AND 100),
    capacity_units_per_period INTEGER NULL CHECK (capacity_units_per_period IS NULL OR capacity_units_per_period >= 0),
    confidence_class TEXT NOT NULL
        CHECK (confidence_class IN ('low','medium','high','observed')),
    confidence_basis TEXT NOT NULL CHECK (length(trim(confidence_basis)) BETWEEN 1 AND 1000),
    assumptions_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(assumptions_json)),
    valid_from TEXT NOT NULL,
    valid_to TEXT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    UNIQUE (solution_id, version_label),
    CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX idx_solution_economics_lookup
    ON solution_economics_versions(solution_id, valid_from, valid_to);

INSERT INTO schema_state(schema_key, schema_value)
VALUES ('maison_growth_a3_schema_version', 'A3.1');

CREATE TABLE journey_rebuild_runs (
    rebuild_run_id TEXT PRIMARY KEY
        CHECK (length(rebuild_run_id) = 40 AND substr(rebuild_run_id, 1, 4) = 'jrb_'),
    algorithm_version TEXT NOT NULL CHECK (length(trim(algorithm_version)) BETWEEN 1 AND 80),
    input_event_set_hash TEXT NOT NULL
        CHECK (length(input_event_set_hash) = 64 AND input_event_set_hash NOT GLOB '*[^0-9a-f]*'),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    event_count INTEGER NOT NULL CHECK (event_count >= 0),
    duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
    unresolved_count INTEGER NOT NULL DEFAULT 0 CHECK (unresolved_count >= 0),
    notes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(notes_json)),
    UNIQUE (algorithm_version, input_event_set_hash)
);

CREATE TABLE journey_snapshots (
    journey_snapshot_id TEXT PRIMARY KEY
        CHECK (length(journey_snapshot_id) = 40 AND substr(journey_snapshot_id, 1, 4) = 'jns_'),
    rebuild_run_id TEXT NOT NULL
        REFERENCES journey_rebuild_runs(rebuild_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    journey_id TEXT NOT NULL
        CHECK (length(journey_id) = 40 AND substr(journey_id, 1, 4) = 'jrn_'),
    first_event_id TEXT NOT NULL
        REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    last_event_id TEXT NOT NULL
        REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    first_occurred_at TEXT NOT NULL,
    last_occurred_at TEXT NOT NULL,
    event_count INTEGER NOT NULL CHECK (event_count >= 1),
    touch_count INTEGER NOT NULL CHECK (touch_count >= 0),
    conversion_count INTEGER NOT NULL CHECK (conversion_count >= 0),
    out_of_order_detected INTEGER NOT NULL DEFAULT 0 CHECK (out_of_order_detected IN (0,1)),
    completeness TEXT NOT NULL
        CHECK (completeness IN ('complete','partial','conversion_only')),
    confidence_class TEXT NOT NULL
        CHECK (confidence_class IN ('low','medium','high')),
    event_set_hash TEXT NOT NULL
        CHECK (length(event_set_hash) = 64 AND event_set_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    UNIQUE (rebuild_run_id, journey_id)
);

CREATE INDEX idx_journey_snapshots_journey
    ON journey_snapshots(journey_id, created_at);

CREATE TABLE journey_snapshot_events (
    journey_snapshot_id TEXT NOT NULL
        REFERENCES journey_snapshots(journey_snapshot_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    event_id TEXT NOT NULL
        REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    event_ordinal INTEGER NOT NULL CHECK (event_ordinal >= 1),
    PRIMARY KEY (journey_snapshot_id, event_id),
    UNIQUE (journey_snapshot_id, event_ordinal)
) WITHOUT ROWID;

CREATE TABLE unresolved_journey_events (
    rebuild_run_id TEXT NOT NULL
        REFERENCES journey_rebuild_runs(rebuild_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    event_id TEXT NOT NULL
        REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    reason_code TEXT NOT NULL
        CHECK (reason_code IN ('missing_journey_id','invalid_journey_reference')),
    event_fingerprint TEXT NOT NULL
        CHECK (length(event_fingerprint) = 64 AND event_fingerprint NOT GLOB '*[^0-9a-f]*'),
    PRIMARY KEY (rebuild_run_id, event_id)
) WITHOUT ROWID;

CREATE TABLE conversions (
    conversion_id TEXT PRIMARY KEY
        CHECK (length(conversion_id) = 40 AND substr(conversion_id, 1, 4) = 'cnv_'),
    source_event_id TEXT NOT NULL UNIQUE
        REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    journey_id TEXT NULL
        CHECK (journey_id IS NULL OR (length(journey_id) = 40 AND substr(journey_id, 1, 4) = 'jrn_')),
    solution_id TEXT NOT NULL
        REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    conversion_kind TEXT NOT NULL
        CHECK (conversion_kind IN ('purchase','booking','order','lead')),
    occurred_at TEXT NOT NULL,
    revenue_minor INTEGER NULL,
    currency TEXT NULL
        CHECK (currency IS NULL OR (length(currency)=3 AND currency=upper(currency) AND currency NOT GLOB '*[^A-Z]*')),
    economic_profile_required INTEGER NOT NULL DEFAULT 1
        CHECK (economic_profile_required IN (0,1)),
    CHECK (
        (revenue_minor IS NULL AND currency IS NULL)
        OR (revenue_minor IS NOT NULL AND currency IS NOT NULL)
    )
);

CREATE INDEX idx_conversions_journey_time ON conversions(journey_id, occurred_at);
CREATE INDEX idx_conversions_solution_time ON conversions(solution_id, occurred_at);

CREATE TABLE conversion_attribution (
    conversion_id TEXT NOT NULL
        REFERENCES conversions(conversion_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    touch_event_id TEXT NOT NULL
        REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    touch_role TEXT NOT NULL
        CHECK (touch_role IN ('first','first_last','assisted','last')),
    touch_ordinal INTEGER NOT NULL CHECK (touch_ordinal >= 1),
    attribution_method TEXT NOT NULL DEFAULT 'position_role_v1'
        CHECK (attribution_method = 'position_role_v1'),
    PRIMARY KEY (conversion_id, touch_event_id)
) WITHOUT ROWID;

CREATE INDEX idx_conversion_attribution_role
    ON conversion_attribution(conversion_id, touch_role, touch_ordinal);

CREATE TABLE conversion_economic_assessments (
    economic_assessment_id TEXT PRIMARY KEY
        CHECK (length(economic_assessment_id) = 40 AND substr(economic_assessment_id, 1, 4) = 'eva_'),
    conversion_id TEXT NOT NULL
        REFERENCES conversions(conversion_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    economics_version_id TEXT NOT NULL
        REFERENCES solution_economics_versions(economics_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    revenue_minor INTEGER NOT NULL,
    variable_cost_minor INTEGER NOT NULL CHECK (variable_cost_minor >= 0),
    human_effort_minutes INTEGER NOT NULL CHECK (human_effort_minutes >= 0),
    human_effort_cost_minor INTEGER NOT NULL CHECK (human_effort_cost_minor >= 0),
    immediate_contribution_minor INTEGER NOT NULL,
    continuation_expected_value_minor INTEGER NULL,
    expected_total_value_minor INTEGER NULL,
    scalability_score INTEGER NOT NULL CHECK (scalability_score BETWEEN 0 AND 100),
    repeatability_class TEXT NOT NULL,
    confidence_class TEXT NOT NULL,
    calculation_version TEXT NOT NULL CHECK (length(trim(calculation_version)) BETWEEN 1 AND 80),
    input_hash TEXT NOT NULL
        CHECK (length(input_hash) = 64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    UNIQUE (conversion_id, economics_version_id, calculation_version)
);

-- A3 derivations are append-only. Late events create a new rebuild run/snapshot;
-- economics changes create a new economics version/assessment.
CREATE TRIGGER trg_solutions_no_update BEFORE UPDATE ON solutions
BEGIN SELECT RAISE(ABORT, 'solutions are immutable; insert a new semantic solution when identity changes'); END;
CREATE TRIGGER trg_solutions_no_delete BEFORE DELETE ON solutions
BEGIN SELECT RAISE(ABORT, 'solutions are immutable'); END;

CREATE TRIGGER trg_solution_economics_no_update BEFORE UPDATE ON solution_economics_versions
BEGIN SELECT RAISE(ABORT, 'solution economics are versioned; insert a new version'); END;
CREATE TRIGGER trg_solution_economics_no_delete BEFORE DELETE ON solution_economics_versions
BEGIN SELECT RAISE(ABORT, 'solution economics versions are immutable'); END;

CREATE TRIGGER trg_journey_rebuild_runs_no_update BEFORE UPDATE ON journey_rebuild_runs
BEGIN SELECT RAISE(ABORT, 'journey rebuild runs are immutable'); END;
CREATE TRIGGER trg_journey_rebuild_runs_no_delete BEFORE DELETE ON journey_rebuild_runs
BEGIN SELECT RAISE(ABORT, 'journey rebuild runs are immutable'); END;

CREATE TRIGGER trg_journey_snapshots_no_update BEFORE UPDATE ON journey_snapshots
BEGIN SELECT RAISE(ABORT, 'journey snapshots are immutable; rebuild instead'); END;
CREATE TRIGGER trg_journey_snapshots_no_delete BEFORE DELETE ON journey_snapshots
BEGIN SELECT RAISE(ABORT, 'journey snapshots are immutable'); END;

CREATE TRIGGER trg_journey_snapshot_events_no_update BEFORE UPDATE ON journey_snapshot_events
BEGIN SELECT RAISE(ABORT, 'journey snapshot events are immutable'); END;
CREATE TRIGGER trg_journey_snapshot_events_no_delete BEFORE DELETE ON journey_snapshot_events
BEGIN SELECT RAISE(ABORT, 'journey snapshot events are immutable'); END;

CREATE TRIGGER trg_unresolved_journey_events_no_update BEFORE UPDATE ON unresolved_journey_events
BEGIN SELECT RAISE(ABORT, 'unresolved journey facts are immutable; rebuild instead'); END;
CREATE TRIGGER trg_unresolved_journey_events_no_delete BEFORE DELETE ON unresolved_journey_events
BEGIN SELECT RAISE(ABORT, 'unresolved journey facts are immutable'); END;

CREATE TRIGGER trg_conversions_no_update BEFORE UPDATE ON conversions
BEGIN SELECT RAISE(ABORT, 'conversions are immutable facts'); END;
CREATE TRIGGER trg_conversions_no_delete BEFORE DELETE ON conversions
BEGIN SELECT RAISE(ABORT, 'conversions are immutable'); END;

CREATE TRIGGER trg_conversion_attribution_no_update BEFORE UPDATE ON conversion_attribution
BEGIN SELECT RAISE(ABORT, 'conversion attribution is immutable; rebuild instead'); END;
CREATE TRIGGER trg_conversion_attribution_no_delete BEFORE DELETE ON conversion_attribution
BEGIN SELECT RAISE(ABORT, 'conversion attribution is immutable'); END;

CREATE TRIGGER trg_conversion_economic_assessments_no_update BEFORE UPDATE ON conversion_economic_assessments
BEGIN SELECT RAISE(ABORT, 'economic assessments are immutable; recalculate into a new version'); END;
CREATE TRIGGER trg_conversion_economic_assessments_no_delete BEFORE DELETE ON conversion_economic_assessments
BEGIN SELECT RAISE(ABORT, 'economic assessments are immutable'); END;
