#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
from typing import Any, Mapping, Optional


class A14RepositoryError(ValueError):
    pass


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


class SQLiteA14Repository:
    """Append-only persistence adapter for A14 internal analysis records.

    This adapter intentionally stores opaque references to A13/Osiris/Ocean/Semantic
    context instead of copying those knowledge stores into A14.
    """

    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    def persist_opportunity(self, record: Mapping[str, Any]) -> None:
        self.connection.execute(
            """INSERT INTO opportunity_hypotheses
               (opportunity_id,need_id,territory_code,opportunity_score,confidence,
                known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
                existing_solution_ids_json,knowledge_context_refs_json,status,
                reason_codes_json,rule_version_id,model_version_id,input_hash,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                record["opportunity_id"],
                record.get("need_id"),
                record.get("territory_code"),
                record.get("opportunity_score"),
                record["confidence"],
                _json(record.get("known_dimensions", [])),
                _json(record.get("unknown_dimensions", [])),
                _json(record.get("evidence_refs", [])),
                _json(record.get("existing_solution_ids", [])),
                _json(record.get("knowledge_context_refs", [])),
                record["status"],
                _json(record.get("reason_codes", [])),
                record["rule_version_id"],
                record.get("model_version_id"),
                record["input_hash"],
                record["created_at"],
            ),
        )

    def persist_offer_hypothesis(self, record: Mapping[str, Any]) -> None:
        self.connection.execute(
            """INSERT INTO opportunity_offer_hypotheses
               (offer_hypothesis_id,opportunity_id,offer_type,a3_solution_type,
                existing_solution_id,fit_score,fit_confidence,economics_json,
                validation_mode,evidence_refs_json,reason_codes_json,
                human_review_required,launch_authorized,price_authorized,
                public_side_effects,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                record["offer_hypothesis_id"],
                record["opportunity_id"],
                record["offer_type"],
                record["a3_solution_type"],
                record.get("existing_solution_id"),
                record.get("fit_score"),
                record["fit_confidence"],
                _json(record.get("economics", {})),
                record.get("validation_mode"),
                _json(record.get("evidence_refs", [])),
                _json(record.get("reason_codes", [])),
                1,
                0,
                0,
                0,
                record["created_at"],
            ),
        )

    def persist_distribution_match(self, record: Mapping[str, Any]) -> None:
        self.connection.execute(
            """INSERT INTO earned_distribution_match_assessments
               (distribution_match_id,offer_hypothesis_id,amplifier_ref,moment_key,
                story_angle_key,channel_class,fit_score,fit_confidence,
                known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
                economics_json,recommended_strategy,recommendation_state,
                a12_review_ref,experiment_id,outbound_authorized,spend_authorized,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?)""",
            (
                record["distribution_match_id"],
                record["offer_hypothesis_id"],
                record["amplifier_ref"],
                record["moment_key"],
                record.get("story_angle_key"),
                record["channel_class"],
                record.get("fit_score"),
                record["fit_confidence"],
                _json(record.get("known_dimensions", [])),
                _json(record.get("unknown_dimensions", [])),
                _json(record.get("evidence_refs", [])),
                _json(record.get("economics", {})),
                record["recommended_strategy"],
                record["recommendation_state"],
                record.get("a12_review_ref"),
                record.get("experiment_id"),
                record["created_at"],
            ),
        )

    def persist_distribution_observation(self, record: Mapping[str, Any]) -> None:
        self.connection.execute(
            """INSERT INTO distribution_value_observations
               (distribution_observation_id,distribution_match_id,source_event_id,
                direct_revenue_minor,direct_margin_minor,currency,backlinks_observed,
                brand_search_delta,direct_visits_delta,b2b_leads_observed,
                secondary_mentions_observed,monetized_indirect_value_minor,
                valuation_method,attribution_confidence,evidence_refs_json,observed_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                record["distribution_observation_id"],
                record["distribution_match_id"],
                record.get("source_event_id"),
                record.get("direct_revenue_minor"),
                record.get("direct_margin_minor"),
                record.get("currency"),
                record.get("backlinks_observed"),
                record.get("brand_search_delta"),
                record.get("direct_visits_delta"),
                record.get("b2b_leads_observed"),
                record.get("secondary_mentions_observed"),
                record.get("monetized_indirect_value_minor"),
                record.get("valuation_method"),
                record.get("attribution_confidence"),
                _json(record.get("evidence_refs", [])),
                record["observed_at"],
            ),
        )

    def fetch_opportunity(self, opportunity_id: str) -> Optional[dict[str, Any]]:
        row = self.connection.execute(
            """SELECT opportunity_id,need_id,territory_code,opportunity_score,confidence,
                      known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
                      existing_solution_ids_json,knowledge_context_refs_json,status,
                      reason_codes_json,rule_version_id,model_version_id,input_hash,created_at
               FROM opportunity_hypotheses WHERE opportunity_id=?""",
            (opportunity_id,),
        ).fetchone()
        if row is None:
            return None
        keys = (
            "opportunity_id","need_id","territory_code","opportunity_score","confidence",
            "known_dimensions_json","unknown_dimensions_json","evidence_refs_json",
            "existing_solution_ids_json","knowledge_context_refs_json","status",
            "reason_codes_json","rule_version_id","model_version_id","input_hash","created_at",
        )
        out = dict(zip(keys, row))
        for key in (
            "known_dimensions_json","unknown_dimensions_json","evidence_refs_json",
            "existing_solution_ids_json","knowledge_context_refs_json","reason_codes_json",
        ):
            out[key.removesuffix("_json")] = json.loads(out.pop(key))
        return out
