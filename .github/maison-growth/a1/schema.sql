-- Maison Growth Engine · A1 Data Foundation
-- D1 / SQLite-compatible migration 0001
-- Runtime isolation contract: this schema is not required by the public Maison site.

PRAGMA foreign_keys = ON;

CREATE TABLE rule_versions (
    rule_version_id TEXT PRIMARY KEY
        CHECK (length(rule_version_id) = 40 AND substr(rule_version_id, 1, 4) = 'rul_'),
    family TEXT NOT NULL CHECK (length(trim(family)) BETWEEN 1 AND 120),
    version_label TEXT NOT NULL CHECK (length(trim(version_label)) BETWEEN 1 AND 80),
    definition_hash TEXT NOT NULL
        CHECK (length(definition_hash) = 64 AND definition_hash NOT GLOB '*[^0-9a-f]*'),
    definition_json TEXT NOT NULL CHECK (json_valid(definition_json)),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    supersedes_rule_version_id TEXT NULL
        REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    UNIQUE (family, version_label),
    CHECK (supersedes_rule_version_id IS NULL OR supersedes_rule_version_id <> rule_version_id)
);

CREATE TABLE model_versions (
    model_version_id TEXT PRIMARY KEY
        CHECK (length(model_version_id) = 40 AND substr(model_version_id, 1, 4) = 'mdl_'),
    provider TEXT NOT NULL CHECK (length(trim(provider)) BETWEEN 1 AND 80),
    model_name TEXT NOT NULL CHECK (length(trim(model_name)) BETWEEN 1 AND 160),
    version_label TEXT NOT NULL CHECK (length(trim(version_label)) BETWEEN 1 AND 120),
    config_hash TEXT NOT NULL
        CHECK (length(config_hash) = 64 AND config_hash NOT GLOB '*[^0-9a-f]*'),
    config_json TEXT NOT NULL CHECK (json_valid(config_json)),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    supersedes_model_version_id TEXT NULL
        REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    UNIQUE (provider, model_name, version_label),
    CHECK (supersedes_model_version_id IS NULL OR supersedes_model_version_id <> model_version_id)
);

CREATE TABLE events (
    event_id TEXT PRIMARY KEY
        CHECK (length(event_id) = 40 AND substr(event_id, 1, 4) = 'evt_'),
    idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
    event_type TEXT NOT NULL
        CHECK (
            length(event_type) BETWEEN 3 AND 160
            AND instr(event_type, '.') > 1
            AND event_type = lower(event_type)
            AND event_type NOT GLOB '* *'
        ),
    source TEXT NOT NULL CHECK (length(trim(source)) BETWEEN 1 AND 80),
    schema_version INTEGER NOT NULL DEFAULT 2 CHECK (schema_version >= 1),
    occurred_at TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    journey_id TEXT NULL
        CHECK (journey_id IS NULL OR (length(journey_id) = 40 AND substr(journey_id, 1, 4) = 'jrn_')),
    asset_id TEXT NULL
        CHECK (asset_id IS NULL OR (length(asset_id) = 40 AND substr(asset_id, 1, 4) = 'ast_')),
    need_id TEXT NULL
        CHECK (need_id IS NULL OR (length(need_id) = 40 AND substr(need_id, 1, 4) = 'ned_')),
    solution_id TEXT NULL
        CHECK (solution_id IS NULL OR (length(solution_id) = 40 AND substr(solution_id, 1, 4) = 'sol_')),
    value_minor INTEGER NULL,
    currency TEXT NULL
        CHECK (
            currency IS NULL
            OR (length(currency) = 3 AND currency = upper(currency) AND currency NOT GLOB '*[^A-Z]*')
        ),
    privacy_class TEXT NOT NULL DEFAULT 'pseudonymous'
        CHECK (privacy_class IN ('anonymous', 'pseudonymous', 'aggregated', 'system')),
    payload_hash TEXT NOT NULL
        CHECK (length(payload_hash) = 64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    rule_version_id TEXT NULL
        REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL
        REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    UNIQUE (source, idempotency_key),
    CHECK (
        (value_minor IS NULL AND currency IS NULL)
        OR (value_minor IS NOT NULL AND currency IS NOT NULL)
    )
);

CREATE INDEX idx_events_occurred_at ON events(occurred_at);
CREATE INDEX idx_events_type_time ON events(event_type, occurred_at);
CREATE INDEX idx_events_source_time ON events(source, occurred_at);
CREATE INDEX idx_events_journey_time ON events(journey_id, occurred_at)
    WHERE journey_id IS NOT NULL;
CREATE INDEX idx_events_solution_time ON events(solution_id, occurred_at)
    WHERE solution_id IS NOT NULL;

CREATE TABLE audit_log (
    audit_id TEXT PRIMARY KEY
        CHECK (length(audit_id) = 40 AND substr(audit_id, 1, 4) = 'aud_'),
    idempotency_key TEXT NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 8 AND 200),
    occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    actor_type TEXT NOT NULL
        CHECK (actor_type IN ('human', 'component', 'system')),
    actor_id TEXT NULL CHECK (actor_id IS NULL OR length(actor_id) BETWEEN 1 AND 160),
    component TEXT NOT NULL CHECK (length(trim(component)) BETWEEN 1 AND 120),
    action TEXT NOT NULL CHECK (length(trim(action)) BETWEEN 1 AND 160),
    object_type TEXT NOT NULL CHECK (length(trim(object_type)) BETWEEN 1 AND 120),
    object_id TEXT NULL CHECK (object_id IS NULL OR length(object_id) BETWEEN 1 AND 200),
    before_json TEXT NULL CHECK (before_json IS NULL OR json_valid(before_json)),
    after_json TEXT NULL CHECK (after_json IS NULL OR json_valid(after_json)),
    reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
    evidence_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
    rule_version_id TEXT NULL
        REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL
        REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    commit_sha TEXT NULL
        CHECK (
            commit_sha IS NULL
            OR (length(commit_sha) = 40 AND commit_sha NOT GLOB '*[^0-9a-f]*')
        ),
    correlation_id TEXT NULL CHECK (correlation_id IS NULL OR length(correlation_id) BETWEEN 8 AND 200),
    rollback_of_audit_id TEXT NULL
        REFERENCES audit_log(audit_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CHECK (rollback_of_audit_id IS NULL OR rollback_of_audit_id <> audit_id)
);

CREATE INDEX idx_audit_time ON audit_log(occurred_at);
CREATE INDEX idx_audit_object ON audit_log(object_type, object_id, occurred_at);
CREATE INDEX idx_audit_correlation ON audit_log(correlation_id, occurred_at)
    WHERE correlation_id IS NOT NULL;

CREATE TABLE idempotency_registry (
    scope TEXT NOT NULL CHECK (length(trim(scope)) BETWEEN 1 AND 120),
    idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
    object_type TEXT NOT NULL CHECK (length(trim(object_type)) BETWEEN 1 AND 120),
    object_id TEXT NOT NULL CHECK (length(object_id) BETWEEN 1 AND 200),
    payload_hash TEXT NOT NULL
        CHECK (length(payload_hash) = 64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
    first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (scope, idempotency_key)
) WITHOUT ROWID;

CREATE TABLE schema_state (
    schema_key TEXT PRIMARY KEY CHECK (length(trim(schema_key)) BETWEEN 1 AND 120),
    schema_value TEXT NOT NULL CHECK (length(schema_value) BETWEEN 1 AND 500),
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) WITHOUT ROWID;

INSERT INTO schema_state(schema_key, schema_value)
VALUES ('maison_growth_schema_version', 'A1.1');

-- Append-only / immutable foundation tables.
CREATE TRIGGER trg_audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER trg_audit_log_no_delete
BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER trg_rule_versions_no_update
BEFORE UPDATE ON rule_versions
BEGIN
    SELECT RAISE(ABORT, 'rule_versions are immutable; insert a new version');
END;

CREATE TRIGGER trg_rule_versions_no_delete
BEFORE DELETE ON rule_versions
BEGIN
    SELECT RAISE(ABORT, 'rule_versions are immutable');
END;

CREATE TRIGGER trg_model_versions_no_update
BEFORE UPDATE ON model_versions
BEGIN
    SELECT RAISE(ABORT, 'model_versions are immutable; insert a new version');
END;

CREATE TRIGGER trg_model_versions_no_delete
BEFORE DELETE ON model_versions
BEGIN
    SELECT RAISE(ABORT, 'model_versions are immutable');
END;

CREATE TRIGGER trg_idempotency_registry_no_update
BEFORE UPDATE ON idempotency_registry
BEGIN
    SELECT RAISE(ABORT, 'idempotency_registry is immutable');
END;

CREATE TRIGGER trg_idempotency_registry_no_delete
BEFORE DELETE ON idempotency_registry
BEGIN
    SELECT RAISE(ABORT, 'idempotency_registry is immutable');
END;

CREATE TRIGGER trg_events_no_update
BEFORE UPDATE ON events
BEGIN
    SELECT RAISE(ABORT, 'events are immutable; corrections must be new events');
END;

CREATE TRIGGER trg_events_no_delete
BEFORE DELETE ON events
BEGIN
    SELECT RAISE(ABORT, 'events are immutable');
END;
