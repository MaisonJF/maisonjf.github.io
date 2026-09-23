#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import unittest
from pathlib import Path


GROWTH=Path(__file__).resolve().parents[1]
MIGRATIONS=(
    GROWTH/"a1/migrations/0001_data_foundation.sql",
    GROWTH/"a3/migrations/0002_journeys_economics.sql",
    GROWTH/"a4/migrations/0003_living_map_radar.sql",
    GROWTH/"a5/migrations/0004_brain.sql",
    GROWTH/"a7/migrations/0005_decisor_commercial_discovery.sql",
    GROWTH/"a8/migrations/0006_experiment_manager.sql",
    GROWTH/"a9/migrations/0007_publisher_gateway.sql",
    GROWTH/"a10/migrations/0008_ocean_promotion.sql",
    GROWTH/"a11/migrations/0009_learning_engine.sql",
    GROWTH/"a12/migrations/0010_gradual_autonomy_dashboard_v2.sql",
    GROWTH/"a13/migrations/0011_external_intelligence_runtime.sql",
    GROWTH/"a14/migrations/0012_universal_opportunity_earned_distribution.sql",
    GROWTH/"a14/migrations/0013_a14_bridges_cash.sql",
    GROWTH/"brain/migrations/0014_brain_runtime_views.sql",
)


class GrowthSchemaChainTests(unittest.TestCase):
    def test_full_schema_chain_applies_in_order(self):
        con=sqlite3.connect(":memory:")
        con.execute("PRAGMA foreign_keys=ON")
        for path in MIGRATIONS:
            self.assertTrue(path.exists(),str(path))
            con.executescript(path.read_text(encoding="utf-8"))

        state=dict(con.execute("SELECT schema_key,schema_value FROM schema_state"))
        self.assertEqual(state["maison_growth_a14_schema_version"],"A14.2")
        self.assertEqual(state["maison_brain_runtime_schema_version"],"BRAIN.1")

        views={
            row[0] for row in con.execute(
                "SELECT name FROM sqlite_master WHERE type='view'"
            )
        }
        self.assertIn("brain_prebrain_feed",views)
        self.assertIn("brain_cash_feedback",views)
        self.assertIn("a14_realised_economics",views)

    def test_cash_feedback_accepts_unlinked_a3_economics(self):
        con=sqlite3.connect(":memory:")
        con.execute("PRAGMA foreign_keys=ON")
        for path in MIGRATIONS:
            con.executescript(path.read_text(encoding="utf-8"))

        con.execute("""INSERT INTO solutions
          (solution_id,solution_key,solution_type,delivery_mode,capacity_class,status,created_at,created_by,metadata_json)
          VALUES (?,?,?,?,?,?,?,?,?)""",
          ("sol_"+"1"*36,"test-service","service","human","human_limited","active",
           "2026-09-23T00:00:00Z","test","{}"))
        con.execute("""INSERT INTO solution_economics_versions
          (economics_version_id,solution_id,version_label,currency,reference_price_minor,
           variable_cost_minor,human_effort_minutes,human_effort_cost_minor,
           continuation_expected_value_minor,repeatability_class,scalability_score,
           capacity_units_per_period,confidence_class,confidence_basis,assumptions_json,
           valid_from,valid_to,created_at,created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("eco_"+"2"*36,"sol_"+"1"*36,"v1","EUR",3500,500,60,300,None,
           "medium",20,None,"observed","fixture","{}","2026-09-23T00:00:00Z",None,
           "2026-09-23T00:00:00Z","test"))
        con.execute("""INSERT INTO events
          (event_id,idempotency_key,event_type,source,schema_version,occurred_at,
           solution_id,value_minor,currency,privacy_class,payload_hash,metadata_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("evt_"+"3"*36,"fixture:purchase","commerce.purchase","commerce",2,
           "2026-09-23T12:00:00Z","sol_"+"1"*36,3500,"EUR","system","a"*64,"{}"))
        con.execute("""INSERT INTO conversions
          (conversion_id,source_event_id,journey_id,solution_id,conversion_kind,occurred_at,
           revenue_minor,currency,economic_profile_required)
          VALUES (?,?,?,?,?,?,?,?,?)""",
          ("cnv_"+"4"*36,"evt_"+"3"*36,None,"sol_"+"1"*36,"purchase",
           "2026-09-23T12:00:00Z",3500,"EUR",1))
        con.execute("""INSERT INTO conversion_economic_assessments
          (economic_assessment_id,conversion_id,economics_version_id,revenue_minor,
           variable_cost_minor,human_effort_minutes,human_effort_cost_minor,
           immediate_contribution_minor,continuation_expected_value_minor,
           expected_total_value_minor,scalability_score,repeatability_class,
           confidence_class,calculation_version,input_hash,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("eva_"+"5"*36,"cnv_"+"4"*36,"eco_"+"2"*36,3500,500,60,300,2700,
           None,None,20,"medium","observed","test","b"*64,"2026-09-23T12:01:00Z"))

        row=con.execute("""SELECT revenue_minor,immediate_contribution_minor,
                                 opportunity_ids_json
                          FROM brain_cash_feedback""").fetchone()
        self.assertEqual(row[0:2],(3500,2700))
        self.assertEqual(row[2],"[]")


if __name__=="__main__":
    unittest.main(verbosity=2)
