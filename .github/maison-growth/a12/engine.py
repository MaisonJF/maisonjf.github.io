#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping

ROOT=Path(__file__).resolve().parent
POLICY=json.loads((ROOT/'autonomy-policy.json').read_text(encoding='utf-8'))

class AutonomyError(Exception): pass
class KillSwitchActive(AutonomyError): pass
class CircuitOpen(AutonomyError): pass
class ThresholdNotMet(AutonomyError): pass
class HumanApprovalRequired(AutonomyError): pass
class DuplicateJobRun(AutonomyError): pass
class LockConflict(AutonomyError): pass
class RateLimitExceeded(AutonomyError): pass
class ForbiddenAutonomy(AutonomyError): pass

def canonical(v:Any)->str: return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def stable_id(prefix:str,payload:Any)->str: return prefix+hashlib.sha256(canonical(payload).encode()).hexdigest()[:36]

def risk_for(action_key:str)->str:
    return POLICY['risk_rules'].get(action_key,'critical')

def autonomous_level(action_key:str, evidence_count:int, confidence_score:int, requested_level:str)->tuple[str,list[str]]:
    risk=risk_for(action_key); reasons=[f'RISK_{risk.upper()}']
    if requested_level=='paused': return 'paused',reasons+['PAUSED_REQUESTED']
    if action_key in POLICY['public_action_keys']:
        return 'human_approval_required',reasons+['PUBLIC_AUTONOMY_DISABLED']
    if risk in {'high','critical'}:
        return 'human_approval_required',reasons+['HIGH_RISK_HUMAN_REQUIRED']
    if requested_level=='low_risk_auto':
        t=POLICY['thresholds']['low_risk_auto']
        if action_key not in POLICY['low_risk_auto_allowlist']:
            return 'human_approval_required',reasons+['ACTION_NOT_AUTO_ALLOWLISTED']
        if evidence_count<t['min_evidence_count']: return 'recommend',reasons+['INSUFFICIENT_EVIDENCE_FOR_AUTO']
        if confidence_score<t['min_confidence_score']: return 'recommend',reasons+['INSUFFICIENT_CONFIDENCE_FOR_AUTO']
        return 'low_risk_auto',reasons+['LOW_RISK_AUTO_THRESHOLDS_PASSED']
    if requested_level=='recommend':
        t=POLICY['thresholds']['recommend']
        if evidence_count<t['min_evidence_count'] or confidence_score<t['min_confidence_score']:
            return 'observe_only',reasons+['RECOMMEND_THRESHOLD_NOT_MET']
        return 'recommend',reasons+['RECOMMEND_THRESHOLD_PASSED']
    if requested_level=='human_approval_required': return requested_level,reasons+['HUMAN_APPROVAL_REQUESTED']
    return 'observe_only',reasons+['OBSERVE_ONLY_DEFAULT']

@dataclass
class CircuitBreaker:
    failure_threshold:int=field(default_factory=lambda:POLICY['limits']['max_failures_before_circuit_open'])
    consecutive_failures:int=0
    state:str='closed'
    def record(self, ok:bool)->str:
        if self.state=='open': return self.state
        if ok: self.consecutive_failures=0
        else: self.consecutive_failures+=1
        if self.consecutive_failures>=self.failure_threshold: self.state='open'
        return self.state
    def reset_by_human(self): self.consecutive_failures=0; self.state='closed'

@dataclass
class SchedulerState:
    kill_switch:bool=True
    completed_keys:set[str]=field(default_factory=set)
    active_locks:dict[str,str]=field(default_factory=dict)
    window_counts:dict[str,int]=field(default_factory=dict)
    circuit:CircuitBreaker=field(default_factory=CircuitBreaker)
    actions:list[dict[str,Any]]=field(default_factory=list)
    human_queue:list[dict[str,Any]]=field(default_factory=list)
    alerts:list[dict[str,Any]]=field(default_factory=list)

    def claim_lock(self, lock_key:str, token:str):
        if lock_key in self.active_locks and self.active_locks[lock_key]!=token: raise LockConflict(lock_key)
        self.active_locks[lock_key]=token
    def release_lock(self, lock_key:str, token:str):
        if self.active_locks.get(lock_key)==token: self.active_locks.pop(lock_key,None)

    def run(self, *, job_key:str, scheduled_for:str, action_key:str, requested_level:str,
            evidence_refs:Iterable[str], confidence_score:int, rule_version_id:str,
            model_version_id:str|None=None, window_key:str='default')->dict[str,Any]:
        idem=hashlib.sha256(f'{job_key}|{scheduled_for}|{action_key}'.encode()).hexdigest()
        if idem in self.completed_keys: raise DuplicateJobRun(idem)
        if self.kill_switch: raise KillSwitchActive('global kill switch active')
        if self.circuit.state=='open': raise CircuitOpen('circuit breaker open')
        count=self.window_counts.get(window_key,0)
        if count>=POLICY['limits']['max_actions_per_job_window']: raise RateLimitExceeded(window_key)
        refs=tuple(dict.fromkeys(str(x) for x in evidence_refs))
        level,reasons=autonomous_level(action_key,len(refs),confidence_score,requested_level)
        risk=risk_for(action_key)
        action_id=stable_id('act_',{'idem':idem,'level':level,'risk':risk,'refs':refs,'confidence':confidence_score})
        why={'evidence_refs':refs,'confidence_score':confidence_score,'reason_codes':reasons,'rule_version_id':rule_version_id,'model_version_id':model_version_id,'risk_class':risk,'autonomy_level':level}
        record={'action_id':action_id,'job_key':job_key,'scheduled_for':scheduled_for,'idempotency_key':idem,'action_key':action_key,'risk_class':risk,'autonomy_level':level,'why':why,'public_write_authorized':False,'public_side_effects':False}
        if level=='low_risk_auto':
            lock_key=f'{job_key}:{scheduled_for}'
            token=action_id
            self.claim_lock(lock_key,token)
            try:
                record.update({'status':'simulated_completed','execution_kind':'internal_simulation'})
                self.completed_keys.add(idem); self.window_counts[window_key]=count+1; self.actions.append(record)
            finally: self.release_lock(lock_key,token)
            return record
        priority=POLICY['human_queue_priorities'][risk]
        if level=='human_approval_required':
            item={'queue_id':stable_id('inq_',record),'priority':priority,'status':'pending','action':record}
            self.human_queue.append(item); record['status']='queued_for_human'; self.actions.append(record); self.completed_keys.add(idem)
            return record
        record['status']='analysis_only'; self.actions.append(record); self.completed_keys.add(idem); return record

    def health(self)->dict[str,Any]:
        status='paused' if self.kill_switch else ('degraded' if self.circuit.state=='open' else 'healthy')
        return {'status':status,'kill_switch':self.kill_switch,'circuit_state':self.circuit.state,'active_locks':len(self.active_locks),'queued_human':len(self.human_queue),'public_autonomy_enabled':False}

    def alert(self, code:str, severity:str, details:Mapping[str,Any],window_key:str='alerts'):
        if len([a for a in self.alerts if a['window_key']==window_key])>=POLICY['limits']['max_alerts_per_window']: return None
        row={'alert_id':stable_id('alr_',{'code':code,'details':details,'n':len(self.alerts)}),'code':code,'severity':severity,'details':dict(details),'window_key':window_key}
        self.alerts.append(row); return row

def prioritized_inbox(items:Iterable[Mapping[str,Any]],limit:int=10)->list[dict[str,Any]]:
    rows=[dict(x) for x in items if x.get('status')=='pending']
    rows.sort(key=lambda x:(-int(x.get('priority',0)),str(x.get('queue_id',''))))
    return rows[:limit]
