-- 0022: Ocean working memory in D1
-- Live Ocean intake must not depend on GitHub writes. Signals enter first; stronger
-- gates remain downstream for canonical promotion/publication.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ocean_memory_signals (
  signal_id TEXT PRIMARY KEY CHECK(length(signal_id)=40 AND substr(signal_id,1,4)='oms_'),
  ocean_key TEXT NOT NULL CHECK(length(trim(ocean_key)) BETWEEN 2 AND 160),
  canonical_ocean_id TEXT NULL CHECK(canonical_ocean_id IS NULL OR length(trim(canonical_ocean_id)) BETWEEN 2 AND 160),
  signal_kind TEXT NOT NULL CHECK(signal_kind IN ('signal','enrichment','hypothesis')),
  source_ref TEXT NOT NULL CHECK(length(trim(source_ref)) BETWEEN 1 AND 2048),
  source_observation_id TEXT NULL REFERENCES external_intelligence_observations(observation_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  summary TEXT NOT NULL CHECK(length(trim(summary)) BETWEEN 1 AND 4000),
  evidence_roots_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence_roots_json)),
  theme_candidates_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(theme_candidates_json)),
  commercial_adjacency_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(commercial_adjacency_json)),
  relevance_score INTEGER NOT NULL DEFAULT 0 CHECK(relevance_score BETWEEN 0 AND 100),
  commercial_score INTEGER NOT NULL DEFAULT 0 CHECK(commercial_score BETWEEN 0 AND 100),
  payload_hash TEXT NOT NULL UNIQUE CHECK(length(payload_hash)=64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ocean_memory_signals_ocean_time
  ON ocean_memory_signals(ocean_key,observed_at);
CREATE INDEX IF NOT EXISTS idx_ocean_memory_signals_kind_time
  ON ocean_memory_signals(signal_kind,observed_at);

CREATE TABLE IF NOT EXISTS ocean_memory_state (
  ocean_key TEXT PRIMARY KEY CHECK(length(trim(ocean_key)) BETWEEN 2 AND 160),
  canonical_ocean_id TEXT NULL CHECK(canonical_ocean_id IS NULL OR length(trim(canonical_ocean_id)) BETWEEN 2 AND 160),
  lifecycle_state TEXT NOT NULL DEFAULT 'provisional'
    CHECK(lifecycle_state IN ('provisional','existing','reinforced','review_ready','dismissed')),
  signal_count INTEGER NOT NULL DEFAULT 0 CHECK(signal_count >= 0),
  independent_evidence_count INTEGER NOT NULL DEFAULT 0 CHECK(independent_evidence_count >= 0),
  max_relevance_score INTEGER NOT NULL DEFAULT 0 CHECK(max_relevance_score BETWEEN 0 AND 100),
  max_commercial_score INTEGER NOT NULL DEFAULT 0 CHECK(max_commercial_score BETWEEN 0 AND 100),
  latest_summary TEXT NOT NULL DEFAULT '',
  latest_theme_candidates_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(latest_theme_candidates_json)),
  latest_commercial_adjacency_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(latest_commercial_adjacency_json)),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  promotion_gate_state TEXT NOT NULL DEFAULT 'observe'
    CHECK(promotion_gate_state IN ('observe','review','eligible')),
  snapshot_state TEXT NOT NULL DEFAULT 'pending'
    CHECK(snapshot_state IN ('pending','synced','error')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ocean_memory_alerts (
  alert_id TEXT PRIMARY KEY CHECK(length(alert_id)=40 AND substr(alert_id,1,4)='oma_'),
  ocean_key TEXT NOT NULL REFERENCES ocean_memory_state(ocean_key) ON DELETE RESTRICT ON UPDATE RESTRICT,
  signal_id TEXT NOT NULL REFERENCES ocean_memory_signals(signal_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  alert_kind TEXT NOT NULL CHECK(alert_kind IN ('enrichment','new_hypothesis','reinforced','commercial_opportunity')),
  priority INTEGER NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 100),
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(payload_json)),
  delivery_state TEXT NOT NULL DEFAULT 'pending'
    CHECK(delivery_state IN ('pending','delivered','suppressed')),
  created_at TEXT NOT NULL,
  delivered_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_ocean_memory_alerts_pending
  ON ocean_memory_alerts(delivery_state,priority DESC,created_at);

CREATE VIEW IF NOT EXISTS brain_ocean_memory_feed AS
SELECT
  s.ocean_key,s.canonical_ocean_id,s.lifecycle_state,s.signal_count,
  s.independent_evidence_count,s.max_relevance_score,s.max_commercial_score,
  s.latest_summary,s.latest_theme_candidates_json,s.latest_commercial_adjacency_json,
  s.first_seen_at,s.last_seen_at,s.promotion_gate_state,s.snapshot_state,
  (
    SELECT COUNT(*)
    FROM ocean_memory_alerts a
    WHERE a.ocean_key=s.ocean_key AND a.delivery_state='pending'
  ) AS pending_alert_count
FROM ocean_memory_state s;

CREATE TRIGGER IF NOT EXISTS trg_ocean_memory_signals_no_update
BEFORE UPDATE ON ocean_memory_signals
BEGIN SELECT RAISE(ABORT,'Ocean memory signals are append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_ocean_memory_signals_no_delete
BEFORE DELETE ON ocean_memory_signals
BEGIN SELECT RAISE(ABORT,'Ocean memory signals are append-only'); END;

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_ocean_memory_schema_version','OCEAN.1')
ON CONFLICT(schema_key) DO UPDATE SET schema_value=excluded.schema_value;
