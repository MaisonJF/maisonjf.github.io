-- 0024: specialist Ocean registry extensions.
-- Foundational Oceans remain versioned in ocean_catalog.js; this D1 table holds
-- only additional Oceans explicitly approved through the private candidate queue.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ocean_specialist_registry (
  ocean_key TEXT PRIMARY KEY CHECK(length(trim(ocean_key)) BETWEEN 2 AND 160),
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 3 AND 120),
  pillar_key TEXT NOT NULL CHECK(length(trim(pillar_key)) BETWEEN 2 AND 120),
  mission TEXT NOT NULL CHECK(length(trim(mission)) BETWEEN 20 AND 1200),
  focus_json TEXT NOT NULL CHECK(json_valid(focus_json)),
  connections_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(connections_json)),
  lifecycle_state TEXT NOT NULL DEFAULT 'open'
    CHECK(lifecycle_state IN ('open','paused','archived')),
  source_candidate_id TEXT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ocean_specialist_registry_pillar_state
  ON ocean_specialist_registry(pillar_key,lifecycle_state,created_at);

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_ocean_specialist_registry_schema_version','OCEAN.2')
ON CONFLICT(schema_key) DO UPDATE SET schema_value=excluded.schema_value;

-- Candidate schema extensions are handled in 0025_expand_candidate_types.sql.
