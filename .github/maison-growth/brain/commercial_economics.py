#!/usr/bin/env python3
from __future__ import annotations

from typing import Any, Mapping

from commercial_assets import CommercialAssetContext, CommercialAssetError


class CommercialEconomicsError(ValueError):
    pass


def _margin_bps(revenue: int | None, contribution: int | None) -> int | None:
    if revenue is None or contribution is None or revenue <= 0:
        return None
    return int(round((contribution / revenue) * 10000))


def _resolve_service_price(
    snap: Mapping[str,Any],
    selected_price_minor: int | None,
) -> tuple[int | None,str]:
    kind=str(snap.get("price_kind") or "unknown")
    fixed=snap.get("price_minor")
    minimum=snap.get("minimum_price_minor")
    options=snap.get("price_options",[])

    if selected_price_minor is not None and (
        not isinstance(selected_price_minor,int) or selected_price_minor <= 0
    ):
        raise CommercialEconomicsError("selected_price_minor_must_be_positive_int")

    if kind=="fixed":
        price=fixed if isinstance(fixed,int) else None
        if selected_price_minor is not None and selected_price_minor != price:
            raise CommercialEconomicsError("selected_price_conflicts_with_fixed_catalogue_price")
        return price,"fixed_catalogue"

    if selected_price_minor is None:
        return None,"human_selection_required"

    if kind=="multi_format":
        allowed={
            int(row["amount_minor"])
            for row in options
            if isinstance(row,Mapping) and isinstance(row.get("amount_minor"),int)
        }
        if selected_price_minor not in allowed:
            raise CommercialEconomicsError("selected_price_not_in_catalogue_service_options")
        return selected_price_minor,"human_selected_catalogue_option"

    if kind=="starting_from":
        if not isinstance(minimum,int) or selected_price_minor < minimum:
            raise CommercialEconomicsError("selected_price_below_catalogue_minimum")
        return selected_price_minor,"human_selected_at_or_above_minimum"

    if kind in {"quote","unknown"}:
        return selected_price_minor,"human_selected_quote"

    raise CommercialEconomicsError(f"unsupported_service_price_kind:{kind}")


def evaluate_asset(
    context: CommercialAssetContext,
    asset_ref: str,
    *,
    selected_price_minor: int | None=None,
) -> dict[str,Any]:
    snap=context.operational_snapshot(asset_ref)
    op=snap["operational"]
    asset_type=snap["asset_type"]
    price=snap["price_minor"] if isinstance(snap["price_minor"],int) else None

    if asset_type=="physical_product":
        if selected_price_minor is not None:
            raise CommercialEconomicsError("selected_price_not_supported_for_physical_asset")
        inventory=op.get("inventory_quantity")
        reserved=op.get("reserved_quantity")
        material=op.get("unit_material_cost_minor")
        packaging=op.get("packaging_cost_minor")
        stock_known=isinstance(inventory,int) and isinstance(reserved,int)
        available=max(inventory-reserved,0) if stock_known else None
        production_minutes=op.get("production_minutes_per_unit")
        batch_capacity=op.get("batch_capacity_units")
        replenishment_known=(
            isinstance(production_minutes,int)
            and isinstance(batch_capacity,int)
            and batch_capacity > 0
        )
        cost_known=isinstance(material,int) and isinstance(packaging,int)
        unit_cost=material+packaging if cost_known else None
        contribution=price-unit_cost if price is not None and unit_cost is not None else None
        blockers=[]
        if not cost_known:
            blockers.append("unit_cost_incomplete")
        if not replenishment_known:
            blockers.append("replenishment_capacity_incomplete")
        if price is None:
            blockers.append("price_unknown")
        signals=[]
        if not stock_known:
            signals.append("current_stock_snapshot_unknown")
        elif available == 0:
            signals.append("no_units_available_at_observation")
        return {
            "asset_ref":asset_ref,
            "asset_type":asset_type,
            "name":snap["name"],
            "currency":snap["currency"],
            "price_minor":price,
            "available_units":available,
            "stock_snapshot_known":stock_known,
            "stock_snapshot_is_readiness_gate":False,
            "production_minutes_per_unit":production_minutes if isinstance(production_minutes,int) else None,
            "batch_capacity_units":batch_capacity if isinstance(batch_capacity,int) else None,
            "replenishment_capacity_known":replenishment_known,
            "unit_cost_minor":unit_cost,
            "unit_contribution_minor":contribution,
            "contribution_margin_bps":_margin_bps(price,contribution),
            "operational_facts_complete":cost_known and replenishment_known,
            "unit_economics_known":price is not None and unit_cost is not None,
            "manual_validation_ready":not blockers,
            "blockers":blockers,
            "signals":signals,
            "operational_evidence_refs":snap["operational_evidence_refs"],
            "authority":{
                "public_write_authorized":False,
                "discount_authorized":False,
                "stock_promise_authorized":False,
                "automatic_checkout_authorized":False,
                "experiment_execution_authorized":False,
            },
        }

    if asset_type in {"service","b2b_service"}:
        price,price_resolution=_resolve_service_price(snap,selected_price_minor)
        capacity=op.get("capacity_units_per_period")
        period=op.get("capacity_period")
        effort=op.get("human_effort_minutes")
        variable=op.get("variable_cost_minor")
        lead=op.get("delivery_lead_days")
        capacity_known=isinstance(capacity,int) and isinstance(period,str) and bool(period.strip())
        delivery_known=isinstance(effort,int) and isinstance(lead,int)
        cost_known=isinstance(variable,int)
        contribution=price-variable if price is not None and cost_known else None
        blockers=[]
        if not capacity_known:
            blockers.append("capacity_incomplete")
        if not delivery_known:
            blockers.append("delivery_effort_incomplete")
        if not cost_known:
            blockers.append("variable_cost_unknown")
        if price is None:
            blockers.append("concrete_price_unknown")
        return {
            "asset_ref":asset_ref,
            "asset_type":asset_type,
            "name":snap["name"],
            "currency":snap["currency"],
            "price_minor":price,
            "price_kind":snap.get("price_kind"),
            "minimum_price_minor":snap.get("minimum_price_minor"),
            "price_options":snap.get("price_options",[]),
            "price_resolution":price_resolution,
            "price_selection_required":price_resolution=="human_selection_required",
            "capacity_units_per_period":capacity if isinstance(capacity,int) else None,
            "capacity_period":period if isinstance(period,str) else None,
            "human_effort_minutes":effort if isinstance(effort,int) else None,
            "delivery_lead_days":lead if isinstance(lead,int) else None,
            "variable_cost_minor":variable if isinstance(variable,int) else None,
            "unit_contribution_minor":contribution,
            "contribution_margin_bps":_margin_bps(price,contribution),
            "operational_facts_complete":capacity_known and delivery_known and cost_known,
            "unit_economics_known":price is not None and cost_known,
            "manual_validation_ready":not blockers,
            "blockers":blockers,
            "operational_evidence_refs":snap["operational_evidence_refs"],
            "authority":{
                "public_write_authorized":False,
                "discount_authorized":False,
                "stock_promise_authorized":False,
                "automatic_checkout_authorized":False,
                "experiment_execution_authorized":False,
            },
        }

    raise CommercialEconomicsError(f"unsupported_asset_type:{asset_type}")


def evaluate_bundle(
    *,
    bundle: Mapping[str,Any],
    context: CommercialAssetContext,
    proposed_price_minor: int | None=None,
) -> dict[str,Any]:
    refs=bundle.get("asset_refs",[])
    if not isinstance(refs,list) or not refs:
        raise CommercialEconomicsError("bundle_asset_refs_required")

    parts=[evaluate_asset(context,str(ref)) for ref in refs]
    if any(part["asset_type"]!="physical_product" for part in parts):
        raise CommercialEconomicsError("bundle_requires_physical_products")

    stock_known=all(part["available_units"] is not None for part in parts)
    available_bundle_units=min(part["available_units"] for part in parts) if stock_known else None
    costs_known=all(part["unit_cost_minor"] is not None for part in parts)
    combined_cost=sum(part["unit_cost_minor"] for part in parts) if costs_known else None
    subtotal=bundle.get("catalogue_subtotal_minor")
    subtotal=subtotal if isinstance(subtotal,int) else None

    if proposed_price_minor is not None:
        if not isinstance(proposed_price_minor,int) or proposed_price_minor <= 0:
            raise CommercialEconomicsError("proposed_price_minor_must_be_positive_int")

    contribution=(
        proposed_price_minor-combined_cost
        if proposed_price_minor is not None and combined_cost is not None
        else None
    )
    blockers=[]
    if available_bundle_units is None:
        blockers.append("bundle_stock_incomplete")
    elif available_bundle_units <= 0:
        blockers.append("bundle_out_of_stock")
    if combined_cost is None:
        blockers.append("bundle_cost_incomplete")
    if proposed_price_minor is None:
        blockers.append("human_price_not_supplied")

    return {
        "bundle_id":str(bundle.get("bundle_id") or ""),
        "label":str(bundle.get("label") or ""),
        "asset_refs":[str(x) for x in refs],
        "catalogue_subtotal_minor":subtotal,
        "available_bundle_units":available_bundle_units,
        "combined_unit_cost_minor":combined_cost,
        "proposed_price_minor":proposed_price_minor,
        "difference_from_catalogue_subtotal_minor":(
            proposed_price_minor-subtotal
            if proposed_price_minor is not None and subtotal is not None
            else None
        ),
        "unit_contribution_minor":contribution,
        "contribution_margin_bps":_margin_bps(proposed_price_minor,contribution),
        "manual_validation_ready":not blockers,
        "blockers":blockers,
        "authority":{
            "bundle_price_selected_by_system":False,
            "discount_authorized":False,
            "public_write_authorized":False,
            "stock_promise_authorized":False,
            "automatic_checkout_authorized":False,
            "experiment_execution_authorized":False,
        },
    }
