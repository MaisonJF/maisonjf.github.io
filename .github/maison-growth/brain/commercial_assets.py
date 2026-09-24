#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Optional


class CommercialAssetError(ValueError):
    pass


PHYSICAL_OPERATIONAL_FIELDS=(
    "inventory_quantity",
    "reserved_quantity",
    "unit_material_cost_minor",
    "packaging_cost_minor",
    "production_minutes_per_unit",
    "batch_capacity_units",
    "moq_units",
    "shelf_life_days",
    "supplier_lead_days",
)
SERVICE_OPERATIONAL_FIELDS=(
    "capacity_units_per_period",
    "capacity_period",
    "human_effort_minutes",
    "variable_cost_minor",
    "delivery_lead_days",
)
DIGITAL_OPERATIONAL_FIELDS=(
    "human_effort_minutes",
    "variable_cost_minor",
    "delivery_lead_days",
)


@dataclass(frozen=True)
class CommercialAssetHit:
    ref: str
    label: str
    score: float
    asset_type: str
    lifecycle_status: str
    public: bool
    price_minor: Optional[int]
    currency: Optional[str]
    catalogue_availability: Optional[str]
    known_operational_fields: tuple[str,...]
    unknown_operational_fields: tuple[str,...]
    operational_evidence_refs: tuple[str,...]


def _tokens(text: str) -> frozenset[str]:
    return frozenset(
        x for x in re.sub(r"[^a-zA-ZÀ-ÿ0-9]+"," ",text.lower()).split()
        if len(x)>2
    )


def _overlap(query: str, text: str) -> float:
    a,b=_tokens(query),_tokens(text)
    if not a or not b:
        return 0.0
    return len(a & b)/len(a | b)


def _operational_fields(asset_type: str) -> tuple[str,...]:
    if asset_type=="physical_product":
        return PHYSICAL_OPERATIONAL_FIELDS
    if asset_type=="digital_product":
        return DIGITAL_OPERATIONAL_FIELDS
    return SERVICE_OPERATIONAL_FIELDS


class CommercialAssetContext:
    """Read-only commercial asset context.

    Catalogue data is a rebuildable projection of Maison's existing public/internal
    catalogues. Optional private overlay facts may add stock/cost/capacity observations.
    None always means UNKNOWN. Public catalogue availability never becomes counted inventory.
    """

    def __init__(
        self,
        registry: Mapping[str,Any],
        *,
        overlay: Optional[Mapping[str,Any]]=None,
    ):
        assets=registry.get("assets",[])
        if not isinstance(assets,list):
            raise CommercialAssetError("registry_assets_must_be_array")
        self.assets={str(row["asset_ref"]):dict(row) for row in assets if isinstance(row,Mapping)}
        if len(self.assets)!=len(assets):
            raise CommercialAssetError("duplicate_or_invalid_asset_ref")
        self.overlay_observed_at=None
        self.overlay_rows:dict[str,dict[str,Any]]={}
        if overlay is not None:
            self._load_overlay(overlay)

    @classmethod
    def from_files(
        cls,
        registry_path: Path,
        *,
        overlay_path: Optional[Path]=None,
    ) -> "CommercialAssetContext":
        registry=json.loads(registry_path.read_text(encoding="utf-8"))
        overlay=None
        if overlay_path is not None:
            overlay=json.loads(overlay_path.read_text(encoding="utf-8"))
        return cls(registry,overlay=overlay)

    def _load_overlay(self, overlay: Mapping[str,Any]) -> None:
        if overlay.get("schema_version")!="commercial_asset_overlay_v1":
            raise CommercialAssetError("unsupported_overlay_schema")
        observed_at=str(overlay.get("observed_at") or "").strip()
        if not observed_at:
            raise CommercialAssetError("overlay_observed_at_required")
        rows=overlay.get("assets",[])
        if not isinstance(rows,list):
            raise CommercialAssetError("overlay_assets_must_be_array")
        seen=set()
        for raw in rows:
            if not isinstance(raw,Mapping):
                raise CommercialAssetError("overlay_asset_must_be_object")
            ref=str(raw.get("asset_ref") or "").strip()
            if ref not in self.assets:
                raise CommercialAssetError(f"overlay_unknown_asset:{ref}")
            if ref in seen:
                raise CommercialAssetError(f"overlay_duplicate_asset:{ref}")
            seen.add(ref)
            operational=raw.get("operational",{})
            if not isinstance(operational,Mapping):
                raise CommercialAssetError("overlay_operational_must_be_object")
            allowed=set(_operational_fields(str(self.assets[ref].get("asset_type"))))
            extra=set(operational)-allowed
            if extra:
                raise CommercialAssetError("overlay_unknown_operational_fields:"+",".join(sorted(extra)))
            known={k:v for k,v in operational.items() if v is not None}
            for key,value in known.items():
                if key=="capacity_period":
                    if not isinstance(value,str) or not value.strip():
                        raise CommercialAssetError("capacity_period_must_be_string")
                elif not isinstance(value,int) or isinstance(value,bool) or value<0:
                    raise CommercialAssetError(f"operational_value_invalid:{key}")
            evidence=raw.get("evidence_refs",[])
            if not isinstance(evidence,list):
                raise CommercialAssetError("overlay_evidence_refs_must_be_array")
            refs=tuple(sorted(set(str(x) for x in evidence if str(x).strip())))
            if known and not refs:
                raise CommercialAssetError("known_operational_values_require_evidence_refs")
            self.overlay_rows[ref]={
                "operational":dict(operational),
                "evidence_refs":refs,
                "source":str(raw.get("source") or "manual_private"),
            }
        self.overlay_observed_at=observed_at

    def _effective(self, ref: str) -> tuple[dict[str,Any],tuple[str,...]]:
        base=dict(self.assets[ref])
        operational=dict(base.get("operational",{}))
        evidence=()
        extra=self.overlay_rows.get(ref)
        if extra:
            for key,value in extra["operational"].items():
                if value is not None:
                    operational[key]=value
            evidence=extra["evidence_refs"]
        base["operational"]=operational
        return base,evidence

    def operational_snapshot(self, ref: str) -> dict[str,Any]:
        """Return one effective asset for private operator-side economics checks.

        This method does not grant any execution authority and is not exposed by the
        general read-only MCP asset search.
        """
        if ref not in self.assets:
            raise CommercialAssetError(f"unknown_asset_ref:{ref}")
        asset,evidence=self._effective(ref)
        return {
            "asset_ref":ref,
            "asset_type":str(asset.get("asset_type") or "unknown"),
            "name":str(asset.get("name") or ref),
            "public":bool(asset.get("public")),
            "lifecycle_status":str(asset.get("lifecycle_status") or "unknown"),
            "price_minor":asset.get("price_minor"),
            "price_label":asset.get("price_label"),
            "price_kind":asset.get("price_kind"),
            "minimum_price_minor":asset.get("minimum_price_minor"),
            "price_options":list(asset.get("price_options",[])) if isinstance(asset.get("price_options"),list) else [],
            "price_source":asset.get("price_source"),
            "currency":asset.get("currency"),
            "operational":dict(asset.get("operational",{})),
            "operational_evidence_refs":evidence,
            "execution_authority":False,
        }

    def search(self, query: str, *, limit: int=6) -> tuple[CommercialAssetHit,...]:
        if not 1<=limit<=30:
            raise CommercialAssetError("limit_must_be_1_30")
        rows=[]
        for ref in sorted(self.assets):
            asset,evidence=self._effective(ref)
            haystack=" ".join(str(x) for x in (
                asset.get("name",""),
                asset.get("category",""),
                asset.get("description",""),
                *(asset.get("search_context",[]) if isinstance(asset.get("search_context"),list) else []),
            ))
            score=_overlap(query,haystack)
            if score<=0:
                continue
            fields=_operational_fields(str(asset.get("asset_type")))
            operational=asset.get("operational",{})
            known=tuple(sorted(k for k in fields if operational.get(k) is not None))
            unknown=tuple(sorted(k for k in fields if operational.get(k) is None))
            rows.append(CommercialAssetHit(
                ref=f"asset:{ref}",
                label=str(asset.get("name") or ref),
                score=score,
                asset_type=str(asset.get("asset_type") or "unknown"),
                lifecycle_status=str(asset.get("lifecycle_status") or "unknown"),
                public=bool(asset.get("public")),
                price_minor=asset.get("price_minor"),
                currency=asset.get("currency"),
                catalogue_availability=asset.get("catalogue_availability"),
                known_operational_fields=known,
                unknown_operational_fields=unknown,
                operational_evidence_refs=evidence,
            ))
        return tuple(sorted(rows,key=lambda x:(-x.score,x.ref))[:limit])

    def summary(self) -> dict[str,Any]:
        operational_known=0
        operational_unknown=0
        overlay_assets=0
        for ref in self.assets:
            asset,_=self._effective(ref)
            fields=_operational_fields(str(asset.get("asset_type")))
            values=asset.get("operational",{})
            operational_known+=sum(values.get(k) is not None for k in fields)
            operational_unknown+=sum(values.get(k) is None for k in fields)
            if ref in self.overlay_rows:
                overlay_assets+=1
        return {
            "asset_count":len(self.assets),
            "private_overlay_loaded":bool(self.overlay_rows),
            "overlay_asset_count":overlay_assets,
            "overlay_observed_at":self.overlay_observed_at,
            "known_operational_fields":operational_known,
            "unknown_operational_fields":operational_unknown,
            "catalogue_in_stock_is_counted_inventory":False,
        }
