// MAISON JF® — Public B2B submissions and non-identifying analytics.
// Personal information is stored only in the dedicated inquiries table, never in the events log.
import { recordB2BEvent } from '../_lib/commerce-events.js';

const BUSINESSES=new Set(['loja','spa','terapeuta','alojamento','servico','organizacao','outro']);
const GOALS=new Set(['ticket','recompra','diferenciar','continuar','boasvindas','testar','presentear','equipa','formacao']);
const B2B_INQUIRIES_TABLE=`CREATE TABLE IF NOT EXISTS b2b_inquiries (
  inquiry_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  business_type TEXT NOT NULL,
  goal TEXT NOT NULL,
  message TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','closed'))
)`;

function json(payload,status=200){
 return new Response(JSON.stringify(payload),{status,headers:{
   'content-type':'application/json; charset=utf-8','cache-control':'no-store',
   'x-content-type-options':'nosniff','referrer-policy':'no-referrer'
 }});
}
function clean(value,max){
 if(typeof value!=='string')return '';
 const x=value.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
 return x.length>max?'':x;
}
function hasSameOrigin(request){
 const url=new URL(request.url);
 const origin=request.headers.get('Origin');
 if(!origin)return true;
 try{return new URL(origin).origin===url.origin}catch{return false}
}
async function saveApplication(body,env){
 const db=env?.MAISON_BRAIN_DB;
 if(!db||typeof db.prepare!=='function')
   return json({ok:false,stored:false,error:'Receção de candidaturas temporariamente indisponível.'},503);
 const data=body?.data;
 if(!data||typeof data!=='object'||Array.isArray(data))
   return json({ok:false,stored:false,error:'Pedido incompleto.'},400);
 const name=clean(data.name,100);
 const company=clean(data.company,120);
 const email=clean(data.email,180).toLowerCase();
 const business=clean(data.activity,40);
 const goal=clean(data.goal,40);
 const message=clean(data.message,1200);
 const honeypot=String(data.website||'');
 // Silent 400, never claim a stored lead for a bot.
 if(honeypot)return json({ok:false,stored:false,error:'Pedido inválido.'},400);
 if(!name||!company||!email||!message||!BUSINESSES.has(business)||!GOALS.has(goal)||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||data.consent!==true)
   return json({ok:false,stored:false,error:'Preenche os campos obrigatórios e confirma o consentimento.'},400);
 const idempotency=clean(body.idempotency_key,120);
 if(!/^b2b:application:[a-f0-9-]{36}$/.test(idempotency))
   return json({ok:false,stored:false,error:'Identificador do pedido inválido.'},400);
 const now=new Date();
 const created=now.toISOString();
 const expires=new Date(now.getTime()+90*24*60*60*1000).toISOString();
 try{
   await db.prepare(B2B_INQUIRIES_TABLE).run();
   // Retention is enforced on every submission. No personal data enters generic telemetry.
   await db.prepare('DELETE FROM b2b_inquiries WHERE expires_at < ?1').bind(created).run();
   const written=await db.prepare(
     `INSERT OR IGNORE INTO b2b_inquiries
      (inquiry_id,created_at,expires_at,full_name,company,email,business_type,goal,message,consented_at,status)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'new')`
   ).bind(idempotency,created,expires,name,company,email,business,goal,message,created).run();
   if(!written?.success)
     return json({ok:false,stored:false,error:'Não foi possível guardar o pedido.'},503);
   return json({ok:true,stored:true,reference:idempotency},201);
 }catch{
   return json({ok:false,stored:false,error:'Não foi possível guardar o pedido. Experimenta o contacto por email.'},503);
 }
}

export async function onRequestPost({request,env}){
 if(!hasSameOrigin(request))return json({ok:false,stored:false,error:'Origem não autorizada.'},403);
 const contentType=String(request.headers.get('content-type')||'');
 if(!contentType.toLowerCase().startsWith('application/json'))
   return json({ok:false,stored:false,error:'Formato inválido.'},415);
 const contentLength=Number(request.headers.get('content-length')||0);
 if(contentLength>7000)return json({ok:false,stored:false,error:'Pedido demasiado longo.'},413);
 const body=await request.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body))return json({ok:false,stored:false,error:'JSON inválido.'},400);

 // An actual contact submission is a separate contract from commercial event telemetry.
 if(body.type==='b2b_application')return saveApplication(body,env);

 // Preserve the canonical B2B event contract for existing integrations.
 const eventType=String(body.event_type||'').trim().toLowerCase();
 if(eventType!=='b2b.lead')return json({ok:false,error:'Evento inválido.'},400);
 if(!env?.GROWTH_DB)return json({ok:true,ignored:true,reason:'growth_db_unavailable'});
 try{
   const idempotencyKey=String(body.idempotency_key||'').trim();
   const metadata=body.metadata&&typeof body.metadata==='object'&&!Array.isArray(body.metadata)?body.metadata:{};
   const result=await recordB2BEvent(env.GROWTH_DB,{
     event_type:'b2b.lead',idempotency_key:idempotencyKey,
     occurred_at:new Date().toISOString(),metadata
   });
   return json(result===false?{ok:true,ignored:true}:{...result});
 }catch(error){
   const code=String(error?.message||'');
   const invalid=new Set(['unsupported_b2b_event','invalid_b2b_idempotency','unsupported_b2b_metadata',
     'invalid_b2b_metadata','missing_b2b_metadata','invalid_b2b_journey','invalid_b2b_solution',
     'invalid_b2b_value','invalid_b2b_currency']);
   if(invalid.has(code))return json({ok:false,error:'Sinal B2B inválido.'},400);
   if(code==='b2b_idempotency_conflict')return json({ok:false,error:'Conflito de idempotência.'},409);
   return json({ok:false,error:'Não foi possível registar o sinal B2B.'},500);
 }
}
export async function onRequestGet(){return json({ok:false,error:'Método não permitido.'},405)}
