-- MAISON JF® · Private Brain Vault
-- D1 / SQLite-compatible. This schema is safe to keep public; paid bodies live only in D1.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_meta (
  meta_key TEXT PRIMARY KEY,
  meta_value TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) WITHOUT ROWID;

INSERT OR REPLACE INTO vault_meta(meta_key,meta_value)
VALUES ('schema_version','vault_v1');

CREATE TABLE IF NOT EXISTS vault_questions (
  question_id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL,
  theme TEXT NOT NULL,
  text TEXT NOT NULL,
  subthemes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(subthemes_json)),
  class TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('open','recognize','deepen','touch','close','signature')),
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 4),
  direction TEXT NULL CHECK (direction IS NULL OR direction IN ('me_to_you','you_to_me','mutual','either')),
  time_scope TEXT NULL CHECK (time_scope IS NULL OR time_scope IN ('past','present','future','timeless')),
  exposure TEXT NOT NULL CHECK (exposure IN ('public_social','paid','reward','internal_test')),
  status TEXT NOT NULL CHECK (status IN ('candidate','review','approved','active','retired')),
  scores_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(scores_json)),
  viral_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(viral_json)),
  conflicts_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(conflicts_json)),
  pairs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(pairs_json)),
  similarity_group TEXT NULL,
  source_kind TEXT NOT NULL DEFAULT 'human_editorial',
  replaces_question_id TEXT NULL REFERENCES vault_questions(question_id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  retired_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_questions_pool
  ON vault_questions(theme,status,exposure,stage,intensity);
CREATE INDEX IF NOT EXISTS idx_vault_questions_canonical
  ON vault_questions(canonical_key);

-- Text and editorial identity are immutable after insertion.
CREATE TRIGGER IF NOT EXISTS trg_vault_questions_immutable_content
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
  coalesce(OLD.time_scope,'') <> coalesce(NEW.time_scope,'')
BEGIN
  SELECT RAISE(ABORT,'vault question content is immutable; insert a new version');
END;

CREATE TABLE IF NOT EXISTS vault_oracle_blocks (
  block_id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL,
  territory TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('opening','recognition','tension','counterpoint','reframe','movement','close')),
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 4),
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('candidate','review','approved','active','retired')),
  compatibility_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(compatibility_json)),
  scores_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(scores_json)),
  source_kind TEXT NOT NULL DEFAULT 'human_editorial',
  replaces_block_id TEXT NULL REFERENCES vault_oracle_blocks(block_id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  retired_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_oracle_pool
  ON vault_oracle_blocks(territory,status,role,intensity);

CREATE TRIGGER IF NOT EXISTS trg_vault_oracle_immutable_content
BEFORE UPDATE ON vault_oracle_blocks
WHEN
  OLD.block_id <> NEW.block_id OR
  OLD.canonical_key <> NEW.canonical_key OR
  OLD.territory <> NEW.territory OR
  OLD.role <> NEW.role OR
  OLD.intensity <> NEW.intensity OR
  OLD.text <> NEW.text
BEGIN
  SELECT RAISE(ABORT,'vault oracle content is immutable; insert a new version');
END;

CREATE TABLE IF NOT EXISTS vault_game_sessions (
  game_session_id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  buyer_key TEXT NOT NULL,
  theme TEXT NOT NULL,
  seed TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','revoked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_sessions_buyer_theme
  ON vault_game_sessions(buyer_key,theme,created_at);

CREATE TABLE IF NOT EXISTS vault_game_session_cards (
  game_session_id TEXT NOT NULL REFERENCES vault_game_sessions(game_session_id) ON DELETE CASCADE,
  pack TEXT NOT NULL CHECK (pack IN ('A','B')),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 14),
  question_id TEXT NOT NULL REFERENCES vault_questions(question_id) ON DELETE RESTRICT,
  PRIMARY KEY (game_session_id,pack,position),
  UNIQUE (game_session_id,question_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_vault_session_cards_question
  ON vault_game_session_cards(question_id);

CREATE TABLE IF NOT EXISTS vault_question_metrics (
  question_id TEXT PRIMARY KEY REFERENCES vault_questions(question_id) ON DELETE RESTRICT,
  shown_count INTEGER NOT NULL DEFAULT 0 CHECK (shown_count >= 0),
  advanced_count INTEGER NOT NULL DEFAULT 0 CHECK (advanced_count >= 0),
  passed_count INTEGER NOT NULL DEFAULT 0 CHECK (passed_count >= 0),
  shared_count INTEGER NOT NULL DEFAULT 0 CHECK (shared_count >= 0),
  completed_session_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_session_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS vault_rewards (
  reward_id TEXT PRIMARY KEY,
  buyer_key TEXT NOT NULL,
  game_session_id TEXT NULL REFERENCES vault_game_sessions(game_session_id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('card29','mini_pack','credit','early_access','other')),
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','redeemed','expired','revoked')),
  issued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  redeemed_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_rewards_buyer
  ON vault_rewards(buyer_key,status,issued_at);
