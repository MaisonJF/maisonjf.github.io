#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping, Optional, Sequence

from commercial_assets import CommercialAssetContext, CommercialAssetHit


class PilotDossierError(ValueError):
    pass


@dataclass(frozen=True)
class PilotDossier:
    validation_plan_id: str
    opportunity_id: str
    offer_hypothesis_id: str
    plan_kind: str
    objective: str
    hypothesis: str
    territory_code: Optional[str]
    offer_type: Optional[str]
    validation_mode: Optional[str]
    asset_candidates: tuple[Mapping[str,Any],...]
    known_economics: Mapping[str,Any]
    unknown_economics: tuple[str,...]
    required_inputs: tuple[str,...]
    next_human_steps: tuple[str,...]
    success_signals: tuple[str,...]
    stop_signals: tuple[str,...]
    evidence_refs: tuple[str,...]
    ready_state: str
    reason_codes: tuple[str,...]
    outbound_authorized: bool=False
    spend_authorized: bool=False
    public_write_authorized: bool=False
    experiment_execution_authorized: bool=False


def _known_economics(raw: object) -> tuple[dict[str,Any],tuple[str,...]]:
    if not isinstance(raw,Mapping):
        return {},()
    known={}
    unknown=[]
    for key,value in raw.items():
        if value is None:
            unknown.append(str(key))
        else:
            known[str(key)]=value
    return known,tuple(sorted(set(unknown)))


def _asset_payload(hit: CommercialAssetHit) -> dict[str,Any]:
    return {
        "ref":hit.ref,
        "label":hit.label,
        "match_score":round(hit.score,6),
        "asset_type":hit.asset_type,
        "lifecycle_status":hit.lifecycle_status,
        "public":hit.public,
        "price_minor":hit.price_minor,
        "currency":hit.currency,
        "catalogue_availability":hit.catalogue_availability,
        "known_operational_fields":hit.known_operational_fields,
        "unknown_operational_fields":hit.unknown_operational_fields,
        "stock_snapshot_is_readiness_gate":False if hit.asset_type=="physical_product" else None,
        "operational_evidence_refs":hit.operational_evidence_refs,
    }


def _asset_query(plan: Mapping[str,Any]) -> str:
    values=[
        plan.get("offer_type"),
        plan.get("territory_code"),
        plan.get("hypothesis"),
        plan.get("validation_mode"),
    ]
    return " ".join(str(x) for x in values if x)


def _base_inputs(plan: Mapping[str,Any]) -> list[str]:
    missing=[]
    if not plan.get("territory_code"):
        missing.append("territory_code")
    if not plan.get("offer_type"):
        missing.append("offer_type")
    if not plan.get("hypothesis"):
        missing.append("hypothesis")
    return missing


def _context_present(inputs: Mapping[str,Any], key: str) -> bool:
    value=inputs.get(key)
    if isinstance(value,str):
        return bool(value.strip())
    return value is not None


def _context_has_economics(inputs: Mapping[str,Any]) -> bool:
    return any(
        _context_present(inputs,key)
        for key in (
            "unit_or_project_cost_minor",
            "direct_cost_minor",
            "cost_basis",
            "price_or_quote_rule",
        )
    )


def _manual_requirements(
    plan_kind: str,
    *,
    asset_hits: Sequence[CommercialAssetHit],
    economics: Mapping[str,Any],
    pilot_inputs: Mapping[str,Any],
) -> tuple[list[str],tuple[str,...],tuple[str,...],tuple[str,...]]:
    missing=[]
    success=[]
    stop=[]
    steps=[]
    known_operational={
        field
        for hit in asset_hits
        for field in hit.known_operational_fields
    }
    has_catalogue_price=any(hit.price_minor is not None for hit in asset_hits)
    stock_snapshot_fields={"inventory_quantity","reserved_quantity"}

    def has_complete_candidate(required: set[str], *, allowed_types: set[str] | None=None) -> bool:
        for hit in asset_hits:
            if allowed_types is not None and hit.asset_type not in allowed_types:
                continue
            if required.issubset(set(hit.known_operational_fields)):
                return True
        return False

    if plan_kind=="manual_b2b_pilot":
        steps.extend((
            "Definir o perfil exacto de parceiro/cliente B2B para este piloto.",
            "Escolher a proposta Maison mínima usando activos existentes antes de criar produto novo.",
            "Preparar uma proposta de uma página com personalização, prazo, capacidade e preço apenas quando esses dados forem conhecidos.",
            "Submeter a lista de contactos e a mensagem a aprovação humana antes de qualquer outreach.",
            "Registar respostas, pedidos de orçamento, encomendas e margem observada no fluxo A3.",
        ))
        success=("pedido_de_reuniao_ou_orcamento","encomenda_paga","margem_observada_positiva","sinal_de_recorrencia")
        stop=("capacidade_insuficiente","margem_desconhecida_ou_negativa","personalizacao_inviavel","sem_acesso_ao_decisor")
        if not _context_present(pilot_inputs,"target_profile"):
            missing.append("target_profile")
        if (
            not ({"capacity_units_per_period","batch_capacity_units"} & known_operational)
            and not _context_present(pilot_inputs,"capacity_basis")
        ):
            missing.append("capacity")
        if (
            not ({"variable_cost_minor","unit_material_cost_minor"} & known_operational)
            and not economics
            and not _context_present(pilot_inputs,"unit_or_project_cost_minor")
            and not _context_present(pilot_inputs,"cost_basis")
        ):
            missing.append("unit_or_project_cost")
        if (
            not has_catalogue_price
            and not any("price" in str(k).lower() for k in economics)
            and not _context_present(pilot_inputs,"price_or_quote_rule")
        ):
            missing.append("price_or_quote_rule")
        if (
            not ({"delivery_lead_days","supplier_lead_days"} & known_operational)
            and not _context_present(pilot_inputs,"fulfilment_lead_time_days")
        ):
            missing.append("fulfilment_lead_time")

    elif plan_kind=="manual_physical_pilot":
        steps.extend((
            "Seleccionar o produto existente ou combinação de stock mais próxima da oportunidade.",
            "Confirmar matérias-primas, embalagem, custo unitário e capacidade de reposição antes de fabricar; stock acabado é apenas um snapshot temporal.",
            "Escolher micro-lote, amostra, conceito ou pré-encomenda conforme o risco operacional conhecido.",
            "Preparar apresentação e oferta do piloto sem alterar catálogo/preço público automaticamente.",
            "Registar unidades produzidas, vendidas, margem, devoluções e procura repetida.",
        ))
        success=("venda_paga","margem_unitaria_observada_positiva","procura_repetida","baixo_desperdicio")
        stop=("materia_prima_ou_capacidade_insuficiente","custo_unitario_desconhecido","margem_negativa","risco_de_validade_ou_desperdicio")
        physical_required={
            "unit_material_cost_minor",
            "packaging_cost_minor",
            "production_minutes_per_unit",
            "batch_capacity_units",
        }
        if not has_complete_candidate(physical_required,allowed_types={"physical_product"}):
            for key in sorted(physical_required):
                if not any(
                    hit.asset_type=="physical_product" and key in hit.known_operational_fields
                    for hit in asset_hits
                ):
                    missing.append(key)
            missing.append("single_physical_candidate_with_complete_operational_facts")
        missing[:]=[x for x in missing if x not in stock_snapshot_fields]

    elif plan_kind=="manual_service_pilot":
        steps.extend((
            "Definir uma entrega mínima concreta para o serviço aprovado.",
            "Confirmar duração, capacidade humana, custo variável e limite semanal antes de abrir vagas.",
            "Escolher um número de vagas compatível com capacidade observada, sem inventar escala.",
            "Preparar a oferta e o guião de entrega para revisão humana.",
            "Registar reservas/pagamentos, tempo real gasto, margem e intenção de repetir.",
        ))
        success=("reserva_ou_pagamento","margem_por_hora_observada_positiva","entrega_dentro_da_capacidade","repeticao_ou_recomendacao")
        stop=("sobrecarga_de_capacidade","tempo_real_muito_acima_do_previsto","margem_negativa","qualidade_nao_repetivel")
        service_required={
            "capacity_units_per_period",
            "capacity_period",
            "human_effort_minutes",
            "variable_cost_minor",
        }
        if not has_complete_candidate(service_required,allowed_types={"service","b2b_service"}):
            for key in sorted(service_required):
                if not any(
                    hit.asset_type in {"service","b2b_service"} and key in hit.known_operational_fields
                    for hit in asset_hits
                ):
                    missing.append(key)
            missing.append("single_service_candidate_with_complete_operational_facts")

    elif plan_kind=="manual_distribution_pilot":
        steps.extend((
            "Seleccionar o canal/parceiro com base no match contextual já evidenciado.",
            "Escolher ZERO_CASH/PR antes de seeding pago quando ambos puderem testar a mesma hipótese.",
            "Se houver envio de produto, confirmar COGS + embalagem + portes antes da aprovação.",
            "Submeter outreach/seeding a aprovação humana.",
            "Medir tráfego, menções, leads, vendas, margem e Distribution Value observada.",
        ))
        success=("mencao_qualificada","trafego_atribuivel","lead_b2b","venda_atribuivel","distribuicao_repetivel")
        stop=("fit_insuficiente","custo_de_activacao_desconhecido","sem_atribuicao_minima","risco_reputacional")
        for key in ("amplifier_or_partner_ref","activation_strategy","direct_cost_minor","attribution_method"):
            if not _context_present(pilot_inputs,key):
                missing.append(key)

    else:
        steps.extend((
            "Definir o comportamento de compra que o piloto pretende observar.",
            "Escolher o menor teste que produza uma decisão comercial útil.",
            "Preencher custos, capacidade e critério de sucesso antes de actuar.",
            "Submeter qualquer efeito externo a aprovação humana.",
            "Registar resultado observado para A3/A11.",
        ))
        success=("comportamento_de_compra_observado","economia_observada","decisao_comercial_melhor_informada")
        stop=("hipotese_nao_testavel","custos_ou_capacidade_desconhecidos","efeito_externo_nao_aprovado")
        for key in ("purchase_behaviour","pilot_scope","cost_basis","capacity_basis"):
            if not _context_present(pilot_inputs,key):
                missing.append(key)

    if not asset_hits and not _context_present(
        pilot_inputs,
        "explicit_new_offer_decision_ref",
    ):
        missing.append("existing_asset_match_or_explicit_new_offer_decision")
    if not economics and not _context_has_economics(pilot_inputs):
        missing.append("observed_or_explicit_economic_inputs")

    return missing,tuple(steps),tuple(success),tuple(stop)


def build_pilot_dossier(
    plan: Mapping[str,Any],
    *,
    assets: CommercialAssetContext,
    pilot_context: Mapping[str,Any] | None=None,
    asset_limit: int=5,
) -> PilotDossier:
    plan_kind=str(plan.get("plan_kind") or "")
    if plan_kind not in {
        "manual_b2b_pilot","manual_service_pilot","manual_physical_pilot",
        "manual_distribution_pilot","manual_validation",
    }:
        raise PilotDossierError("manual_validation_plan_required")
    if str(plan.get("state") or "")!="manual_pilot_required":
        raise PilotDossierError("manual_pilot_required_state_expected")

    hypothesis=str(plan.get("hypothesis") or "").strip()
    if len(hypothesis)<10:
        raise PilotDossierError("pilot_hypothesis_required")

    economics_raw=plan.get("economics",{})
    known_econ,unknown_econ=_known_economics(economics_raw)
    hits=assets.search(_asset_query(plan),limit=asset_limit)

    context=dict(pilot_context or {})
    raw_inputs=context.get("inputs",{})
    if not isinstance(raw_inputs,Mapping):
        raise PilotDossierError("manual_pilot_context_inputs_must_be_object")
    pilot_inputs=dict(raw_inputs)
    raw_context_refs=context.get("evidence_refs",())
    if not isinstance(raw_context_refs,(list,tuple)):
        raise PilotDossierError("manual_pilot_context_evidence_refs_must_be_array")

    missing=_base_inputs(plan)
    kind_missing,steps,success,stop=_manual_requirements(
        plan_kind,
        asset_hits=hits,
        economics=known_econ,
        pilot_inputs=pilot_inputs,
    )
    missing.extend(kind_missing)
    missing.extend(unknown_econ)
    missing=sorted(set(missing))

    ready="needs_input" if missing else "ready_for_human_action_review"
    objective={
        "manual_b2b_pilot":"Conseguir um sinal B2B real — reunião, orçamento ou encomenda — com economia observável.",
        "manual_physical_pilot":"Observar compra real de um micro-piloto físico sem produzir stock desnecessário.",
        "manual_service_pilot":"Observar reserva/pagamento e capacidade real de entrega do serviço.",
        "manual_distribution_pilot":"Observar distribuição/atenção qualificada e valor atribuível sem comprar alcance por defeito.",
        "manual_validation":"Observar comportamento de compra suficiente para decidir continuar, alterar ou parar.",
    }[plan_kind]

    refs=set(str(x) for x in plan.get("evidence_refs",()) if x)
    refs.update(str(x) for x in raw_context_refs if x)
    for hit in hits:
        refs.update(hit.operational_evidence_refs)

    reasons=list(str(x) for x in plan.get("reason_codes",()) if x)
    reasons.append("manual_pilot_requires_human_external_action")
    if pilot_inputs:
        reasons.append("private_evidence_backed_pilot_context_applied")
    if missing:
        reasons.append("pilot_inputs_incomplete")
    else:
        reasons.append("pilot_inputs_complete_for_human_review")

    return PilotDossier(
        validation_plan_id=str(plan["validation_plan_id"]),
        opportunity_id=str(plan["opportunity_id"]),
        offer_hypothesis_id=str(plan["offer_hypothesis_id"]),
        plan_kind=plan_kind,
        objective=objective,
        hypothesis=hypothesis,
        territory_code=plan.get("territory_code"),
        offer_type=plan.get("offer_type"),
        validation_mode=plan.get("validation_mode"),
        asset_candidates=tuple(_asset_payload(x) for x in hits),
        known_economics=known_econ,
        unknown_economics=unknown_econ,
        required_inputs=tuple(missing),
        next_human_steps=steps,
        success_signals=success,
        stop_signals=stop,
        evidence_refs=tuple(sorted(refs)),
        ready_state=ready,
        reason_codes=tuple(dict.fromkeys(reasons)),
    )


def dossier_to_dict(dossier: PilotDossier) -> dict[str,Any]:
    return asdict(dossier)
