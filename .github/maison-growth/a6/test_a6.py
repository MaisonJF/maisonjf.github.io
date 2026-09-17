import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from dashboard import DashboardFilters, DashboardValidationError, build_why, filter_snapshot, render_dashboard, validate_snapshot
from data_source import FixtureDataSource, SQLiteReadOnlyDataSource
from serve_local import assert_loopback

ROOT=Path(__file__).resolve().parent
FIXTURE=ROOT/"fixtures"/"dashboard-fixture.json"

class A6Tests(unittest.TestCase):
    def setUp(self): self.data=FixtureDataSource(FIXTURE).snapshot()
    def test_fixture_valid(self): validate_snapshot(self.data)
    def test_fixture_visibly_marked(self): self.assertIn("DADOS DE TESTE / FIXTURE",render_dashboard(self.data))
    def test_why_present(self): self.assertIn("Porquê?",render_dashboard(self.data))
    def test_rule_model_present(self):
        h=render_dashboard(self.data); self.assertIn("brain_v1",h); self.assertIn("deterministic_semantic_v1",h)
    def test_reason_codes_present(self): self.assertIn("PUBLIC_COVERAGE_NONE",render_dashboard(self.data))
    def test_evidence_present(self): self.assertIn('&quot;source&quot;: &quot;gsc&quot;',render_dashboard(self.data))
    def test_coverage_states(self):
        h=render_dashboard(self.data)
        for s in ("none","partial","sufficient","redundant"): self.assertIn(s,h)
    def test_journeys_present(self): self.assertIn("oracle:purchase",render_dashboard(self.data))
    def test_economics_present(self): self.assertIn("3500",render_dashboard(self.data))
    def test_oracle_aggregate_present(self): self.assertIn("conexao",render_dashboard(self.data))
    def test_oracle_paid_text_rejected(self):
        bad=json.loads(json.dumps(self.data)); bad["oracle_aggregates"][0]["answer_text"]="secret"
        with self.assertRaises(DashboardValidationError): validate_snapshot(bad)
    def test_direct_pii_rejected(self):
        bad=json.loads(json.dumps(self.data)); bad["needs"][0]["canonical_label"]="person@example.com"
        with self.assertRaises(DashboardValidationError): validate_snapshot(bad)
    def test_unknown_oracle_field_rejected(self):
        bad=json.loads(json.dumps(self.data)); bad["oracle_aggregates"][0]["opaque_reading_id"]="x"
        with self.assertRaises(DashboardValidationError): validate_snapshot(bad)
    def test_missing_top_level_rejected(self):
        bad=dict(self.data); bad.pop("needs")
        with self.assertRaises(DashboardValidationError): validate_snapshot(bad)
    def test_filter_coverage(self):
        v=filter_snapshot(self.data,DashboardFilters(coverage="none")); self.assertEqual(len(v["coverage"]),1)
    def test_filter_state(self):
        v=filter_snapshot(self.data,DashboardFilters(state="internal_candidate")); self.assertGreaterEqual(len(v["candidates"]),1)
    def test_filter_source(self):
        v=filter_snapshot(self.data,DashboardFilters(source="gsc")); self.assertEqual(len(v["evidence"]),1)
    def test_filter_provenance(self):
        v=filter_snapshot(self.data,DashboardFilters(data_status="fixture")); self.assertEqual(len(v["needs"]),2)
    def test_empty_state_rendered(self):
        h=render_dashboard(self.data,DashboardFilters(territory="does-not-exist")); self.assertIn("Sem necessidades",h)
    def test_why_builder(self):
        ev={x["evidence_id"]:x for x in self.data["evidence"]}; w=build_why(self.data["conclusions"][0],ev); self.assertEqual(len(w["evidence"]),2)
    def test_loopback_allowed(self):
        for h in ("127.0.0.1","localhost","::1"): assert_loopback(h)
    def test_non_loopback_denied(self):
        with self.assertRaises(ValueError): assert_loopback("0.0.0.0")
    def test_sqlite_adapter_query_only(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"x.db"; c=sqlite3.connect(p); c.execute("create table needs(need_id text)"); c.execute("insert into needs values('n')"); c.commit(); c.close()
            ds=SQLiteReadOnlyDataSource(p); snap=ds.snapshot(); self.assertEqual(snap["needs"][0]["need_id"],"n")
            conn=ds._connect()
            with self.assertRaises(sqlite3.OperationalError): conn.execute("insert into needs values('x')")
            conn.close()
    def test_permissions_deny_write(self):
        p=json.loads((ROOT/"a6-permissions.json").read_text()); self.assertEqual(p["default"],"deny"); self.assertIn("public_site.write",p["deny"]); self.assertFalse(p["future_runtime"]["write_methods"])
    def test_contract_read_only(self):
        c=json.loads((ROOT/"a6-contract.json").read_text()); self.assertEqual(c["mode"],"read_only_internal"); self.assertFalse(c["runtime_isolation"]["public_site_write"])
    def test_no_public_paths_in_fixture(self): self.assertNotIn("public_path",json.dumps(self.data))

if __name__=="__main__": unittest.main()
