-- MAISON JF® · Vault localizer operational telemetry
-- Count-only observability. Never stores paid content bodies.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_localizer_telemetry (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  updated_at TEXT NOT NULL,
  last_locale TEXT NOT NULL,
  last_status TEXT NOT NULL CHECK (last_status IN ('success','error')),
  last_questions_activated INTEGER NOT NULL DEFAULT 0,
  last_oracle_activated INTEGER NOT NULL DEFAULT 0,
  pending_total INTEGER NOT NULL DEFAULT 0,
  pending_questions_pt_br INTEGER NOT NULL DEFAULT 0,
  pending_questions_en INTEGER NOT NULL DEFAULT 0,
  pending_questions_es INTEGER NOT NULL DEFAULT 0,
  pending_oracle_pt_br INTEGER NOT NULL DEFAULT 0,
  pending_oracle_en INTEGER NOT NULL DEFAULT 0,
  pending_oracle_es INTEGER NOT NULL DEFAULT 0
);

INSERT OR REPLACE INTO vault_meta(meta_key,meta_value,recorded_at)
VALUES ('localizer_telemetry_schema','v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
