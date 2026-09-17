-- Maison Growth Engine · A4 Mapa Vivo Core + Radar
-- D1 / SQLite-compatible migration 0003
-- Depends on A1.1 + A3.1. Never required by the public Maison site.
PRAGMA foreign_keys = ON;

CREATE TABLE needs (
    need_id TEXT PRIMARY KEY CHECK (length(need_id)=40 AND substr(need_id,1,4)='ned_'),
    need_key TEXT NOT NULL UNIQUE CHECK (length(trim(need_key)) BETWEEN 1 AND 160 AND need_key=lower(need_key)),
    canonical_label TEXT NOT NULL CHECK (length(trim(canonical_label)) BETWEEN 1 AND 300),
    territory_key TEXT NULL CHECK (territory_key IS NULL OR length(trim(territory_key)) BETWEEN 1 AND 120),
    internal_state TEXT NOT NULL DEFAULT 'observe'
      CHECK (internal_state IN ('observe','covered','partial','gap','future_candidate','archived')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE TABLE intents (
    intent_id TEXT PRIMARY KEY CHECK (length(intent_id)=40 AND substr(intent_id,1,4)='int_'),
    need_id TEXT NOT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_key TEXT NOT NULL CHECK (length(trim(intent_key)) BETWEEN 1 AND 180 AND intent_key=lower(intent_key)),
    canonical_label TEXT NOT NULL CHECK (length(trim(canonical_label)) BETWEEN 1 AND 300),
    semantic_fingerprint TEXT NOT NULL UNIQUE
      CHECK (length(semantic_fingerprint)=64 AND semantic_fingerprint NOT GLOB '*[^0-9a-f]*'),
    internal_state TEXT NOT NULL DEFAULT 'observe'
      CHECK (internal_state IN ('observe','covered','partial','gap','future_candidate','archived')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    UNIQUE (need_id, intent_key)
);
CREATE INDEX idx_intents_need ON intents(need_id, internal_state);

CREATE TABLE assets (
    asset_id TEXT PRIMARY KEY CHECK (length(asset_id)=40 AND substr(asset_id,1,4)='ast_'),
    asset_key TEXT NOT NULL UNIQUE CHECK (length(trim(asset_key)) BETWEEN 1 AND 200 AND asset_key=lower(asset_key)),
    asset_type TEXT NOT NULL CHECK (asset_type IN (
      'ocean','response','test','page','product_page','service_page','b2b_page','company_page','oracle_entry','internal'
    )),
    public_path TEXT NULL CHECK (public_path IS NULL OR (substr(public_path,1,1)='/' AND instr(public_path,'://')=0)),
    status TEXT NOT NULL CHECK (status IN ('planned','active','paused','retired','internal')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 160),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);
CREATE UNIQUE INDEX idx_assets_public_path ON assets(public_path) WHERE public_path IS NOT NULL;

CREATE TABLE map_evidence (
    evidence_id TEXT PRIMARY KEY CHECK (length(evidence_id)=40 AND substr(evidence_id,1,4)='evd_'),
    source TEXT NOT NULL CHECK (source IN ('gsc','site','test','oracle','commerce','journey','economics','manual','system')),
    source_event_id TEXT NULL REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    journey_id TEXT NULL CHECK (journey_id IS NULL OR (length(journey_id)=40 AND substr(journey_id,1,4)='jrn_')),
    evidence_kind TEXT NOT NULL CHECK (evidence_kind IN (
      'demand','engagement','conversion','coverage','solution_usage','absence','relationship','economic'
    )),
    observed_at TEXT NOT NULL,
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    confidence_class TEXT NOT NULL CHECK (confidence_class IN ('low','medium','high','observed')),
    payload_hash TEXT NOT NULL CHECK (length(payload_hash)=64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
    facts_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(facts_json)),
    created_at TEXT NOT NULL,
    UNIQUE(source, source_event_id, evidence_kind, payload_hash)
);
CREATE INDEX idx_evidence_journey ON map_evidence(journey_id, observed_at) WHERE journey_id IS NOT NULL;
CREATE INDEX idx_evidence_source ON map_evidence(source, observed_at);

CREATE TABLE need_asset_relations (
    relation_id TEXT PRIMARY KEY CHECK (length(relation_id)=40 AND substr(relation_id,1,4)='rel_'),
    need_id TEXT NOT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    asset_id TEXT NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    relation_role TEXT NOT NULL CHECK (relation_role IN ('primary','supporting','adjacent')),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('observed','active','retired')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    UNIQUE(need_id, asset_id, relation_role)
);
CREATE TABLE intent_asset_relations (
    relation_id TEXT PRIMARY KEY CHECK (length(relation_id)=40 AND substr(relation_id,1,4)='rel_'),
    intent_id TEXT NOT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    asset_id TEXT NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    relation_role TEXT NOT NULL CHECK (relation_role IN ('primary','supporting','adjacent')),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('observed','active','retired')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    UNIQUE(intent_id, asset_id, relation_role)
);
CREATE TABLE need_solution_relations (
    relation_id TEXT PRIMARY KEY CHECK (length(relation_id)=40 AND substr(relation_id,1,4)='rel_'),
    need_id TEXT NOT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    solution_id TEXT NOT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    relation_role TEXT NOT NULL CHECK (relation_role IN ('primary','supporting','adjacent')),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('observed','active','retired')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    UNIQUE(need_id, solution_id, relation_role)
);
CREATE TABLE intent_solution_relations (
    relation_id TEXT PRIMARY KEY CHECK (length(relation_id)=40 AND substr(relation_id,1,4)='rel_'),
    intent_id TEXT NOT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    solution_id TEXT NOT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    relation_role TEXT NOT NULL CHECK (relation_role IN ('primary','supporting','adjacent')),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('observed','active','retired')),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    UNIQUE(intent_id, solution_id, relation_role)
);

CREATE TABLE relation_evidence (
    relation_type TEXT NOT NULL CHECK (relation_type IN ('need_asset','intent_asset','need_solution','intent_solution','gap')),
    relation_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL REFERENCES map_evidence(evidence_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    PRIMARY KEY(relation_type, relation_id, evidence_id)
) WITHOUT ROWID;

CREATE TABLE coverage_assessments (
    coverage_id TEXT PRIMARY KEY CHECK (length(coverage_id)=40 AND substr(coverage_id,1,4)='cov_'),
    target_type TEXT NOT NULL CHECK (target_type IN ('need','intent')),
    target_id TEXT NOT NULL CHECK (length(target_id)=40),
    public_coverage TEXT NOT NULL CHECK (public_coverage IN ('none','partial','sufficient')),
    solution_coverage TEXT NOT NULL CHECK (solution_coverage IN ('none','partial','sufficient')),
    overall_state TEXT NOT NULL CHECK (overall_state IN ('observe','covered','partial','gap','future_candidate')),
    confidence_class TEXT NOT NULL CHECK (confidence_class IN ('low','medium','high','observed')),
    policy_version TEXT NOT NULL CHECK (length(trim(policy_version)) BETWEEN 1 AND 80),
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    rationale_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(rationale_json)),
    created_at TEXT NOT NULL,
    UNIQUE(target_type,target_id,policy_version,input_hash)
);
CREATE INDEX idx_coverage_target ON coverage_assessments(target_type,target_id,created_at);

CREATE TABLE coverage_gaps (
    gap_id TEXT PRIMARY KEY CHECK (length(gap_id)=40 AND substr(gap_id,1,4)='gap_'),
    need_id TEXT NOT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    gap_type TEXT NOT NULL CHECK (gap_type IN ('content','solution','journey','positioning')),
    status TEXT NOT NULL CHECK (status IN ('observe','confirmed','future_candidate','resolved')),
    confidence_class TEXT NOT NULL CHECK (confidence_class IN ('low','medium','high','observed')),
    evidence_summary_hash TEXT NOT NULL CHECK (length(evidence_summary_hash)=64 AND evidence_summary_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))
);
CREATE INDEX idx_gaps_need ON coverage_gaps(need_id,status,gap_type);

CREATE TABLE radar_signals (
    radar_signal_id TEXT PRIMARY KEY CHECK (length(radar_signal_id)=40 AND substr(radar_signal_id,1,4)='rad_'),
    evidence_id TEXT NOT NULL REFERENCES map_evidence(evidence_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source TEXT NOT NULL CHECK (source IN ('gsc','site','test','oracle','commerce')),
    signal_type TEXT NOT NULL CHECK (signal_type IN ('demand','engagement','conversion','solution_usage')),
    need_id TEXT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    intent_id TEXT NULL REFERENCES intents(intent_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    solution_id TEXT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    journey_id TEXT NULL CHECK (journey_id IS NULL OR (length(journey_id)=40 AND substr(journey_id,1,4)='jrn_')),
    occurred_at TEXT NOT NULL,
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    facts_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(facts_json)),
    UNIQUE(evidence_id,signal_type,need_id,intent_id,solution_id)
);
CREATE INDEX idx_radar_need_time ON radar_signals(need_id,occurred_at) WHERE need_id IS NOT NULL;
CREATE INDEX idx_radar_intent_time ON radar_signals(intent_id,occurred_at) WHERE intent_id IS NOT NULL;

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_growth_a4_schema_version','A4.1');

CREATE TRIGGER trg_needs_no_update BEFORE UPDATE ON needs BEGIN SELECT RAISE(ABORT,'needs are immutable in A4; append derived assessment instead'); END;
CREATE TRIGGER trg_needs_no_delete BEFORE DELETE ON needs BEGIN SELECT RAISE(ABORT,'needs are immutable'); END;
CREATE TRIGGER trg_intents_no_update BEFORE UPDATE ON intents BEGIN SELECT RAISE(ABORT,'intents are immutable in A4'); END;
CREATE TRIGGER trg_intents_no_delete BEFORE DELETE ON intents BEGIN SELECT RAISE(ABORT,'intents are immutable'); END;
CREATE TRIGGER trg_assets_no_update BEFORE UPDATE ON assets BEGIN SELECT RAISE(ABORT,'assets are immutable in A4'); END;
CREATE TRIGGER trg_assets_no_delete BEFORE DELETE ON assets BEGIN SELECT RAISE(ABORT,'assets are immutable'); END;
CREATE TRIGGER trg_map_evidence_no_update BEFORE UPDATE ON map_evidence BEGIN SELECT RAISE(ABORT,'map evidence is append-only'); END;
CREATE TRIGGER trg_map_evidence_no_delete BEFORE DELETE ON map_evidence BEGIN SELECT RAISE(ABORT,'map evidence is append-only'); END;
CREATE TRIGGER trg_coverage_no_update BEFORE UPDATE ON coverage_assessments BEGIN SELECT RAISE(ABORT,'coverage assessments are immutable'); END;
CREATE TRIGGER trg_coverage_no_delete BEFORE DELETE ON coverage_assessments BEGIN SELECT RAISE(ABORT,'coverage assessments are immutable'); END;
CREATE TRIGGER trg_gaps_no_update BEFORE UPDATE ON coverage_gaps BEGIN SELECT RAISE(ABORT,'coverage gaps are immutable facts'); END;
CREATE TRIGGER trg_gaps_no_delete BEFORE DELETE ON coverage_gaps BEGIN SELECT RAISE(ABORT,'coverage gaps are immutable'); END;
CREATE TRIGGER trg_radar_no_update BEFORE UPDATE ON radar_signals BEGIN SELECT RAISE(ABORT,'radar signals are immutable'); END;
CREATE TRIGGER trg_radar_no_delete BEFORE DELETE ON radar_signals BEGIN SELECT RAISE(ABORT,'radar signals are immutable'); END;
