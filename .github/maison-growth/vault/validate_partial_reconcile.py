#!/usr/bin/env python3
import pathlib, sqlite3

ROOT=pathlib.Path(__file__).resolve().parent
RECONCILE=ROOT/"0001b_reconcile_partial_vault.sql"
V2=ROOT/"0002_experience_engine.sql"

EARLY_SCHEMA=r"""
PRAGMA foreign_keys=ON;
CREATE TABLE vault_game_session_cards (
  game_session_id TEXT NOT NULL,
  pack TEXT NOT NULL,
  position INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  PRIMARY KEY (game_session_id, pack, position),
  UNIQUE (game_session_id, question_id)
);
CREATE TABLE vault_game_sessions (
  game_session_id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  buyer_key TEXT NOT NULL,
  theme TEXT NOT NULL,
  seed TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);
CREATE TABLE vault_questions (
  question_id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL,
  theme TEXT NOT NULL,
  text TEXT NOT NULL,
  class TEXT NOT NULL,
  stage TEXT NOT NULL,
  intensity INTEGER NOT NULL,
  exposure TEXT NOT NULL,
  status TEXT NOT NULL,
  scores_json TEXT NOT NULL DEFAULT '{}',
  conflicts_json TEXT NOT NULL DEFAULT '[]',
  pairs_json TEXT NOT NULL DEFAULT '[]',
  similarity_group TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  subthemes_json TEXT NOT NULL DEFAULT '[]',
  direction TEXT,
  time_scope TEXT,
  viral_json TEXT NOT NULL DEFAULT '{}'
);
"""

def cols(db, table):
    return {r[1] for r in db.execute(f"PRAGMA table_info({table})")}

def main():
    db=sqlite3.connect(":memory:")
    db.executescript(EARLY_SCHEMA)
    for i in range(85):
        db.execute(
          """INSERT INTO vault_questions
          (question_id,canonical_key,theme,text,class,stage,intensity,exposure,status)
          VALUES(?,?,?,?,?,?,?,?,?)""",
          (f"q_{i:03d}",f"k_{i:03d}","relacoes",f"Pergunta {i}?","mirror","open",1,"paid","active")
        )
    before=db.execute("SELECT COUNT(*) FROM vault_questions").fetchone()[0]
    db.executescript(RECONCILE.read_text(encoding="utf-8"))
    after=db.execute("SELECT COUNT(*) FROM vault_questions").fetchone()[0]
    assert before==after==85
    assert {"source_kind","replaces_question_id","retired_at"} <= cols(db,"vault_questions")
    assert db.execute("SELECT meta_value FROM vault_meta WHERE meta_key='schema_version'").fetchone()[0]=="vault_v1"
    for table in ["vault_oracle_blocks","vault_question_metrics","vault_rewards"]:
        assert db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone()

    db.executescript(V2.read_text(encoding="utf-8"))
    assert db.execute("SELECT COUNT(*) FROM vault_questions").fetchone()[0]==85
    assert db.execute("SELECT meta_value FROM vault_meta WHERE meta_key='schema_version'").fetchone()[0]=="vault_v2"
    states=db.execute("SELECT DISTINCT lifecycle_state,rotation_state FROM vault_questions").fetchall()
    assert states==[("live","normal")], states
    for table in [
      "vault_taxonomy_nodes","vault_editorial_decisions","vault_content_needs",
      "vault_oracle_sessions","vault_oracle_session_blocks",
      "vault_oracle_block_metrics","vault_experience_signals"
    ]:
        assert db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone()
    print("Partial vault -> v1 -> v2: OK (85 questions preserved)")

if __name__=="__main__":
    main()
