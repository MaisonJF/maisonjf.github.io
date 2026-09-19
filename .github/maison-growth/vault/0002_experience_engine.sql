-- MAISON JF® · Experience Engine / Private Brain Vault v2
-- Extends the private vault without exposing paid bodies in GitHub.
PRAGMA foreign_keys = ON;

ALTER TABLE vault_questions ADD COLUMN pain_family TEXT NULL;
ALTER TABLE vault_questions ADD COLUMN subterritory TEXT NULL;
ALTER TABLE vault_questions ADD COLUMN target TEXT NULL CHECK (target IS NULL OR target IN ('self','partner','both','prediction'));
ALTER TABLE vault_questions ADD COLUMN emotional_function TEXT NULL;
ALTER TABLE vault_questions ADD COLUMN cognitive_load INTEGER NULL CHECK (cognitive_load IS NULL OR cognitive_load BETWEEN 1 AND 5);
ALTER TABLE vault_questions ADD COLUMN vulnerability INTEGER NULL CHECK (vulnerability IS NULL OR vulnerability BETWEEN 1 AND 5);
ALTER TABLE vault_questions ADD COLUMN conflict_potential INTEGER NULL CHECK (conflict_potential IS NULL OR conflict_potential BETWEEN 1 AND 5);
ALTER TABLE vault_questions ADD COLUMN playfulness INTEGER NULL CHECK (playfulness IS NULL OR playfulness BETWEEN 1 AND 5);
ALTER TABLE vault_questions ADD COLUMN semantic_fingerprint TEXT NULL;
ALTER TABLE vault_questions ADD COLUMN compatibility_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(compatibility_json));
ALTER TABLE vault_questions ADD COLUMN product_fit_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(product_fit_json));
ALTER TABLE vault_questions ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'vault' CHECK (lifecycle_state IN ('candidate','lab','vault','live','review','retired'));
ALTER TABLE vault_questions ADD COLUMN rotation_state TEXT NOT NULL DEFAULT 'normal' CHECK (rotation_state IN ('new','limited','normal','review','retired'));
ALTER TABLE vault_questions ADD COLUMN source_ocean_id TEXT NULL;
ALTER TABLE vault_questions ADD COLUMN quality_version TEXT NULL;

-- Preserve material that was already live before v2.
UPDATE vault_questions
   SET lifecycle_state='live', rotation_state='normal'
 WHERE status='active' AND exposure='paid';

DROP TRIGGER IF EXISTS trg_vault_questions_immutable_content;
CREATE TRIGGER trg_vault_questions_immutable_content
BEFORE UPDATE ON vault_questions
WHEN
  OLD.question_id <> NEW.question_id OR
  OLD.canonical_key <> NEW.canonical_key OR
  OLD.theme <> NEW.theme OR
  OLD.text <> NEW.text OR
  OLD.subthemes_json <> NEW.subthemes_json OR
  OLD.class <> NEW.class OR
  OLD.stage <> NEW.stage OR
  OLD.intensity <> NEW.intensity OR
  coalesce(OLD.direction,'') <> coalesce(NEW.direction,'') OR
  coalesce(OLD.time_scope,'') <> coalesce(NEW.time_scope,'') OR
  coalesce(OLD.pain_family,'') <> coalesce(NEW.pain_family,'') OR
  coalesce(OLD.subterritory,'') <> coalesce(NEW.subterritory,'') OR
  coalesce(OLD.target,'') <> coalesce(NEW.target,'') OR
  coalesce(OLD.emotional_function,'') <> coalesce(NEW.emotional_function,'') OR
  coalesce(OLD.cognitive_load,-1) <> coalesce(NEW.cognitive_load,-1) OR
  coalesce(OLD.vulnerability,-1) <> coalesce(NEW.vulnerability,-1) OR
  coalesce(OLD.conflict_potential,-1) <> coalesce(NEW.conflict_potential,-1) OR
  coalesce(OLD.playfulness,-1) <> coalesce(NEW.playfulness,-1) OR
  coalesce(OLD.semantic_fingerprint,'') <> coalesce(NEW.semantic_fingerprint,'')
BEGIN
  SELECT RAISE(ABORT,'vault question content is immutable; insert a new version');
END;

CREATE INDEX IF NOT EXISTS idx_vault_questions_semantic
  ON vault_questions(semantic_fingerprint);
CREATE INDEX IF NOT EXISTS idx_vault_questions_lifecycle
  ON vault_questions(theme,lifecycle_state,rotation_state,stage);

ALTER TABLE vault_oracle_blocks ADD COLUMN title TEXT NULL;
ALTER TABLE vault_oracle_blocks ADD COLUMN pain_family TEXT NULL;
ALTER TABLE vault_oracle_blocks ADD COLUMN subterritory TEXT NULL;
ALTER TABLE vault_oracle_blocks ADD COLUMN tone TEXT NULL CHECK (tone IS NULL OR tone IN ('gentle','direct','intimate','clear','confrontational'));
ALTER TABLE vault_oracle_blocks ADD COLUMN emotional_function TEXT NULL;
ALTER TABLE vault_oracle_blocks ADD COLUMN semantic_fingerprint TEXT NULL;
ALTER TABLE vault_oracle_blocks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json));
ALTER TABLE vault_oracle_blocks ADD COLUMN product_fit_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(product_fit_json));
ALTER TABLE vault_oracle_blocks ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'vault' CHECK (lifecycle_state IN ('candidate','lab','vault','live','review','retired'));
ALTER TABLE vault_oracle_blocks ADD COLUMN rotation_state TEXT NOT NULL DEFAULT 'normal' CHECK (rotation_state IN ('new','limited','normal','review','retired'));
ALTER TABLE vault_oracle_blocks ADD COLUMN rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare'));
ALTER TABLE vault_oracle_blocks ADD COLUMN source_ocean_id TEXT NULL;
ALTER TABLE vault_oracle_blocks ADD COLUMN quality_version TEXT NULL;

UPDATE vault_oracle_blocks
   SET lifecycle_state='live', rotation_state='normal'
 WHERE status='active';

CREATE INDEX IF NOT EXISTS idx_vault_oracle_semantic
  ON vault_oracle_blocks(semantic_fingerprint);
CREATE INDEX IF NOT EXISTS idx_vault_oracle_lifecycle
  ON vault_oracle_blocks(territory,lifecycle_state,rotation_state,role);

DROP TRIGGER IF EXISTS trg_vault_oracle_immutable_content;
CREATE TRIGGER trg_vault_oracle_immutable_content
BEFORE UPDATE ON vault_oracle_blocks
WHEN
  OLD.block_id <> NEW.block_id OR
  OLD.canonical_key <> NEW.canonical_key OR
  OLD.territory <> NEW.territory OR
  OLD.role <> NEW.role OR
  OLD.intensity <> NEW.intensity OR
  OLD.text <> NEW.text OR
  coalesce(OLD.title,'') <> coalesce(NEW.title,'') OR
  coalesce(OLD.pain_family,'') <> coalesce(NEW.pain_family,'') OR
  coalesce(OLD.subterritory,'') <> coalesce(NEW.subterritory,'') OR
  coalesce(OLD.semantic_fingerprint,'') <> coalesce(NEW.semantic_fingerprint,'')
BEGIN
  SELECT RAISE(ABORT,'vault oracle content is immutable; insert a new version');
END;

CREATE TABLE IF NOT EXISTS vault_taxonomy_nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK (node_type IN ('pain_family','territory','subterritory')),
  parent_node_id TEXT NULL REFERENCES vault_taxonomy_nodes(node_id) ON DELETE RESTRICT,
  canonical_key TEXT NOT NULL,
  canonical_label TEXT NOT NULL,
  semantic_fingerprint TEXT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','review','approved','active','retired')),
  source_ocean_id TEXT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  retired_at TEXT NULL,
  UNIQUE(node_type,canonical_key)
);

CREATE INDEX IF NOT EXISTS idx_vault_taxonomy_parent
  ON vault_taxonomy_nodes(parent_node_id,status);
CREATE INDEX IF NOT EXISTS idx_vault_taxonomy_semantic
  ON vault_taxonomy_nodes(semantic_fingerprint);

CREATE TABLE IF NOT EXISTS vault_editorial_decisions (
  decision_id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('question','oracle_block','taxonomy','content_need')),
  content_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('propose','approve','activate','limit','review','retire','reject','merge','promote')),
  reason_code TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
  engine_version TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_vault_editorial_decisions_content
  ON vault_editorial_decisions(content_type,content_id,created_at);

CREATE TABLE IF NOT EXISTS vault_content_needs (
  need_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('question','oracle_block','taxonomy')),
  territory TEXT NULL,
  subterritory TEXT NULL,
  stage_or_role TEXT NULL,
  tone TEXT NULL,
  intensity_min INTEGER NULL CHECK (intensity_min IS NULL OR intensity_min BETWEEN 1 AND 5),
  intensity_max INTEGER NULL CHECK (intensity_max IS NULL OR intensity_max BETWEEN 1 AND 5),
  reason_code TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','satisfied','dismissed')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolved_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_content_needs_open
  ON vault_content_needs(status,target_type,territory,priority);

CREATE TABLE IF NOT EXISTS vault_oracle_sessions (
  oracle_session_id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  buyer_key TEXT NOT NULL,
  territory TEXT NOT NULL,
  seed TEXT NOT NULL,
  trajectory TEXT NOT NULL,
  tone TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 5),
  director_version TEXT NOT NULL,
  composer_version TEXT NOT NULL,
  quality_version TEXT NOT NULL,
  quality_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(quality_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','revoked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_oracle_sessions_buyer
  ON vault_oracle_sessions(buyer_key,territory,created_at);

CREATE TABLE IF NOT EXISTS vault_oracle_session_blocks (
  oracle_session_id TEXT NOT NULL REFERENCES vault_oracle_sessions(oracle_session_id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 10),
  role TEXT NOT NULL,
  block_id TEXT NOT NULL REFERENCES vault_oracle_blocks(block_id) ON DELETE RESTRICT,
  PRIMARY KEY (oracle_session_id,position),
  UNIQUE (oracle_session_id,block_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_vault_oracle_session_blocks_block
  ON vault_oracle_session_blocks(block_id);

CREATE TABLE IF NOT EXISTS vault_oracle_block_metrics (
  block_id TEXT PRIMARY KEY REFERENCES vault_oracle_blocks(block_id) ON DELETE RESTRICT,
  served_count INTEGER NOT NULL DEFAULT 0 CHECK (served_count >= 0),
  completed_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
  reopened_count INTEGER NOT NULL DEFAULT 0 CHECK (reopened_count >= 0),
  shared_count INTEGER NOT NULL DEFAULT 0 CHECK (shared_count >= 0),
  quality_failure_count INTEGER NOT NULL DEFAULT 0 CHECK (quality_failure_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS vault_experience_signals (
  signal_id TEXT PRIMARY KEY,
  product TEXT NOT NULL CHECK (product IN ('oracle','para_de_ignorar')),
  event_type TEXT NOT NULL CHECK (event_type IN ('served','advanced','passed','completed','reopened','shared','repurchased','quality_failed')),
  content_type TEXT NULL CHECK (content_type IS NULL OR content_type IN ('question','oracle_block','session')),
  content_id TEXT NULL,
  buyer_key TEXT NULL,
  territory TEXT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_vault_experience_signals_product
  ON vault_experience_signals(product,event_type,occurred_at);

INSERT OR REPLACE INTO vault_meta(meta_key,meta_value,recorded_at)
VALUES ('schema_version','vault_v2',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
