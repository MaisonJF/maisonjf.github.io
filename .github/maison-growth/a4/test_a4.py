#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sqlite3, sys, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from map_core import (
    new_id, semantic_fingerprint, deduplicate_intent, coverage_from_relations,
    coverage_input_hash, radar_from_a2_event, PrivacyViolation, ValidationError,
    UnknownRadarSource, gap_types_for, economic_context_from_a3
)
from repository import SQLiteA4Repository

MIGRATION=ROOT/"migrations"/"0003_living_map_radar.sql"

def base_db():
    db=sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
      CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL,recorded_at TEXT);
      CREATE TABLE events(event_id TEXT PRIMARY KEY, journey_id TEXT, event_type TEXT, source TEXT, occurred_at TEXT);
      CREATE TABLE solutions(
        solution_id TEXT PRIMARY KEY, solution_key TEXT UNIQUE, solution_type TEXT, delivery_mode TEXT,
        capacity_class TEXT, status TEXT, created_at TEXT, created_by TEXT, metadata_json TEXT DEFAULT '{}'
      );
    """)
    db.executescript(MIGRATION.read_text(encoding="utf-8"))
    return db

def now(): return "2026-09-17T10:00:00.000Z"

class A4Tests(unittest.TestCase):
    def setUp(self):
        self.db=base_db()
        self.repo=SQLiteA4Repository(self.db)
        self.need=new_id("ned_")
        self.repo.insert_need(self.need,"need.connection","Connection","relations",now(),"test")

    def add_solution(self,key="oracle_relations",typ="oracle"):
        sid=new_id("sol_")
        self.db.execute("""INSERT INTO solutions(solution_id,solution_key,solution_type,delivery_mode,capacity_class,status,created_at,created_by)
          VALUES (?,?,?,?,?,?,?,?)""",(sid,key,typ,"automatic","scalable","active",now(),"test"))
        return sid

    def add_asset(self,key="ocean.connection",typ="ocean",path="/relacoes/conexao"):
        aid=new_id("ast_")
        self.repo.insert_asset(aid,key,typ,path,"active",now(),"test")
        return aid

    def test_schema_version(self):
        self.assertEqual(self.db.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a4_schema_version'").fetchone()[0],"A4.1")

    def test_ids_are_uuid7_prefixed(self):
        for p in ("ned_","int_","ast_","evd_","rel_","cov_","gap_","rad_"):
            v=new_id(p); self.assertEqual(len(v),40); self.assertTrue(v.startswith(p))

    def test_intent_deduplication(self):
        fp=semantic_fingerprint(" pessoa afastou se ")
        iid=new_id("int_")
        self.repo.insert_intent(iid,self.need,"silence","Silence",fp,now(),"test")
        found=self.repo.intent_by_fingerprint(fp)
        self.assertEqual(found[0],iid)
        candidate,dup=deduplicate_intent({fp:iid},"Pessoa   afastou   se")
        self.assertTrue(dup); self.assertEqual(candidate,iid)

    def test_db_rejects_duplicate_intent_fingerprint(self):
        fp=semantic_fingerprint("same")
        self.repo.insert_intent(new_id("int_"),self.need,"same1","Same",fp,now(),"test")
        with self.assertRaises(sqlite3.IntegrityError):
            self.repo.insert_intent(new_id("int_"),self.need,"same2","Same 2",fp,now(),"test")

    def test_no_coverage_is_gap(self):
        r=coverage_from_relations([],[])
        self.assertEqual((r.public_coverage,r.solution_coverage,r.overall_state),("none","none","gap"))
        self.assertEqual(gap_types_for(r),("content","solution"))

    def test_partial_coverage(self):
        r=coverage_from_relations([{"strength":50,"status":"active"}],[])
        self.assertEqual((r.public_coverage,r.solution_coverage,r.overall_state),("partial","none","partial"))

    def test_fully_covered(self):
        r=coverage_from_relations([{"strength":90,"status":"active"}],[{"strength":85,"status":"active"}])
        self.assertEqual((r.public_coverage,r.solution_coverage,r.overall_state),("sufficient","sufficient","covered"))

    def test_retired_relation_does_not_cover(self):
        r=coverage_from_relations([{"strength":100,"status":"retired"}],[])
        self.assertEqual(r.public_coverage,"none")

    def test_multiple_solutions_supported(self):
        s1=self.add_solution("oracle")
        s2=self.add_solution("consult","service")
        self.repo.add_need_solution_relation(new_id("rel_"),self.need,s1,"primary",85,now(),"test")
        self.repo.add_need_solution_relation(new_id("rel_"),self.need,s2,"supporting",70,now(),"test")
        _,solutions=self.repo.need_relations(self.need)
        r=coverage_from_relations([],solutions)
        self.assertEqual(len(solutions),2); self.assertEqual(r.solution_coverage,"sufficient")

    def test_asset_and_solution_links(self):
        a=self.add_asset(); s=self.add_solution()
        self.repo.add_need_asset_relation(new_id("rel_"),self.need,a,"primary",88,now(),"test")
        self.repo.add_need_solution_relation(new_id("rel_"),self.need,s,"primary",90,now(),"test")
        assets,solutions=self.repo.need_relations(self.need)
        r=coverage_from_relations(assets,solutions)
        cid,h=self.repo.save_coverage("need",self.need,r,"coverage_v1","high",assets,solutions,now())
        row=self.db.execute("SELECT overall_state,input_hash FROM coverage_assessments WHERE coverage_id=?",(cid,)).fetchone()
        self.assertEqual(row,("covered",h))

    def test_coverage_hash_deterministic(self):
        aid1,aid2=new_id("ast_"),new_id("ast_")
        xs=[{"asset_id":aid1,"relation_role":"primary","strength":70,"status":"active"},{"asset_id":aid2,"relation_role":"supporting","strength":40,"status":"active"}]
        self.assertEqual(coverage_input_hash("need",self.need,xs,[]),coverage_input_hash("need",self.need,reversed(xs),[]))

    def a2_event(self,source="site",event_type="page.view",metadata=None,journey=True):
        return {
          "event_id":new_id("evt_"),"source":source,"event_type":event_type,"occurred_at":now(),
          "idempotency_key":"abcdefgh123456","journey_id":new_id("jrn_") if journey else None,
          "metadata":metadata or {"path":"/relacoes","surface":"ocean"}
        }

    def test_site_radar_evidence(self):
        ev=radar_from_a2_event(self.a2_event(),signal_type="engagement",strength=60)
        self.assertEqual(ev.source,"site"); self.assertEqual(ev.evidence_kind,"engagement")
        self.assertEqual(len(ev.payload_hash),64)

    def test_gsc_radar_evidence(self):
        e=self.a2_event("gsc","discovery.impression",{"query_hash":"a"*64,"page_path":"/relacoes","impressions":5,"clicks":1,"position_bucket":"1-10","country_code":"PT","device_class":"mobile"},False)
        ev=radar_from_a2_event(e,signal_type="demand",strength=70)
        self.assertEqual(ev.source,"gsc")

    def test_oracle_aggregate_allowed(self):
        e=self.a2_event("oracle","oracle.purchase",{"territory_id":"relations","class_id":"distance","entry_source":"ocean","repeat_usage":False,"conversion_stage":"purchase","reading_id_hash":"b"*64})
        ev=radar_from_a2_event(e,signal_type="conversion",strength=90)
        self.assertNotIn("answer",ev.facts)

    def test_oracle_paid_text_rejected(self):
        e=self.a2_event("oracle","oracle.purchase",{"territory_id":"relations","answer_text":"paid secret"})
        with self.assertRaises((PrivacyViolation,ValidationError)):
            radar_from_a2_event(e,signal_type="conversion",strength=90)

    def test_direct_pii_rejected(self):
        e=self.a2_event(metadata={"path":"/x","surface":"person@example.com"})
        with self.assertRaises(PrivacyViolation):
            radar_from_a2_event(e,signal_type="engagement",strength=50)

    def test_unknown_radar_source_rejected(self):
        e=self.a2_event(); e["source"]="unknown"
        with self.assertRaises(UnknownRadarSource):
            radar_from_a2_event(e,signal_type="engagement",strength=50)

    def test_unknown_metadata_rejected(self):
        e=self.a2_event(metadata={"path":"/x","secret_field":"x"})
        with self.assertRaises(ValidationError):
            radar_from_a2_event(e,signal_type="engagement",strength=50)

    def test_evidence_and_signal_persist(self):
        e=self.a2_event()
        self.db.execute("INSERT INTO events(event_id,journey_id,event_type,source,occurred_at) VALUES (?,?,?,?,?)",
                        (e["event_id"],e["journey_id"],e["event_type"],e["source"],e["occurred_at"]))
        ev=radar_from_a2_event(e,signal_type="engagement",strength=55)
        evid=new_id("evd_")
        self.repo.add_evidence(evid,ev,created_at=now())
        rid=self.repo.add_radar_signal(evid,"site","engagement",ev.occurred_at,ev.strength,ev.facts,need_id=self.need,journey_id=ev.journey_id)
        self.assertEqual(self.db.execute("SELECT need_id FROM radar_signals WHERE radar_signal_id=?",(rid,)).fetchone()[0],self.need)

    def test_gap_persist(self):
        h=hashlib.sha256(b"gap").hexdigest()
        gid=self.repo.add_gap(self.need,"content","medium",h,now(),"test")
        self.assertEqual(self.db.execute("SELECT status FROM coverage_gaps WHERE gap_id=?",(gid,)).fetchone()[0],"observe")

    def test_future_candidate_not_auto_derived(self):
        r=coverage_from_relations([],[])
        self.assertNotEqual(r.overall_state,"future_candidate")

    def test_economic_context_keeps_unknown_unknown(self):
        c={"conversion_id":new_id("cnv_"),"solution_id":new_id("sol_"),"journey_id":new_id("jrn_"),"revenue_minor":200,"currency":"EUR"}
        out=economic_context_from_a3(c,None)
        self.assertNotIn("expected_total_value_minor",out)
        self.assertEqual(out["revenue_minor"],200)

    def test_economic_context_links_assessment(self):
        c={"conversion_id":new_id("cnv_"),"solution_id":new_id("sol_"),"journey_id":new_id("jrn_"),"revenue_minor":3500,"currency":"EUR"}
        a={"immediate_contribution_minor":3000,"continuation_expected_value_minor":500,"expected_total_value_minor":3500,
           "human_effort_minutes":60,"scalability_score":20,"repeatability_class":"medium","confidence_class":"observed"}
        out=economic_context_from_a3(c,a)
        self.assertEqual(out["human_effort_minutes"],60); self.assertEqual(out["expected_total_value_minor"],3500)

    def test_immutable_evidence(self):
        e=self.a2_event()
        self.db.execute("INSERT INTO events(event_id,journey_id,event_type,source,occurred_at) VALUES (?,?,?,?,?)",
                        (e["event_id"],e["journey_id"],e["event_type"],e["source"],e["occurred_at"]))
        ev=radar_from_a2_event(e,signal_type="engagement",strength=55)
        evid=new_id("evd_"); self.repo.add_evidence(evid,ev,created_at=now())
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE map_evidence SET strength=99 WHERE evidence_id=?",(evid,))

    def test_no_public_mutation_tables(self):
        names={r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertFalse({"pages","redirects","sitemaps","cta_experiments","checkout"} & names)

if __name__=="__main__":
    unittest.main(verbosity=2)
