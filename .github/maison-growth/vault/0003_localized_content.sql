-- MAISON JF® · Localized paid content / Private Brain Vault v3
-- Keeps one canonical content identity and attaches PT-BR/EN/ES renderings to it.
-- Existing PT-PT bodies remain canonical in vault_questions.text / vault_oracle_blocks.text.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_question_translations (
  question_id TEXT NOT NULL REFERENCES vault_questions(question_id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','review','approved','active','retired')),
  source_kind TEXT NOT NULL DEFAULT 'brain_localization',
  quality_version TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  activated_at TEXT NULL,
  retired_at TEXT NULL,
  PRIMARY KEY (question_id,locale)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_vault_question_translations_live
  ON vault_question_translations(locale,status,question_id);

CREATE TRIGGER IF NOT EXISTS trg_vault_question_translation_immutable_active
BEFORE UPDATE ON vault_question_translations
WHEN OLD.status IN ('approved','active','retired') AND OLD.text <> NEW.text
BEGIN
  SELECT RAISE(ABORT,'active question translation text is immutable; replace the canonical content version');
END;

CREATE TABLE IF NOT EXISTS vault_oracle_block_translations (
  block_id TEXT NOT NULL REFERENCES vault_oracle_blocks(block_id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','review','approved','active','retired')),
  source_kind TEXT NOT NULL DEFAULT 'brain_localization',
  quality_version TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  activated_at TEXT NULL,
  retired_at TEXT NULL,
  PRIMARY KEY (block_id,locale)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_vault_oracle_translations_live
  ON vault_oracle_block_translations(locale,status,block_id);

CREATE TRIGGER IF NOT EXISTS trg_vault_oracle_translation_immutable_active
BEFORE UPDATE ON vault_oracle_block_translations
WHEN OLD.status IN ('approved','active','retired')
 AND (OLD.text <> NEW.text OR coalesce(OLD.title,'') <> coalesce(NEW.title,''))
BEGIN
  SELECT RAISE(ABORT,'active oracle translation text is immutable; replace the canonical content version');
END;

ALTER TABLE vault_game_sessions
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'pt-PT';

ALTER TABLE vault_oracle_sessions
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'pt-PT';

CREATE INDEX IF NOT EXISTS idx_vault_game_sessions_locale
  ON vault_game_sessions(locale,theme,created_at);
CREATE INDEX IF NOT EXISTS idx_vault_oracle_sessions_locale
  ON vault_oracle_sessions(locale,territory,created_at);

INSERT OR REPLACE INTO vault_meta(meta_key,meta_value,recorded_at)
VALUES ('schema_version','vault_v3',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
