#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
import unittest
from pathlib import Path

from brain import (
    DeterministicSemanticProvider, Observation, PrivacyViolation, UnsupportedSemanticSource,
    ValidationError, alias_assessment, cluster_observations, combine_confidence,
    deduplicate_analyses, make_internal_candidate, normalize_language, resolve_coverage
)
from repository import SQLiteA5Repository, new_id

ROOT = Path(__file__).resolve().parent
MIGRATION = ROOT / "migrations" / "0004_brain.sql"

PRELUDE = """
PRAGMA foreign_keys=ON;
CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY, schema_value TEXT NOT NULL, recorded_at TEXT);
CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY, family TEXT, version_label TEXT, definition_hash TEXT, definition_json TEXT, created_at TEXT, created_by TEXT, supersedes_rule_version_id TEXT);
CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY, provider TEXT, model_name TEXT, version_label TEXT, config_hash TEXT, config_json TEXT, created_at TEXT, created_by TEXT, supersedes_model_version_id TEXT);
CREATE TABLE events(event_id TEXT PRIMARY KEY);
CREATE TABLE map_evidence(evidence_id TEXT PRIMARY KEY, source TEXT, source_event_id TEXT, journey_id TEXT, evidence_kind TEXT, observed_at TEXT, strength INTEGER, confidence_class TEXT, payload_hash TEXT, facts_json TEXT, created_at TEXT);
CREATE TABLE needs(need_id TEXT PRIMARY KEY, need_key TEXT UNIQUE, canonical_label TEXT, territory_key TEXT, internal_state TEXT, created_at TEXT, created_by TEXT, metadata_json TEXT);
CREATE TABLE intents(intent_id TEXT PRIMARY KEY, need_id TEXT, intent_key TEXT, canonical_label TEXT, semantic_fingerprint TEXT UNIQUE, internal_state TEXT, created_at TEXT, created_by TEXT, metadata_json TEXT);
CREATE TABLE assets(asset_id TEXT PRIMARY KEY);
CREATE TABLE solutions(solution_id TEXT PRIMARY KEY, solution_key TEXT, solution_type TEXT, delivery_mode TEXT, capacity_class TEXT, status TEXT, created_at TEXT, created_by TEXT, metadata_json TEXT);
"""

def h(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()

def prepare_db() -> sqlite3.Connection:
    db = sqlite3.connect(":memory:")
    db.executescript(PRELUDE)
    db.executescript(MIGRATION.read_text(encoding="utf-8"))
    rul = new_id("rul_"); mdl = new_id("mdl_")
    db.execute("INSERT INTO rule_versions VALUES(?,?,?,?,?,?,?,NULL)", (rul,"brain","v1",h("r"),"{}","2026-09-17T00:00:00Z","test"))
    db.execute("INSERT INTO model_versions VALUES(?,?,?,?,?,?,?, ?, NULL)", (mdl,"local","deterministic","v1",h("m"),"{}","2026-09-17T00:00:00Z","test"))
    need = new_id("ned_"); intent = new_id("int_")
    db.execute("INSERT INTO needs VALUES(?,?,?,?,?,?,?,?)", (need,"connection","Ligação",None,"observe","2026-09-17T00:00:00Z","test","{}"))
    db.execute("INSERT INTO intents VALUES(?,?,?,?,?,?,?,?,?)", (intent,need,"resume-talk","Retomar conversa",h("intent"),"observe","2026-09-17T00:00:00Z","test","{}"))
    db.commit(); return db

class SemanticTests(unittest.TestCase):
    def setUp(self): self.p = DeterministicSemanticProvider()
    def test_normalization_removes_accents_and_case(self): self.assertEqual(normalize_language("  CONVERSA Profunda  ", source_kind="system_fixture"), "conversa profunda")
    def test_reject_unknown_source_kind(self):
        with self.assertRaises(UnsupportedSemanticSource): normalize_language("texto seguro", source_kind="raw_form")
    def test_reject_direct_email(self):
        with self.assertRaises(PrivacyViolation): self.p.analyze("fala comigo em maria@example.com", source_kind="system_fixture")
    def test_equivalent_language_clusters(self):
        obs=[Observation("o1","como retomar conversa com parceiro"),Observation("o2","como voltar a falar com namorado")]
        clusters=cluster_observations(obs,self.p); self.assertEqual(len(clusters),1); self.assertEqual({m.observation_id for m in clusters[0].members},{"o1","o2"})
    def test_ambiguous_language_does_not_force_cluster(self):
        obs=[Observation("o1","falar"),Observation("o2","retomar conversa com parceiro")]
        self.assertEqual(len(cluster_observations(obs,self.p)),2); self.assertTrue(self.p.analyze("falar",source_kind="system_fixture").ambiguity)
    def test_false_positive_stays_separate(self):
        obs=[Observation("o1","perguntas para conhecer melhor parceiro"),Observation("o2","retomar conversa com parceiro")]
        self.assertEqual(len(cluster_observations(obs,self.p)),2)
    def test_exact_duplicates_deduplicate(self):
        a1=self.p.analyze("voltar a falar com namorado",source_kind="system_fixture"); a2=self.p.analyze("voltar a falar com namorado",source_kind="system_fixture")
        grouped=deduplicate_analyses([a1,a2]); self.assertEqual(len(grouped),1); self.assertEqual(len(next(iter(grouped.values()))),2)
    def test_alias_candidate_for_equivalent_phrase(self):
        a=self.p.analyze("retomar conversa com parceiro",source_kind="system_fixture"); c=self.p.analyze("voltar a falar com namorado",source_kind="system_fixture")
        result=alias_assessment(a,c,self.p); self.assertEqual(result.state,"alias_candidate"); self.assertIn("semantic_exact",result.reason_codes)
    def test_alias_ambiguous_is_observe(self):
        a=self.p.analyze("falar",source_kind="system_fixture"); c=self.p.analyze("voltar a falar com namorado",source_kind="system_fixture")
        self.assertEqual(alias_assessment(a,c,self.p).state,"observe")

class CoverageTests(unittest.TestCase):
    def test_no_coverage_is_gap(self): self.assertEqual((resolve_coverage([],[]).public_coverage,resolve_coverage([],[]).solution_coverage,resolve_coverage([],[]).state),("none","none","gap"))
    def test_partial_content_is_reinforcement(self):
        r=resolve_coverage([{"asset_id":"a","strength":55,"evidence_ids":["e1"]}],[]); self.assertEqual(r.public_coverage,"partial"); self.assertEqual(r.state,"reinforcement_candidate"); self.assertIn("existing_partial_coverage",r.reason_codes)
    def test_sufficient_content_and_solution_covered(self):
        r=resolve_coverage([{"asset_id":"a","strength":90}],[{"solution_id":"s","strength":90}]); self.assertEqual(r.public_coverage,"sufficient"); self.assertEqual(r.solution_coverage,"sufficient"); self.assertEqual(r.state,"covered")
    def test_redundant_public_coverage_detected(self):
        r=resolve_coverage([{"asset_id":"a","strength":90},{"asset_id":"b","strength":82}],[{"solution_id":"s","strength":90}]); self.assertEqual(r.public_coverage,"redundant"); self.assertIn("redundant_public_coverage",r.reason_codes)
    def test_multiple_solutions_detected(self):
        r=resolve_coverage([],[{"solution_id":"s1","strength":90},{"solution_id":"s2","strength":85}]); self.assertEqual(r.solution_coverage,"multiple"); self.assertEqual(r.state,"internal_candidate"); self.assertIn("multiple_solution_fit",r.reason_codes)
    def test_conflicting_evidence_forces_observe(self):
        r=resolve_coverage([{"asset_id":"a","strength":90}],[{"solution_id":"s","strength":90}],conflicting_evidence=True); self.assertEqual(r.state,"observe"); self.assertIn("evidence_conflict",r.reason_codes); self.assertLess(r.confidence_score,80)
    def test_evidence_refs_are_deduplicated(self):
        r=resolve_coverage([{"asset_id":"a","strength":50,"evidence_ids":["e2","e1"]}],[{"solution_id":"s","strength":50,"evidence_ids":["e1"]}]); self.assertEqual(r.evidence_refs,("e1","e2"))
    def test_invalid_strength_rejected(self):
        with self.assertRaises(ValidationError): resolve_coverage([{"asset_id":"a","strength":101}],[])

class CandidateTests(unittest.TestCase):
    def test_internal_candidate_has_no_public_side_effect(self):
        cov=resolve_coverage([],[{"solution_id":"s","strength":90}]); c=make_internal_candidate(kind="content_intent",coverage=cov,cluster_key=h("c"),need_id="ned_dummy",journey_context={"journey_count":5,"conversion_count":2},economic_context={"revenue_minor":400,"currency":"EUR","immediate_contribution_minor":350})
        self.assertFalse(c["public_side_effects"]); self.assertEqual(c["state"],"internal_candidate"); self.assertIn("journey_support",c["reason_codes"]); self.assertIn("economic_support",c["reason_codes"])
    def test_candidate_rejects_commercial_pii_context(self):
        with self.assertRaises(ValidationError): make_internal_candidate(kind="content_intent",coverage=resolve_coverage([],[]),cluster_key=h("c"),economic_context={"customer_email":"x@y.pt"})
    def test_candidate_rejects_unknown_kind(self):
        with self.assertRaises(ValidationError): make_internal_candidate(kind="publish_ocean",coverage=resolve_coverage([],[]),cluster_key=h("c"))
    def test_confidence_is_separate(self): self.assertEqual(combine_confidence(80,60),70); self.assertEqual(combine_confidence(80,60,conflicting=True),45)

class MigrationRepositoryTests(unittest.TestCase):
    def test_migration_creates_a5_schema_state(self): self.assertEqual(prepare_db().execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a5_schema_version'").fetchone()[0],"A5.1")
    def test_repository_persists_run_observation_coverage_candidate(self):
        db=prepare_db(); repo=SQLiteA5Repository(db); rul=db.execute("SELECT rule_version_id FROM rule_versions").fetchone()[0]; mdl=db.execute("SELECT model_version_id FROM model_versions").fetchone()[0]; need=db.execute("SELECT need_id FROM needs").fetchone()[0]; intent=db.execute("SELECT intent_id FROM intents").fetchone()[0]
        run=repo.create_run(run_kind="mixed",rule_version_id=rul,model_version_id=mdl,provider_name="deterministic_lexicon",provider_version="1",input_hash=h("run"),input_count=1)
        analysis=DeterministicSemanticProvider().analyze("retomar conversa com parceiro",source_kind="system_fixture"); self.assertTrue(repo.persist_observation(brain_run_id=run,analysis=analysis,source_kind="system_fixture",rule_version_id=rul,model_version_id=mdl,need_id=need,intent_id=intent).startswith("sob_"))
        cov=resolve_coverage([],[]); self.assertTrue(repo.persist_coverage(brain_run_id=run,target_type="intent",target_id=intent,result=cov,rule_version_id=rul,model_version_id=mdl).startswith("cvr_"))
        clu=new_id("clu_"); db.execute("INSERT INTO semantic_clusters VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",(clu,run,h("cluster"),"talk|resume",need,intent,"internal_candidate",70,'["no_public_coverage"]','[]',rul,mdl,"2026-09-17T00:00:00Z")); db.commit()
        candidate=make_internal_candidate(kind="content_intent",coverage=cov,cluster_key=h("cluster"),need_id=need,intent_id=intent); self.assertTrue(repo.persist_candidate(brain_run_id=run,candidate=candidate,cluster_id=clu,need_id=need,intent_id=intent,rule_version_id=rul,model_version_id=mdl).startswith("can_"))
    def test_a5_tables_are_append_only(self):
        db=prepare_db(); repo=SQLiteA5Repository(db); rul=db.execute("SELECT rule_version_id FROM rule_versions").fetchone()[0]; run=repo.create_run(run_kind="semantic",rule_version_id=rul,model_version_id=None,provider_name="fixture",provider_version="1",input_hash=h("x"),input_count=0)
        with self.assertRaises(sqlite3.DatabaseError): db.execute("UPDATE brain_runs SET provider_version='2' WHERE brain_run_id=?",(run,))
    def test_paid_oracle_field_rejected_by_privacy_scanner(self):
        from brain import privacy_scan
        with self.assertRaises(PrivacyViolation): privacy_scan({"oracle_answer":"conteudo pago"})
    def test_direct_pii_rejected_in_context(self):
        from brain import privacy_scan
        with self.assertRaises(PrivacyViolation): privacy_scan({"safe":"contacta joao@example.com"})

if __name__ == "__main__": unittest.main(verbosity=2)
