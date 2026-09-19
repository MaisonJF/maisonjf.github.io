#!/usr/bin/env python3
"""Validate the private Maison Vault migrations with local SQLite.

No paid body or production data is loaded here. This validates only schema,
rollout invariants and immutability guarantees.
"""
from __future__ import annotations

import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parent
V1 = ROOT / "0001_private_content_vault.sql"
V2 = ROOT / "0002_experience_engine.sql"


def scalar(db: sqlite3.Connection, sql: str):
    row = db.execute(sql).fetchone()
    return row[0] if row else None


def main() -> None:
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")

    db.executescript(V1.read_text(encoding="utf-8"))

    # Representative already-live material, inserted before the v2 rollout.
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

    assert scalar(
        db, "SELECT meta_value FROM vault_meta WHERE meta_key='schema_version'"
    ) == "vault_v2"

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

    expected_tables = {
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
        for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    missing = expected_tables - actual_tables
    assert not missing, f"missing v2 tables: {sorted(missing)}"

    # Core paid editorial identity/content must remain immutable.
    try:
        db.execute(
            "UPDATE vault_questions SET text='Mutated' WHERE question_id='q_test_live'"
        )
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("question body mutation should be rejected")

    try:
        db.execute(
            "UPDATE vault_oracle_blocks SET text='Mutated' WHERE block_id='ob_test_live'"
        )
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("oracle block mutation should be rejected")

    # Operational states are intentionally mutable.
    db.execute(
        "UPDATE vault_questions SET rotation_state='limited' WHERE question_id='q_test_live'"
    )
    assert scalar(
        db,
        "SELECT rotation_state FROM vault_questions WHERE question_id='q_test_live'",
    ) == "limited"

    # The new tables accept representative safe metadata without answer text.
    db.execute(
        """INSERT INTO vault_content_needs
        (need_id,target_type,territory,stage_or_role,reason_code,priority)
        VALUES('need_test','oracle_block','relacoes','counterpoint','coverage_gap',80)"""
    )
    assert scalar(
        db, "SELECT priority FROM vault_content_needs WHERE need_id='need_test'"
    ) == 80

    print("Maison Vault v1 -> v2 validation: OK")


if __name__ == "__main__":
    main()
