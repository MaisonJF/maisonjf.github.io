-- 0025: expandable, human-governed Ocean pillar registry.
-- Foundational pillars live in ocean_catalog.js. This table allows genuinely new
-- connected pillars to be approved and used without a source-code release.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ocean_pillar_registry (
  pillar_key TEXT PRIMARY KEY CHECK(length(trim(pillar_key)) BETWEEN 2 AND 160),
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 3 AND 120),
  mission TEXT NOT NULL CHECK(length(trim(mission)) BETWEEN 30 AND 1200),
  focus_json TEXT NOT NULL CHECK(json_valid(focus_json)),
  connections_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(connections_json)),
  parent_pillars_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(parent_pillars_json)),
  lifecycle_state TEXT NOT NULL DEFAULT 'open'
    CHECK(lifecycle_state IN ('open','paused','archived')),
  source_candidate_id TEXT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ocean_pillar_registry_state
  ON ocean_pillar_registry(lifecycle_state,created_at,pillar_key);

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_ocean_pillar_registry_schema_version','PILLAR.1')
ON CONFLICT(schema_key) DO UPDATE SET schema_value=excluded.schema_value;
