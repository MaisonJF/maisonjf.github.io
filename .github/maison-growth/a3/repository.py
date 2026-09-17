#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Mapping, Optional

from journey_engine import (
    ALGORITHM_VERSION,
    BuildResult,
    EconomicAssessment,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class SQLiteA3Repository:
    """D1-compatible repository port for A3 derived data.

    It writes only Growth Engine derived tables. It never mutates A1 events.
    A future D1 adapter can implement these same methods.
    """

    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    def register_solution(self, solution: Mapping[str, object]) -> None:
        self.connection.execute(
            """INSERT INTO solutions
               (solution_id,solution_key,solution_type,delivery_mode,capacity_class,status,
                created_at,created_by,metadata_json)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                solution["solution_id"], solution["solution_key"], solution["solution_type"],
                solution["delivery_mode"], solution["capacity_class"],
                solution.get("status", "planned"), solution.get("created_at", utc_now()),
                solution.get("created_by", "a3-repository"),
                solution.get("metadata_json", "{}"),
            ),
        )
        self.connection.commit()

    def register_economics_profile(self, profile: Mapping[str, object]) -> None:
        self.connection.execute(
            """INSERT INTO solution_economics_versions
               (economics_version_id,solution_id,version_label,currency,reference_price_minor,
                variable_cost_minor,human_effort_minutes,human_effort_cost_minor,
                continuation_expected_value_minor,repeatability_class,scalability_score,
                capacity_units_per_period,confidence_class,confidence_basis,assumptions_json,
                valid_from,valid_to,created_at,created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                profile["economics_version_id"], profile["solution_id"], profile["version_label"],
                profile["currency"], profile.get("reference_price_minor"),
                profile.get("variable_cost_minor", 0), profile.get("human_effort_minutes", 0),
                profile.get("human_effort_cost_minor", 0),
                profile.get("continuation_expected_value_minor"),
                profile.get("repeatability_class", "unknown"), profile["scalability_score"],
                profile.get("capacity_units_per_period"), profile["confidence_class"],
                profile["confidence_basis"], profile.get("assumptions_json", "{}"),
                profile["valid_from"], profile.get("valid_to"),
                profile.get("created_at", utc_now()), profile.get("created_by", "a3-repository"),
            ),
        )
        self.connection.commit()

    def persist_build(self, result: BuildResult) -> None:
        now = utc_now()
        self.connection.execute("BEGIN")
        try:
            self.connection.execute(
                """INSERT INTO journey_rebuild_runs
                   (rebuild_run_id,algorithm_version,input_event_set_hash,started_at,completed_at,
                    event_count,duplicate_count,unresolved_count,notes_json)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    result.rebuild_run_id, ALGORITHM_VERSION, result.input_event_set_hash,
                    now, now, result.unique_event_count, result.duplicate_count,
                    len(result.unresolved), "{}",
                ),
            )
            for unresolved in result.unresolved:
                self.connection.execute(
                    """INSERT INTO unresolved_journey_events
                       (rebuild_run_id,event_id,reason_code,event_fingerprint)
                       VALUES (?,?,?,?)""",
                    (
                        result.rebuild_run_id, unresolved.event_id,
                        unresolved.reason_code, unresolved.fingerprint,
                    ),
                )
            for snapshot in result.journeys:
                self.connection.execute(
                    """INSERT INTO journey_snapshots
                       (journey_snapshot_id,rebuild_run_id,journey_id,first_event_id,last_event_id,
                        first_occurred_at,last_occurred_at,event_count,touch_count,conversion_count,
                        out_of_order_detected,completeness,confidence_class,event_set_hash,created_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        snapshot.journey_snapshot_id, result.rebuild_run_id, snapshot.journey_id,
                        snapshot.first_event_id, snapshot.last_event_id,
                        snapshot.first_occurred_at, snapshot.last_occurred_at,
                        len(snapshot.event_ids), snapshot.touch_count, snapshot.conversion_count,
                        1 if snapshot.out_of_order_detected else 0, snapshot.completeness,
                        snapshot.confidence_class, snapshot.event_set_hash, now,
                    ),
                )
                for ordinal, event_id in enumerate(snapshot.event_ids, start=1):
                    self.connection.execute(
                        """INSERT INTO journey_snapshot_events
                           (journey_snapshot_id,event_id,event_ordinal) VALUES (?,?,?)""",
                        (snapshot.journey_snapshot_id, event_id, ordinal),
                    )
            for conversion in result.conversions:
                self.connection.execute(
                    """INSERT INTO conversions
                       (conversion_id,source_event_id,journey_id,solution_id,conversion_kind,
                        occurred_at,revenue_minor,currency,economic_profile_required)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (
                        conversion.conversion_id, conversion.source_event_id, conversion.journey_id,
                        conversion.solution_id, conversion.kind, conversion.occurred_at,
                        conversion.revenue_minor, conversion.currency, 1,
                    ),
                )
                for touch in conversion.touches:
                    self.connection.execute(
                        """INSERT INTO conversion_attribution
                           (conversion_id,touch_event_id,touch_role,touch_ordinal,attribution_method)
                           VALUES (?,?,?,?,?)""",
                        (
                            conversion.conversion_id, touch.event_id, touch.role,
                            touch.ordinal, "position_role_v1",
                        ),
                    )
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise

    def persist_assessment(self, assessment: EconomicAssessment) -> None:
        self.connection.execute(
            """INSERT INTO conversion_economic_assessments
               (economic_assessment_id,conversion_id,economics_version_id,revenue_minor,
                variable_cost_minor,human_effort_minutes,human_effort_cost_minor,
                immediate_contribution_minor,continuation_expected_value_minor,
                expected_total_value_minor,scalability_score,repeatability_class,confidence_class,
                calculation_version,input_hash,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                assessment.economic_assessment_id, assessment.conversion_id,
                assessment.economics_version_id, assessment.revenue_minor,
                assessment.variable_cost_minor, assessment.human_effort_minutes,
                assessment.human_effort_cost_minor, assessment.immediate_contribution_minor,
                assessment.continuation_expected_value_minor, assessment.expected_total_value_minor,
                assessment.scalability_score, assessment.repeatability_class,
                assessment.confidence_class, assessment.calculation_version,
                assessment.input_hash, utc_now(),
            ),
        )
        self.connection.commit()

    def economics_profile_for(
        self,
        solution_id: str,
        occurred_at: str,
    ) -> Optional[dict[str, object]]:
        row = self.connection.execute(
            """SELECT economics_version_id,solution_id,version_label,currency,reference_price_minor,
                      variable_cost_minor,human_effort_minutes,human_effort_cost_minor,
                      continuation_expected_value_minor,repeatability_class,scalability_score,
                      capacity_units_per_period,confidence_class,confidence_basis,assumptions_json,
                      valid_from,valid_to
               FROM solution_economics_versions
               WHERE solution_id=? AND valid_from<=? AND (valid_to IS NULL OR valid_to>?)
               ORDER BY valid_from DESC
               LIMIT 1""",
            (solution_id, occurred_at, occurred_at),
        ).fetchone()
        if not row:
            return None
        keys = [
            "economics_version_id","solution_id","version_label","currency","reference_price_minor",
            "variable_cost_minor","human_effort_minutes","human_effort_cost_minor",
            "continuation_expected_value_minor","repeatability_class","scalability_score",
            "capacity_units_per_period","confidence_class","confidence_basis","assumptions_json",
            "valid_from","valid_to",
        ]
        return dict(zip(keys, row))
