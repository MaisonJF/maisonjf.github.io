#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class ValidationPlan:
    queue_id: str
    opportunity_id: str | None
    offer_hypothesis_id: str | None
    offer_type: str | None
    route: str
    state: str
    a8_candidate: bool
    blockers: tuple[str,...]
    required_human_inputs: tuple[str,...]
    public_write_authorized: bool=False
    outbound_authorized: bool=False
    spend_authorized: bool=False
    experiment_execution_authorized: bool=False


A8_VALIDATION_MODE="cta_route_existing_solution"
B2B_TYPES={"b2b","wholesale","white_label","licensing","partnership","personalisation","corporate_gifting","ip_content_licensing"}
PHYSICAL_TYPES={"physical_product","bundle"}
SERVICE_TYPES={"service","workshop","experience"}
DIGITAL_TYPES={"digital_product","ebook","subscription","oracle"}


def plan_review_row(row: Mapping[str,Any]) -> ValidationPlan:
    status=str(row.get("status") or "")
    queue_id=str(row.get("queue_id") or "")
    opportunity_id=str(row.get("opportunity_id") or "") or None
    offer_id=str(row.get("offer_hypothesis_id") or "") or None
    offer_type=str(row.get("offer_type") or "") or None
    validation_mode=str(row.get("validation_mode") or "")
    solution_id=str(row.get("existing_solution_id") or "") or None

    if status!="approved":
        return ValidationPlan(
            queue_id,opportunity_id,offer_id,offer_type,
            "none","not_approved",False,
            ("human_approval_required",),(),
        )

    if solution_id and validation_mode==A8_VALIDATION_MODE:
        return ValidationPlan(
            queue_id,opportunity_id,offer_id,offer_type,
            "a8_cta_existing_solution","planning_ready_but_not_executable",True,
            ("a7_test_cta_decision_required","source_asset_snapshot_required","cta_slot_required"),
            ("source_asset_id","cta_slot_key","current_cta_destination_solution_id"),
        )

    if offer_type in B2B_TYPES:
        return ValidationPlan(
            queue_id,opportunity_id,offer_id,offer_type,
            "human_b2b_pilot","human_plan_required",False,
            ("a8_does_not_cover_b2b_outreach","outbound_remains_human_authorized_only"),
            ("target_segment","pilot_offer_scope","success_metric","maximum_cost_or_zero_cash_rule"),
        )

    if offer_type in PHYSICAL_TYPES:
        return ValidationPlan(
            queue_id,opportunity_id,offer_id,offer_type,
            "physical_micro_batch_or_preorder","human_plan_required",False,
            ("a8_does_not_cover_physical_production","operational_asset_facts_required"),
            ("stock_or_material_availability","unit_cost","production_capacity","validation_method"),
        )

    if offer_type in SERVICE_TYPES:
        return ValidationPlan(
            queue_id,opportunity_id,offer_id,offer_type,
            "human_service_pilot","human_plan_required",False,
            ("a8_does_not_cover_service_delivery",),
            ("capacity","pilot_format","success_metric","delivery_window"),
        )

    if offer_type in DIGITAL_TYPES:
        return ValidationPlan(
            queue_id,opportunity_id,offer_id,offer_type,
            "manual_digital_validation","human_plan_required",False,
            ("a8_requires_existing_solution_cta_route_for_current_implementation",),
            ("validation_surface","success_metric","stop_rule"),
        )

    return ValidationPlan(
        queue_id,opportunity_id,offer_id,offer_type,
        "manual_validation","needs_classification",False,
        ("unsupported_validation_route",),
        ("validation_method",),
    )


def plan_approved_reviews(rows: Sequence[Mapping[str,Any]]) -> tuple[ValidationPlan,...]:
    return tuple(plan_review_row(row) for row in rows if str(row.get("status") or "")=="approved")


def plan_to_dict(plan: ValidationPlan) -> dict[str,Any]:
    return asdict(plan)
