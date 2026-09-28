#!/usr/bin/env python3
"""Validate the private Maison Vault migrations with local SQLite.

No paid body or production data is loaded here. This validates only schema,
rollout invariants, localization identity and immutability guarantees.
"""
from __future__ import annotations

import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parent
V1 = ROOT / "0001_private_content_vault.sql"
V2 = ROOT / "0002_experience_engine.sql"
V3 = ROOT / "0003_localized_content.sql"


def scalar(db: sqlite3.Connection, sql: str):
    row = db.execute(sql).fetchone()
    return row[0] if row else None


def main() -> None:
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")

    db.executescript(V1.read_text(encoding="utf-8"))

    db.execute(
        """INSERT INTO vault_questions
        (question_id,canonical_key,theme,text,class,stage,intensity,exposure,status)
        VALUES(?,?,?,?,?,?,?,?,?)""",
        (
            "q_test_live",
            "test-live-question",
            "relacoes",
            "Uma pergunta privada de teste?",
            "mirror",
            "open",
            1,
            "paid",
            "active",
        ),
    )
    db.execute(
        """INSERT INTO vault_oracle_blocks
        (block_id,canonical_key,territory,role,intensity,text,status)
        VALUES(?,?,?,?,?,?,?)""",
        (
            "ob_test_live",
            "test-live-oracle",
            "relacoes",
            "opening",
            1,
            "Um bloco privado de teste.",
            "active",
        ),
    )

    db.executescript(V2.read_text(encoding="utf-8"))
    assert scalar(db, "SELECT meta_value FROM vault_meta WHERE meta_key='schema_version'") == "vault_v2"

    q_state = db.execute(
        """SELECT lifecycle_state,rotation_state
           FROM vault_questions WHERE question_id='q_test_live'"""
    ).fetchone()
    assert q_state == ("live", "normal"), q_state

    o_state = db.execute(
        """SELECT lifecycle_state,rotation_state
           FROM vault_oracle_blocks WHERE block_id='ob_test_live'"""
    ).fetchone()
    assert o_state == ("live", "normal"), o_state

    expected_v2_tables = {
        "vault_taxonomy_nodes",
        "vault_editorial_decisions",
        "vault_content_needs",
        "vault_oracle_sessions",
        "vault_oracle_session_blocks",
        "vault_oracle_block_metrics",
        "vault_experience_signals",
    }
    actual_tables = {
        row[0]
        for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    }
    missing = expected_v2_tables - actual_tables
    assert not missing, f"missing v2 tables: {sorted(missing)}"

    try:
        db.execute("UPDATE vault_questions SET text='Mutated' WHERE question_id='q_test_live'")
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("question body mutation should be rejected")

    try:
        db.execute("UPDATE vault_oracle_blocks SET text='Mutated' WHERE block_id='ob_test_live'")
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("oracle block mutation should be rejected")

    db.execute("UPDATE vault_questions SET rotation_state='limited' WHERE question_id='q_test_live'")
    assert scalar(
        db,
        "SELECT rotation_state FROM vault_questions WHERE question_id='q_test_live'",
    ) == "limited"
    db.execute("UPDATE vault_questions SET rotation_state='normal' WHERE question_id='q_test_live'")

    db.execute(
        """INSERT INTO vault_content_needs
        (need_id,target_type,territory,stage_or_role,reason_code,priority)
        VALUES('need_test','oracle_block','relacoes','counterpoint','coverage_gap',80)"""
    )
    assert scalar(db, "SELECT priority FROM vault_content_needs WHERE need_id='need_test'") == 80

    db.executescript(V3.read_text(encoding="utf-8"))
    assert scalar(db, "SELECT meta_value FROM vault_meta WHERE meta_key='schema_version'") == "vault_v3"

    expected_v3_tables = {
        "vault_question_translations",
        "vault_oracle_block_translations",
    }
    actual_tables = {
        row[0]
        for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    }
    missing = expected_v3_tables - actual_tables
    assert not missing, f"missing v3 tables: {sorted(missing)}"

    game_locale = db.execute("PRAGMA table_info(vault_game_sessions)").fetchall()
    oracle_locale = db.execute("PRAGMA table_info(vault_oracle_sessions)").fetchall()
    assert any(row[1] == "locale" and row[4] == "'pt-PT'" for row in game_locale)
    assert any(row[1] == "locale" and row[4] == "'pt-PT'" for row in oracle_locale)

    db.execute(
        """INSERT INTO vault_question_translations
        (question_id,locale,text,status,quality_version)
        VALUES('q_test_live','en','A private test question?','active','test:v1')"""
    )
    db.execute(
        """INSERT INTO vault_question_translations
        (question_id,locale,text,status,quality_version)
        VALUES('q_test_live','es','¿Una pregunta privada de prueba?','active','test:v1')"""
    )
    db.execute(
        """INSERT INTO vault_oracle_block_translations
        (block_id,locale,title,text,status,quality_version)
        VALUES('ob_test_live','en','A reading','A private test block.','active','test:v1')"""
    )
    db.execute(
        """INSERT INTO vault_oracle_block_translations
        (block_id,locale,title,text,status,quality_version)
        VALUES('ob_test_live','es','Una apertura','Un bloque privado de prueba.','active','test:v1')"""
    )

    assert scalar(
        db,
        "SELECT COUNT(*) FROM vault_question_translations WHERE question_id='q_test_live'",
    ) == 2
    assert scalar(
        db,
        "SELECT COUNT(*) FROM vault_oracle_block_translations WHERE block_id='ob_test_live'",
    ) == 2

    try:
        db.execute(
            "UPDATE vault_question_translations SET text='Changed' "
            "WHERE question_id='q_test_live' AND locale='en'"
        )
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("active question translation mutation should be rejected")

    try:
        db.execute(
            "UPDATE vault_oracle_block_translations SET text='Changed' "
            "WHERE block_id='ob_test_live' AND locale='es'"
        )
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("active oracle translation mutation should be rejected")

    db.execute(
        """INSERT INTO vault_game_sessions
        (game_session_id,stripe_session_id,buyer_key,theme,seed,engine_version,status)
        VALUES('g_default','cs_live_default','buyer','relacoes','seed','engine','active')"""
    )
    assert scalar(
        db, "SELECT locale FROM vault_game_sessions WHERE game_session_id='g_default'"
    ) == "pt-PT"

    db.execute(
        """INSERT INTO vault_oracle_sessions
        (oracle_session_id,stripe_session_id,buyer_key,territory,seed,trajectory,tone,intensity,
         director_version,composer_version,quality_version,quality_json,status)
        VALUES('o_default','cs_live_oracle','buyer','relacoes','seed','direct','direct',1,
               'director','composer','quality','{}','active')"""
    )
    assert scalar(
        db, "SELECT locale FROM vault_oracle_sessions WHERE oracle_session_id='o_default'"
    ) == "pt-PT"

    print("Maison Vault v1 -> v2 -> v3 localization validation: OK")


if __name__ == "__main__":
    main()
