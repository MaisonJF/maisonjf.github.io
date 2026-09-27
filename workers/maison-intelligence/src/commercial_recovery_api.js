import { sha256Hex } from './core.js';

const KINDS=new Set(['product_candidate','service_candidate','digital_candidate','bundle_candidate','commercial_opportunity','ocean_integration']);
const STATES=new Set(['captured','pending_write','integrated']);
const FORBIDDEN=/(password|credentials?|payment_data|paid_content_body|private_conversations?|access_token|api[_-]?key|secret)/i;
const EMAIL=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function enabled(env){return String(env.COMMERCIAL_RECOVERY_API_ENABLED||'').toLowerCase()==='true';}
function authorized(request,env){const h=request.headers.get('Authorization')||'';return !!env.COMMERCIAL_RECOVERY_TOKEN && h===`Bearer ${env.COMMERCIAL_RECOVERY_TOKEN}`;}
function scan(value,path='payload'){
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){if(FORBIDDEN.test(k)) throw new Error('forbidden_payload_key:'+path+'.'+k);scan(v,path+'.'+k);}
  } else if(typeof value==='string'&&EMAIL.test(value)) throw new Error('recovery_privacy_email_detected');
}
async function rid(kind,payload,destination){return 'rcv_'+(await sha256Hex(JSON.stringify({kind,payload,destination}))).slice(0,32);}

export async function handleCommercialRecoveryRequest(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/internal/recovery/commercial')) return null;
  if(!enabled(env)) return json({error:'not_found'},404);
  if(!authorized(request,env)) return json({error:'unauthorized'},401);
  try{
    if(request.method==='GET'&&url.pathname==='/internal/recovery/commercial'){
      const rows=await env.GROWTH_DB.prepare(`SELECT recovery_id,kind,payload_json,intended_destination,state,source_ref,evidence_refs_json,attempt_count,last_error,integrated_ref,created_at,updated_at FROM commercial_recovery_journal WHERE state IN ('captured','pending_write') ORDER BY created_at,recovery_id LIMIT 200`).all();
      return json({kind:'maison_commercial_recovery',unresolved:(rows.results||[]).map(r=>({...r,payload:JSON.parse(r.payload_json),evidence_refs:JSON.parse(r.evidence_refs_json)}))});
    }
    if(request.method!=='POST') return json({error:'method_not_allowed'},405);
    const body=await request.json();
    if(url.pathname==='/internal/recovery/commercial/capture'){
      if(!KINDS.has(body.kind)) throw new Error('invalid_kind');
      if(!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload)) throw new Error('invalid_payload');
      if(typeof body.intended_destination!=='string'||!body.intended_destination) throw new Error('invalid_destination');
      scan(body.payload);
      const recoveryId=await rid(body.kind,body.payload,body.intended_destination);
      const now=new Date().toISOString();
      await env.GROWTH_DB.prepare(`INSERT OR IGNORE INTO commercial_recovery_journal(recovery_id,kind,payload_json,intended_destination,state,source_ref,evidence_refs_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(recoveryId,body.kind,JSON.stringify(body.payload),body.intended_destination,'captured',body.source_ref||null,JSON.stringify(body.evidence_refs||[]),now,now).run();
      return json({recovery_id:recoveryId,state:'captured',catalogue_write_authorized:false,public_write_authorized:false});
    }
    const recoveryId=String(body.recovery_id||'');
    if(!recoveryId) throw new Error('recovery_id_required');
    if(url.pathname==='/internal/recovery/commercial/failure'){
      const error=String(body.error||'write_failed').slice(0,1000);
      await env.GROWTH_DB.prepare(`UPDATE commercial_recovery_journal SET state='pending_write',attempt_count=attempt_count+1,last_error=?,updated_at=? WHERE recovery_id=? AND state IN ('captured','pending_write')`).bind(error,new Date().toISOString(),recoveryId).run();
      return json({recovery_id:recoveryId,state:'pending_write'});
    }
    if(url.pathname==='/internal/recovery/commercial/integrated'){
      if(body.readback_verified!==true) throw new Error('readback_required');
      if(typeof body.integrated_ref!=='string'||!body.integrated_ref) throw new Error('integrated_ref_required');
      await env.GROWTH_DB.prepare(`UPDATE commercial_recovery_journal SET state='integrated',integrated_ref=?,last_error=NULL,updated_at=? WHERE recovery_id=? AND state IN ('captured','pending_write')`).bind(body.integrated_ref,new Date().toISOString(),recoveryId).run();
      return json({recovery_id:recoveryId,state:'integrated',readback_verified:true});
    }
    return json({error:'not_found'},404);
  }catch(error){return json({error:error?.message||'invalid_request'},400);}
}
