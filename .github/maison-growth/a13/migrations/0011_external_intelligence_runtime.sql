-- Maison Growth Engine · A13 External Intelligence Mesh runtime
-- Depends on A1 events foundation. D1 / SQLite-compatible.
PRAGMA foreign_keys = ON;

CREATE TABLE external_intelligence_control (
  control_id TEXT PRIMARY KEY CHECK (control_id='global'),
  kill_switch INTEGER NOT NULL DEFAULT 1 CHECK (kill_switch IN (0,1)),
  observe_only INTEGER NOT NULL DEFAULT 1 CHECK (observe_only IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_by TEXT NOT NULL DEFAULT 'migration'
);
INSERT INTO external_intelligence_control(control_id,kill_switch,observe_only)
VALUES('global',1,1);

CREATE TABLE external_intelligence_observations (
  observation_id TEXT PRIMARY KEY CHECK(length(observation_id)=40 AND substr(observation_id,1,4)='obs_'),
  event_id TEXT NOT NULL UNIQUE REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  task_key TEXT NOT NULL UNIQUE CHECK(length(task_key) BETWEEN 8 AND 200),
  provider_id TEXT NOT NULL CHECK(length(trim(provider_id)) BETWEEN 1 AND 80),
  model_id TEXT NULL CHECK(model_id IS NULL OR length(trim(model_id)) BETWEEN 1 AND 160),
  source_class TEXT NOT NULL CHECK(source_class IN ('ai_api','ai_web_grounded','public_web','user_contributed_memory')),
  territory_key TEXT NOT NULL CHECK(length(trim(territory_key)) BETWEEN 1 AND 80),
  prompt_fingerprint TEXT NOT NULL CHECK(length(prompt_fingerprint)=64 AND prompt_fingerprint NOT GLOB '*[^0-9a-f]*'),
  response_hash TEXT NOT NULL CHECK(length(response_hash)=64 AND response_hash NOT GLOB '*[^0-9a-f]*'),
  grounding_state TEXT NOT NULL CHECK(grounding_state IN ('grounded','ungrounded')),
  response_excerpt TEXT NOT NULL CHECK(length(response_excerpt) BETWEEN 1 AND 9000),
  citations_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(citations_json)),
  usage_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(usage_json)),
  provider_request_id TEXT NULL CHECK(provider_request_id IS NULL OR length(provider_request_id) <= 200),
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_extel_territory_time ON external_intelligence_observations(territory_key,observed_at);
CREATE INDEX idx_extel_provider_time ON external_intelligence_observations(provider_id,observed_at);
CREATE INDEX idx_extel_grounding_time ON external_intelligence_observations(grounding_state,observed_at);

CREATE TABLE external_intelligence_evidence_roots (
  root_url TEXT PRIMARY KEY CHECK(length(root_url) BETWEEN 8 AND 2048),
  root_domain TEXT NOT NULL CHECK(length(trim(root_domain)) BETWEEN 1 AND 253),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
) WITHOUT ROWID;
CREATE INDEX idx_extel_root_domain ON external_intelligence_evidence_roots(root_domain,last_seen_at);

CREATE TABLE external_intelligence_observation_roots (
  observation_id TEXT NOT NULL REFERENCES external_intelligence_observations(observation_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  root_url TEXT NOT NULL REFERENCES external_intelligence_evidence_roots(root_url) ON DELETE RESTRICT ON UPDATE RESTRICT,
  PRIMARY KEY(observation_id,root_url)
) WITHOUT ROWID;

CREATE TABLE external_intelligence_daily_usage (
  usage_date TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0 CHECK(calls >= 0),
  failures INTEGER NOT NULL DEFAULT 0 CHECK(failures >= 0 AND failures <= calls),
  reported_cost_usd REAL NOT NULL DEFAULT 0 CHECK(reported_cost_usd >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(usage_date,provider_id)
) WITHOUT ROWID;

CREATE VIEW external_intelligence_brain_feed AS
SELECT
  o.territory_key,
  substr(o.observed_at,1,10) AS observed_day,
  COUNT(DISTINCT o.provider_id) AS provider_count,
  COUNT(DISTINCT CASE WHEN o.grounding_state='grounded' THEN r.root_url END) AS independent_evidence_root_count,
  COUNT(*) AS observation_count,
  MAX(o.observed_at) AS latest_observed_at
FROM external_intelligence_observations o
LEFT JOIN external_intelligence_observation_roots r ON r.observation_id=o.observation_id
GROUP BY o.territory_key,substr(o.observed_at,1,10);

CREATE TRIGGER trg_extel_observations_no_update BEFORE UPDATE ON external_intelligence_observations
BEGIN SELECT RAISE(ABORT,'A13 observations are append-only'); END;
CREATE TRIGGER trg_extel_observations_no_delete BEFORE DELETE ON external_intelligence_observations
BEGIN SELECT RAISE(ABORT,'A13 observations are append-only'); END;
CREATE TRIGGER trg_extel_observation_roots_no_update BEFORE UPDATE ON external_intelligence_observation_roots
BEGIN SELECT RAISE(ABORT,'A13 observation roots are append-only'); END;
CREATE TRIGGER trg_extel_observation_roots_no_delete BEFORE DELETE ON external_intelligence_observation_roots
BEGIN SELECT RAISE(ABORT,'A13 observation roots are append-only'); END;

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_growth_a13_schema_version','A13.2');
