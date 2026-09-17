-- Maison Growth Engine · A10 Ocean Promotion
-- D1 / SQLite-compatible migration 0008
-- Depends on A1.1 + A4.1 + A5.1 + A7.1 + A9.1. Never required by the public Maison site.
PRAGMA foreign_keys = ON;

CREATE TABLE ocean_promotion_runs (
    promotion_run_id TEXT PRIMARY KEY CHECK (length(promotion_run_id)=40 AND substr(promotion_run_id,1,4)='opm_'),
    internal_candidate_id TEXT NOT NULL REFERENCES internal_candidates(internal_candidate_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    decision_id TEXT NOT NULL REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    policy_version TEXT NOT NULL CHECK (length(trim(policy_version)) BETWEEN 1 AND 120),
    baseline_commit_sha TEXT NOT NULL CHECK (length(baseline_commit_sha)=40 AND baseline_commit_sha NOT GLOB '*[^0-9a-f]*'),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    runtime_publication_authorized INTEGER NOT NULL DEFAULT 0 CHECK (runtime_publication_authorized=0),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects=0),
    created_at TEXT NOT NULL,
    UNIQUE(internal_candidate_id,decision_id,input_hash)
);

CREATE TABLE ocean_promotion_state_events (
    promotion_state_event_id TEXT PRIMARY KEY CHECK (length(promotion_state_event_id)=40 AND substr(promotion_state_event_id,1,4)='ops_'),
    promotion_run_id TEXT NOT NULL REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    from_state TEXT NULL CHECK (from_state IS NULL OR from_state IN ('internal_candidate','promotion_candidate','promotion_eligible','draft_isolated','validated','publisher_validated','guard_passed','publication_ready','rejected','archived','reinforced','alias')),
    to_state TEXT NOT NULL CHECK (to_state IN ('internal_candidate','promotion_candidate','promotion_eligible','draft_isolated','validated','publisher_validated','guard_passed','publication_ready','rejected','archived','reinforced','alias')),
    reason_code TEXT NOT NULL CHECK (length(trim(reason_code)) BETWEEN 1 AND 160),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    occurred_at TEXT NOT NULL,
    actor_kind TEXT NOT NULL CHECK (actor_kind IN ('system_simulation','human','future_runtime')),
    details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
    CHECK (to_state <> 'public')
);
CREATE INDEX idx_ocean_promotion_state ON ocean_promotion_state_events(promotion_run_id,occurred_at);

CREATE TABLE ocean_promotion_evidence (
    promotion_evidence_id TEXT PRIMARY KEY CHECK (length(promotion_evidence_id)=40 AND substr(promotion_evidence_id,1,4)='ope_'),
    promotion_run_id TEXT NOT NULL REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    evidence_id TEXT NOT NULL,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('gsc','site','test','oracle_aggregate','commerce','journey','map','brain','manual_privacy_reviewed','fixture')),
    independent_group TEXT NOT NULL CHECK (length(trim(independent_group)) BETWEEN 1 AND 120),
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    observed_at TEXT NULL,
    evidence_hash TEXT NOT NULL CHECK (length(evidence_hash)=64 AND evidence_hash NOT GLOB '*[^0-9a-f]*'),
    UNIQUE(promotion_run_id,evidence_id)
);

CREATE TABLE ocean_promotion_gate_results (
    promotion_run_id TEXT NOT NULL REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    gate_ordinal INTEGER NOT NULL CHECK (gate_ordinal >= 1),
    gate_name TEXT NOT NULL,
    passed INTEGER NOT NULL CHECK (passed IN (0,1)),
    reason_code TEXT NOT NULL,
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    evaluated_at TEXT NOT NULL,
    PRIMARY KEY(promotion_run_id,gate_name),
    UNIQUE(promotion_run_id,gate_ordinal)
) WITHOUT ROWID;

CREATE TABLE ocean_promotion_scores (
    promotion_score_id TEXT PRIMARY KEY CHECK (length(promotion_score_id)=40 AND substr(promotion_score_id,1,4)='osc_'),
    promotion_run_id TEXT NOT NULL UNIQUE REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    components_json TEXT NOT NULL CHECK (json_valid(components_json)),
    threshold INTEGER NOT NULL CHECK (threshold BETWEEN 0 AND 100),
    all_hard_gates_passed INTEGER NOT NULL CHECK (all_hard_gates_passed=1),
    rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    scored_at TEXT NOT NULL
);

CREATE TABLE ocean_promotion_drafts (
    ocean_draft_id TEXT PRIMARY KEY CHECK (length(ocean_draft_id)=40 AND substr(ocean_draft_id,1,4)='odr_'),
    promotion_run_id TEXT NOT NULL UNIQUE REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 240),
    description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 500),
    intent_summary TEXT NOT NULL CHECK (length(trim(intent_summary)) BETWEEN 5 AND 1000),
    body_markdown TEXT NOT NULL CHECK (length(trim(body_markdown)) >= 50),
    proposed_content_root TEXT NOT NULL CHECK (proposed_content_root IN ('relacoes/','cabeca/','decisoes/','casa/','corpo/','companhia/','presentes/','tarot/','espiritualidade/','trabalho/','dinheiro/','respostas/')),
    proposed_slug TEXT NOT NULL CHECK (length(trim(proposed_slug)) BETWEEN 3 AND 120),
    approved_solution_id TEXT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    uses_paid_oracle_content INTEGER NOT NULL DEFAULT 0 CHECK (uses_paid_oracle_content=0),
    public_url_assigned INTEGER NOT NULL DEFAULT 0 CHECK (public_url_assigned=0),
    sitemap_authorized INTEGER NOT NULL DEFAULT 0 CHECK (sitemap_authorized=0),
    indexnow_authorized INTEGER NOT NULL DEFAULT 0 CHECK (indexnow_authorized=0),
    navigation_authorized INTEGER NOT NULL DEFAULT 0 CHECK (navigation_authorized=0),
    indexing_authorized INTEGER NOT NULL DEFAULT 0 CHECK (indexing_authorized=0),
    draft_hash TEXT NOT NULL CHECK (length(draft_hash)=64 AND draft_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL
);

CREATE TABLE ocean_promotion_validations (
    promotion_validation_id TEXT PRIMARY KEY CHECK (length(promotion_validation_id)=40 AND substr(promotion_validation_id,1,4)='ovl_'),
    promotion_run_id TEXT NOT NULL REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    validation_key TEXT NOT NULL CHECK (validation_key IN ('semantic_distinction','standalone_utility','coverage_gap','cannibalization_safe','commercial_adjacency','paid_oracle_safe','content_contract','link_validation','snapshot_match','publisher_allowlist','oceans_guard','rollback_exactness')),
    passed INTEGER NOT NULL CHECK (passed IN (0,1)),
    detail TEXT NOT NULL,
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    validated_at TEXT NOT NULL,
    UNIQUE(promotion_run_id,validation_key,validated_at)
);

CREATE TABLE ocean_publisher_links (
    ocean_publisher_link_id TEXT PRIMARY KEY CHECK (length(ocean_publisher_link_id)=40 AND substr(ocean_publisher_link_id,1,4)='opl_'),
    promotion_run_id TEXT NOT NULL UNIQUE REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    publish_run_id TEXT NOT NULL,
    publisher_mode TEXT NOT NULL CHECK (publisher_mode='dry_run'),
    publisher_diff_hash TEXT NOT NULL CHECK (length(publisher_diff_hash)=64 AND publisher_diff_hash NOT GLOB '*[^0-9a-f]*'),
    guard_conclusion TEXT NOT NULL CHECK (guard_conclusion IN ('success','failure','not_run')),
    rollback_plan_hash TEXT NOT NULL CHECK (length(rollback_plan_hash)=64 AND rollback_plan_hash NOT GLOB '*[^0-9a-f]*'),
    public_write_authorized INTEGER NOT NULL DEFAULT 0 CHECK (public_write_authorized=0),
    linked_at TEXT NOT NULL
);

INSERT INTO schema_state(schema_key,schema_value) VALUES ('maison_growth_a10_schema_version','A10.1');

CREATE TRIGGER trg_ocean_promotion_runs_no_update BEFORE UPDATE ON ocean_promotion_runs BEGIN SELECT RAISE(ABORT,'ocean promotion runs are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_runs_no_delete BEFORE DELETE ON ocean_promotion_runs BEGIN SELECT RAISE(ABORT,'ocean promotion runs are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_states_no_update BEFORE UPDATE ON ocean_promotion_state_events BEGIN SELECT RAISE(ABORT,'promotion state events are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_states_no_delete BEFORE DELETE ON ocean_promotion_state_events BEGIN SELECT RAISE(ABORT,'promotion state events are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_evidence_no_update BEFORE UPDATE ON ocean_promotion_evidence BEGIN SELECT RAISE(ABORT,'promotion evidence is immutable'); END;
CREATE TRIGGER trg_ocean_promotion_evidence_no_delete BEFORE DELETE ON ocean_promotion_evidence BEGIN SELECT RAISE(ABORT,'promotion evidence is immutable'); END;
CREATE TRIGGER trg_ocean_promotion_gates_no_update BEFORE UPDATE ON ocean_promotion_gate_results BEGIN SELECT RAISE(ABORT,'promotion gates are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_gates_no_delete BEFORE DELETE ON ocean_promotion_gate_results BEGIN SELECT RAISE(ABORT,'promotion gates are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_scores_no_update BEFORE UPDATE ON ocean_promotion_scores BEGIN SELECT RAISE(ABORT,'promotion scores are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_scores_no_delete BEFORE DELETE ON ocean_promotion_scores BEGIN SELECT RAISE(ABORT,'promotion scores are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_drafts_no_update BEFORE UPDATE ON ocean_promotion_drafts BEGIN SELECT RAISE(ABORT,'ocean drafts are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_drafts_no_delete BEFORE DELETE ON ocean_promotion_drafts BEGIN SELECT RAISE(ABORT,'ocean drafts are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_validations_no_update BEFORE UPDATE ON ocean_promotion_validations BEGIN SELECT RAISE(ABORT,'promotion validations are immutable'); END;
CREATE TRIGGER trg_ocean_promotion_validations_no_delete BEFORE DELETE ON ocean_promotion_validations BEGIN SELECT RAISE(ABORT,'promotion validations are immutable'); END;
CREATE TRIGGER trg_ocean_publisher_links_no_update BEFORE UPDATE ON ocean_publisher_links BEGIN SELECT RAISE(ABORT,'publisher links are immutable'); END;
CREATE TRIGGER trg_ocean_publisher_links_no_delete BEFORE DELETE ON ocean_publisher_links BEGIN SELECT RAISE(ABORT,'publisher links are immutable'); END;
