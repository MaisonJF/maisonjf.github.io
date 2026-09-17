#!/usr/bin/env python3
from __future__ import annotations
import html, json
from typing import Any, Mapping, Iterable
from engine import prioritized_inbox

def why(action:Mapping[str,Any])->dict[str,Any]:
    w=dict(action.get('why') or {})
    return {'action_key':action.get('action_key'),'risk_class':action.get('risk_class'),'autonomy_level':action.get('autonomy_level'),'status':action.get('status'),'reason_codes':w.get('reason_codes',[]),'evidence_refs':w.get('evidence_refs',[]),'confidence_score':w.get('confidence_score'),'rule_version_id':w.get('rule_version_id'),'model_version_id':w.get('model_version_id'),'public_write_authorized':False}

def build_dashboard_v2(snapshot:Mapping[str,Any])->str:
    health=snapshot.get('health',{}); inbox=prioritized_inbox(snapshot.get('human_queue',[]),10); actions=list(snapshot.get('actions',[]))[-20:]
    def esc(x): return html.escape(str(x))
    inbox_html=''.join(f"<li><strong>{esc(x.get('priority'))}</strong> · {esc(x.get('action',{}).get('action_key'))} · {esc(x.get('queue_id'))}</li>" for x in inbox) or '<li>Sem decisões pendentes.</li>'
    action_html=[]
    for a in actions:
        w=why(a)
        action_html.append(f"<details><summary>{esc(a.get('action_key'))} · {esc(a.get('status'))}</summary><h4>Porquê?</h4><pre>{esc(json.dumps(w,ensure_ascii=False,indent=2))}</pre></details>")
    return f'''<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Maison Growth · Dashboard v2</title></head><body><main><h1>Dashboard v2</h1><p>Read-only · autonomia pública: DESACTIVADA</p><section><h2>Health</h2><pre>{esc(json.dumps(health,ensure_ascii=False,indent=2))}</pre></section><section><h2>Inbox prioritária</h2><ol>{inbox_html}</ol></section><section><h2>Acções recentes</h2>{''.join(action_html) or '<p>Sem acções.</p>'}</section></main></body></html>'''
