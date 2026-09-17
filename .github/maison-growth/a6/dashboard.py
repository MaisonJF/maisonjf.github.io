from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

DIRECT_PII = re.compile(r"(?i)([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b)")
FORBIDDEN_ORACLE_KEYS = {"answer","answer_text","question_text","reading","reading_text","response_text","oracle_answer","oracle_response"}
VALID_STATUS = {"observed","inferred","missing","fixture"}

class DashboardValidationError(ValueError): pass

@dataclass(frozen=True)
class DashboardFilters:
    territory: str | None = None
    coverage: str | None = None
    state: str | None = None
    source: str | None = None
    data_status: str | None = None


def _walk(value: Any, path: str = "$"):
    if isinstance(value, Mapping):
        for k,v in value.items():
            key=str(k).casefold()
            if key in FORBIDDEN_ORACLE_KEYS:
                raise DashboardValidationError(f"{path}.{k}: paid Oracle content forbidden")
            _walk(v, f"{path}.{k}")
    elif isinstance(value, list):
        for i,v in enumerate(value): _walk(v, f"{path}[{i}]")
    elif isinstance(value, str) and DIRECT_PII.search(value):
        raise DashboardValidationError(f"{path}: direct PII forbidden")


def validate_snapshot(data: Mapping[str, Any]) -> None:
    required = {"meta","needs","intents","assets","solutions","coverage","journeys","economics","oracle_aggregates","clusters","aliases","gaps","candidates","conclusions","evidence"}
    missing = required - set(data)
    if missing: raise DashboardValidationError("missing top-level: " + ", ".join(sorted(missing)))
    status = data["meta"].get("data_status")
    if status not in VALID_STATUS: raise DashboardValidationError("invalid meta data_status")
    _walk(data)
    allowed_oracle = {"territory_key","class_key","usage_count","purchase_count","conversion_count","period_start","period_end","data_status"}
    for row in data["oracle_aggregates"]:
        unknown=set(row)-allowed_oracle
        if unknown: raise DashboardValidationError("oracle aggregate contains non-allowlisted fields: "+", ".join(sorted(unknown)))


def _status(row: Mapping[str,Any], default: str="missing") -> str:
    s=row.get("data_status", default)
    return s if s in VALID_STATUS else "missing"


def _matches(row: Mapping[str,Any], filters: DashboardFilters) -> bool:
    checks = [
        (filters.territory, row.get("territory_key")),
        (filters.coverage, row.get("public_coverage") or row.get("coverage")),
        (filters.state, row.get("state") or row.get("internal_state") or row.get("conclusion_state")),
        (filters.source, row.get("source")),
        (filters.data_status, row.get("data_status")),
    ]
    return all(expected is None or str(actual)==expected for expected,actual in checks)


def filter_snapshot(data: Mapping[str,Any], filters: DashboardFilters) -> dict[str,Any]:
    out={"meta":dict(data["meta"])}
    for key,value in data.items():
        if key=="meta": continue
        out[key]=[dict(row) for row in value if _matches(row,filters)] if isinstance(value,list) else value
    return out


def build_why(conclusion: Mapping[str,Any], evidence_by_id: Mapping[str,Mapping[str,Any]]) -> dict[str,Any]:
    refs=conclusion.get("evidence_refs") or conclusion.get("evidence_refs_json") or []
    if isinstance(refs,str):
        try: refs=json.loads(refs)
        except Exception: refs=[]
    reasons=conclusion.get("reason_codes") or conclusion.get("reason_codes_json") or []
    if isinstance(reasons,str):
        try: reasons=json.loads(reasons)
        except Exception: reasons=[]
    return {
        "reason_codes": reasons,
        "evidence": [evidence_by_id[r] for r in refs if r in evidence_by_id],
        "confidence_score": conclusion.get("confidence_score"),
        "rule_version": conclusion.get("rule_version") or conclusion.get("rule_version_id"),
        "model_version": conclusion.get("model_version") or conclusion.get("model_version_id"),
        "data_status": _status(conclusion),
    }


def _badge(text: Any, kind: str="") -> str:
    return f'<span class="badge {html.escape(kind)}">{html.escape(str(text))}</span>'

def _table(rows: Iterable[Mapping[str,Any]], columns: list[tuple[str,str]], empty: str) -> str:
    rows=list(rows)
    if not rows: return f'<div class="empty">{html.escape(empty)}</div>'
    head=''.join(f'<th>{html.escape(label)}</th>' for _,label in columns)
    body=[]
    for row in rows:
        cells=[]
        for key,_ in columns:
            val=row.get(key,"—")
            if key=="data_status": val=_badge(val,str(val))
            elif key in {"public_coverage","solution_coverage","overall_state","state","internal_state","conclusion_state"}: val=_badge(val,str(val))
            else: val=html.escape(str(val))
            cells.append(f'<td>{val}</td>')
        body.append('<tr>'+''.join(cells)+'</tr>')
    return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def render_dashboard(data: Mapping[str,Any], filters: DashboardFilters | None=None) -> str:
    validate_snapshot(data)
    filters=filters or DashboardFilters()
    view=filter_snapshot(data,filters)
    evidence_by_id={str(e.get("evidence_id")):e for e in data["evidence"] if e.get("evidence_id")}
    fixture = data["meta"].get("data_status")=="fixture"

    why_blocks=[]
    for c in view["conclusions"]:
        why=build_why(c,evidence_by_id)
        why_blocks.append(
            '<details class="why"><summary>Porquê?</summary>'
            f'<p><strong>Conclusão:</strong> {html.escape(str(c.get("conclusion_state","—")))}</p>'
            f'<p><strong>Confiança:</strong> {html.escape(str(why["confidence_score"]))}</p>'
            f'<p><strong>Reason codes:</strong> {html.escape(", ".join(map(str,why["reason_codes"])) or "—")}</p>'
            f'<p><strong>Regra:</strong> {html.escape(str(why["rule_version"] or "—"))} · <strong>Modelo:</strong> {html.escape(str(why["model_version"] or "—"))}</p>'
            f'<p><strong>Proveniência:</strong> {html.escape(str(why["data_status"]))}</p>'
            f'<pre>{html.escape(json.dumps(why["evidence"],ensure_ascii=False,indent=2))}</pre></details>'
        )

    banner = '<div class="fixture-banner">DADOS DE TESTE / FIXTURE — não representam operação real.</div>' if fixture else ''
    css='''<style>body{font-family:system-ui,sans-serif;margin:0;background:#111;color:#eee}.wrap{max-width:1200px;margin:auto;padding:24px}.fixture-banner{padding:12px;background:#4b3510;border:1px solid #d19a2a;margin-bottom:18px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,section{background:#1b1b1b;border:1px solid #333;border-radius:10px;padding:16px;margin:14px 0}.badge{display:inline-block;padding:2px 7px;border:1px solid #555;border-radius:999px;font-size:.82rem}.fixture{border-color:#d19a2a}.observed{border-color:#3d9}.inferred{border-color:#69f}.missing{border-color:#999}.none,.gap{border-color:#d66}.partial{border-color:#db4}.sufficient,.covered{border-color:#5b8}.redundant{border-color:#b8f}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #333;text-align:left;vertical-align:top}.empty{padding:18px;border:1px dashed #555;color:#aaa}.why{margin:10px 0;padding:10px;border:1px solid #444;border-radius:8px}pre{white-space:pre-wrap;word-break:break-word;background:#0b0b0b;padding:10px;border-radius:6px}.meta{color:#aaa;font-size:.9rem}</style>'''
    counts={k:len(view[k]) for k in ("needs","intents","assets","solutions","journeys","clusters","gaps","candidates")}
    cards=''.join(f'<div class="card"><strong>{html.escape(k)}</strong><div>{v}</div></div>' for k,v in counts.items())

    return f'''<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maison Growth · Dashboard v1</title>{css}</head><body><div class="wrap">{banner}<h1>Maison Growth · Dashboard v1</h1><p class="meta">Read-only · {html.escape(str(data["meta"].get("source_label")))} · {html.escape(str(data["meta"].get("generated_at")))}</p><div class="cards">{cards}</div>
<section><h2>Mapa Vivo</h2>{_table(view["needs"],[("canonical_label","Necessidade"),("territory_key","Território"),("internal_state","Estado"),("data_status","Dado")],"Sem necessidades para estes filtros.")}{_table(view["intents"],[("canonical_label","Intenção"),("need_id","Need"),("internal_state","Estado"),("data_status","Dado")],"Sem intenções para estes filtros.")}</section>
<section><h2>Cobertura</h2>{_table(view["coverage"],[("target_id","Alvo"),("public_coverage","Conteúdo"),("solution_coverage","Solução"),("conclusion_state","Conclusão"),("confidence_score","Confiança"),("data_status","Dado")],"Ainda não há avaliações de cobertura.")}</section>
<section><h2>Journeys</h2>{_table(view["journeys"],[("journey_id","Journey"),("first_touch","First touch"),("last_touch","Last touch"),("conversion_count","Conversões"),("data_status","Dado")],"Ainda não há journeys suficientes.")}</section>
<section><h2>Economia</h2>{_table(view["economics"],[("solution_id","Solução"),("revenue_minor","Receita"),("immediate_contribution_minor","Contribuição"),("human_effort_minutes","Min. humanos"),("scalability_score","Escala"),("confidence_class","Confiança"),("data_status","Dado")],"Ainda não há dados económicos.")}</section>
<section><h2>Oráculo — agregado</h2>{_table(view["oracle_aggregates"],[("territory_key","Território"),("class_key","Classe"),("usage_count","Uso"),("purchase_count","Compras"),("conversion_count","Conversões"),("data_status","Dado")],"Sem sinais agregados do Oráculo.")}</section>
<section><h2>Cérebro</h2>{_table(view["clusters"],[("canonical_signature","Cluster"),("internal_state","Estado"),("confidence_score","Confiança"),("data_status","Dado")],"Sem clusters.")}{_table(view["aliases"],[("normalized_alias","Alias"),("status","Estado"),("confidence_score","Confiança"),("data_status","Dado")],"Sem aliases.")}{_table(view["gaps"],[("gap_type","Lacuna"),("status","Estado"),("confidence_class","Confiança"),("data_status","Dado")],"Sem lacunas.")}{_table(view["candidates"],[("candidate_kind","Candidato"),("state","Estado"),("confidence_score","Confiança"),("data_status","Dado")],"Sem candidatos internos.")}</section>
<section><h2>Porquê?</h2>{''.join(why_blocks) if why_blocks else '<div class="empty">Sem conclusões explicáveis para estes filtros.</div>'}</section>
</div></body></html>'''
