-- Maison Growth Engine · A5 Brain
-- D1 / SQLite-compatible migration 0004
-- Depends on A1.1 + A3.1 + A4.1. Never required by the public Maison site.
PRAGMA foreign_keys = ON;

CREATE TABLE brain_runs (
    brain_run_id TEXT PRIMARY KEY CHECK (length(brain_run_id)=40 AND substr(brain_run_id,1,4)='brn_'),
    run_kind TEXT NOT NULL CHECK (run_kind IN ('semantic','coverage','candidate','mixed')),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    provider_name TEXT NOT NULL CHECK (length(trim(provider_name)) BETWEEN 1 AND 120),
    provider_version TEXT NOT NULL CHECK (length(trim(provider_version)) BETWEEN 1 AND 120),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    input_count INTEGER NOT NULL CHECK (input_count >= 0),
    notes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(notes_json)),
    UNIQUE(run_kind, rule_version_id, model_version_id, provider_name, provider_version, input_hash)
);

CREATE TABLE semantic_observations (
    semantic_observation_id TEXT PRIMARY KEY CHECK (length(semantic_observation_id)=40 AND substr(semantic_observation_id,1,4)='sob_'),
    brain_run_id TEXT NOT NULL REFERENCES brain_runs(brain_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('radar_derived','manual_privacy_reviewed','system_fixture')),
    source_evidence_id TEXT NULL REFERENCES map_evidence(evidence_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    need_id TEXT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    normalized_phrase TEXT NOT NULL CHECK (length(trim(normalized_phrase)) BETWEEN 1 AND 500),
    phrase_hash TEXT NOT NULL CHECK (length(phrase_hash)=64 AND phrase_hash NOT GLOB '*[^0-9a-f]*'),
    semantic_signature TEXT NOT NULL CHECK (length(trim(semantic_signature)) BETWEEN 1 AND 1000),
    semantic_fingerprint TEXT NOT NULL CHECK (length(semantic_fingerprint)=64 AND semantic_fingerprint NOT GLOB '*[^0-9a-f]*'),
    ambiguity INTEGER NOT NULL CHECK (ambiguity IN (0,1)),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    provider_name TEXT NOT NULL,
    provider_version TEXT NOT NULL,
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(brain_run_id, source_kind, source_evidence_id, phrase_hash)
);
CREATE INDEX idx_semantic_observations_need ON semantic_observations(need_id, created_at) WHERE need_id IS NOT NULL;
CREATE INDEX idx_semantic_observations_intent ON semantic_observations(intent_id, created_at) WHERE intent_id IS NOT NULL;
CREATE INDEX idx_semantic_observations_fp ON semantic_observations(semantic_fingerprint);

CREATE TABLE semantic_clusters (
    semantic_cluster_id TEXT PRIMARY KEY CHECK (length(semantic_cluster_id)=40 AND substr(semantic_cluster_id,1,4)='clu_'),
    brain_run_id TEXT NOT NULL REFERENCES brain_runs(brain_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    cluster_key TEXT NOT NULL CHECK (length(cluster_key)=64 AND cluster_key NOT GLOB '*[^0-9a-f]*'),
    canonical_signature TEXT NOT NULL CHECK (length(trim(canonical_signature)) BETWEEN 1 AND 1000),
    mapped_need_id TEXT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    mapped_intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    internal_state TEXT NOT NULL CHECK (internal_state IN ('observe','covered','gap','alias_candidate','reinforcement_candidate','internal_candidate','rejected','archived')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(brain_run_id, cluster_key)
);

CREATE TABLE semantic_cluster_members (
    semantic_cluster_id TEXT NOT NULL REFERENCES semantic_clusters(semantic_cluster_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    semantic_observation_id TEXT NOT NULL REFERENCES semantic_observations(semantic_observation_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    similarity_score INTEGER NOT NULL CHECK (similarity_score BETWEEN 0 AND 100),
    reason_code TEXT NOT NULL CHECK (length(trim(reason_code)) BETWEEN 1 AND 120),
    PRIMARY KEY(semantic_cluster_id, semantic_observation_id)
) WITHOUT ROWID;

CREATE TABLE semantic_aliases (
    alias_id TEXT PRIMARY KEY CHECK (length(alias_id)=40 AND substr(alias_id,1,4)='als_'),
    semantic_cluster_id TEXT NOT NULL REFERENCES semantic_clusters(semantic_cluster_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    canonical_intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    normalized_alias TEXT NOT NULL CHECK (length(trim(normalized_alias)) BETWEEN 1 AND 500),
    alias_hash TEXT NOT NULL CHECK (length(alias_hash)=64 AND alias_hash NOT GLOB '*[^0-9a-f]*'),
    status TEXT NOT NULL CHECK (status IN ('observed','alias_candidate','accepted_internal','rejected')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    created_at TEXT NOT NULL,
    UNIQUE(canonical_intent_id, alias_hash)
);

CREATE TABLE coverage_resolutions (
    coverage_resolution_id TEXT PRIMARY KEY CHECK (length(coverage_resolution_id)=40 AND substr(coverage_resolution_id,1,4)='cvr_'),
    brain_run_id TEXT NOT NULL REFERENCES brain_runs(brain_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    target_type TEXT NOT NULL CHECK (target_type IN ('need','intent','cluster')),
    target_id TEXT NOT NULL CHECK (length(target_id)=40),
    public_coverage TEXT NOT NULL CHECK (public_coverage IN ('none','partial','sufficient','redundant')),
    solution_coverage TEXT NOT NULL CHECK (solution_coverage IN ('none','partial','sufficient','multiple')),
    conclusion_state TEXT NOT NULL CHECK (conclusion_state IN ('observe','covered','gap','alias_candidate','reinforcement_candidate','internal_candidate','rejected','archived')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(brain_run_id,target_type,target_id,input_hash)
);
CREATE INDEX idx_coverage_resolutions_target ON coverage_resolutions(target_type,target_id,created_at);

CREATE TABLE brain_conclusions (
    brain_conclusion_id TEXT PRIMARY KEY CHECK (length(brain_conclusion_id)=40 AND substr(brain_conclusion_id,1,4)='bcn_'),
    brain_run_id TEXT NOT NULL REFERENCES brain_runs(brain_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('need','intent','cluster','alias','candidate')),
    subject_id TEXT NOT NULL CHECK (length(subject_id)=40),
    conclusion_state TEXT NOT NULL CHECK (conclusion_state IN ('observe','covered','gap','alias_candidate','reinforcement_candidate','internal_candidate','rejected','archived')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    context_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    UNIQUE(brain_run_id,subject_type,subject_id,input_hash)
);

CREATE TABLE internal_candidates (
    internal_candidate_id TEXT PRIMARY KEY CHECK (length(internal_candidate_id)=40 AND substr(internal_candidate_id,1,4)='can_'),
    brain_run_id TEXT NOT NULL REFERENCES brain_runs(brain_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    candidate_kind TEXT NOT NULL CHECK (candidate_kind IN ('content_intent','alias','reinforcement')),
    semantic_cluster_id TEXT NULL REFERENCES semantic_clusters(semantic_cluster_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    need_id TEXT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    state TEXT NOT NULL CHECK (state IN ('observe','alias_candidate','reinforcement_candidate','internal_candidate','rejected','archived')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    context_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context_json)),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TEXT NOT NULL,
    CHECK (semantic_cluster_id IS NOT NULL OR need_id IS NOT NULL OR intent_id IS NOT NULL),
    UNIQUE(brain_run_id,candidate_kind,input_hash)
);

INSERT INTO schema_state(schema_key,schema_value) VALUES ('maison_growth_a5_schema_version','A5.1');

CREATE TRIGGER trg_brain_runs_no_update BEFORE UPDATE ON brain_runs BEGIN SELECT RAISE(ABORT,'brain runs are immutable'); END;
CREATE TRIGGER trg_brain_runs_no_delete BEFORE DELETE ON brain_runs BEGIN SELECT RAISE(ABORT,'brain runs are immutable'); END;
CREATE TRIGGER trg_semantic_observations_no_update BEFORE UPDATE ON semantic_observations BEGIN SELECT RAISE(ABORT,'semantic observations are immutable'); END;
CREATE TRIGGER trg_semantic_observations_no_delete BEFORE DELETE ON semantic_observations BEGIN SELECT RAISE(ABORT,'semantic observations are immutable'); END;
CREATE TRIGGER trg_semantic_clusters_no_update BEFORE UPDATE ON semantic_clusters BEGIN SELECT RAISE(ABORT,'semantic clusters are immutable'); END;
CREATE TRIGGER trg_semantic_clusters_no_delete BEFORE DELETE ON semantic_clusters BEGIN SELECT RAISE(ABORT,'semantic clusters are immutable'); END;
CREATE TRIGGER trg_semantic_cluster_members_no_update BEFORE UPDATE ON semantic_cluster_members BEGIN SELECT RAISE(ABORT,'cluster members are immutable'); END;
CREATE TRIGGER trg_semantic_cluster_members_no_delete BEFORE DELETE ON semantic_cluster_members BEGIN SELECT RAISE(ABORT,'cluster members are immutable'); END;
CREATE TRIGGER trg_semantic_aliases_no_update BEFORE UPDATE ON semantic_aliases BEGIN SELECT RAISE(ABORT,'semantic aliases are append-only'); END;
CREATE TRIGGER trg_semantic_aliases_no_delete BEFORE DELETE ON semantic_aliases BEGIN SELECT RAISE(ABORT,'semantic aliases are append-only'); END;
CREATE TRIGGER trg_coverage_resolutions_no_update BEFORE UPDATE ON coverage_resolutions BEGIN SELECT RAISE(ABORT,'coverage resolutions are immutable'); END;
CREATE TRIGGER trg_coverage_resolutions_no_delete BEFORE DELETE ON coverage_resolutions BEGIN SELECT RAISE(ABORT,'coverage resolutions are immutable'); END;
CREATE TRIGGER trg_brain_conclusions_no_update BEFORE UPDATE ON brain_conclusions BEGIN SELECT RAISE(ABORT,'brain conclusions are immutable'); END;
CREATE TRIGGER trg_brain_conclusions_no_delete BEFORE DELETE ON brain_conclusions BEGIN SELECT RAISE(ABORT,'brain conclusions are immutable'); END;
CREATE TRIGGER trg_internal_candidates_no_update BEFORE UPDATE ON internal_candidates BEGIN SELECT RAISE(ABORT,'internal candidates are immutable'); END;
CREATE TRIGGER trg_internal_candidates_no_delete BEFORE DELETE ON internal_candidates BEGIN SELECT RAISE(ABORT,'internal candidates are immutable'); END;
