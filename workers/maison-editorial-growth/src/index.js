import { generateEditorialCandidates } from '../../maison-intelligence/src/editorial_candidate_generation.js';
import { runExpansionFoundry } from '../../maison-intelligence/src/expansion_foundry.js';
import { callCloudflareWorkersAI } from '../../maison-intelligence/src/providers.js';

const STRATEGIC_ONLY=new Set([
  'descoberta-organica-e-reconhecimento-da-maison',
  'atelier-principios-transferiveis-e-dna-maison'
]);

function enabled(value){return String(value??'').toLowerCase()==='true';}
function dayOfYear(date){
  const start=Date.UTC(date.getUTCFullYear(),0,0);
  return Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-start)/86400000);
}
function safeJson(raw,fallback=[]){try{return JSON.parse(String(raw??''));}catch{return fallback;}}
function clean(value,max=4000){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}
function modeFor(date){return date.getUTCHours()%12===0?'editorial':'foundry';}

async function recentSignals(env){
  const result=await env.GROWTH_DB.prepare(`
    SELECT ocean_key,summary,theme_candidates_json,evidence_roots_json,
           relevance_score,commercial_score,observed_at
      FROM ocean_memory_signals
     ORDER BY observed_at DESC
     LIMIT 18
  `).all();
  return (result?.results||[]).filter(row=>row?.ocean_key&&!STRATEGIC_ONLY.has(String(row.ocean_key)));
}
function selectSignal(rows,date){
  if(!rows.length)return null;
  const ranked=rows.slice().sort((a,b)=>{
    const sa=Number(a.relevance_score||0)+Number(a.commercial_score||0);
    const sb=Number(b.relevance_score||0)+Number(b.commercial_score||0);
    return sb-sa;
  });
  const pool=ranked.slice(0,Math.min(12,ranked.length));
  const slot=Math.floor(date.getUTCHours()/6);
  return pool[(dayOfYear(date)*4+slot)%pool.length]||pool[0];
}

async function runEditorial(env,date){
  const rows=await recentSignals(env);
  const row=selectSignal(rows,date);
  if(!row)return {mode:'editorial',skipped:'no_ocean_signals'};
  const themes=safeJson(row.theme_candidates_json,[]).map(x=>clean(x,120)).filter(Boolean).slice(0,8);
  const evidence=safeJson(row.evidence_roots_json,[]).filter(Boolean).slice(0,8);
  const oceanContext={
    oceanKey:clean(row.ocean_key,160),
    matchedTerms:themes,
    evidenceRoots:evidence
  };
  const brainAlert={
    response_excerpt:clean(row.summary,2400),
    ocean_alert_priority:Math.max(Number(row.relevance_score||0),Number(row.commercial_score||0),70)
  };
  const result=await generateEditorialCandidates(env,{
    caller:callCloudflareWorkersAI,
    oceanContext,
    brainAlert,
    providerId:'cloudflare_workers_ai'
  });
  return {mode:'editorial',ocean_key:oceanContext.oceanKey,...result};
}
async function runFoundry(env,date){
  const lens=date.getUTCHours()===6?'editorial_experience':'commercial_reuse';
  const spec={
    key:'cloudflare_workers_ai:'+String(env.WORKERS_AI_MODEL||'')+':'+lens,
    providerId:'cloudflare_workers_ai',
    modelId:String(env.WORKERS_AI_MODEL||''),
    lens
  };
  const result=await runExpansionFoundry(env,{spec});
  return {mode:'foundry',lens,...result};
}

export async function runEditorialGrowth(env,date=new Date()){
  if(!enabled(env.EDITORIAL_GROWTH_ENABLED))return {skipped:'editorial_growth_disabled'};
  if(!env?.GROWTH_DB)return {skipped:'growth_db_missing'};
  if(!env?.AI||!env.WORKERS_AI_MODEL)return {skipped:'workers_ai_unavailable'};
  const mode=modeFor(date);
  return mode==='editorial'?await runEditorial(env,date):await runFoundry(env,date);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const token=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
    if(url.pathname!=='/__editorial_growth_test'||!env.EDITORIAL_GROWTH_TEST_TOKEN||token!==env.EDITORIAL_GROWTH_TEST_TOKEN){
      return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
    }
    const when=new Date();
    const mode=String(url.searchParams.get('mode')||'editorial');
    when.setUTCHours(mode==='foundry'?18:12,0,0,0);
    try{
      const result=await runEditorialGrowth(env,when);
      return Response.json(result,{headers:{'Cache-Control':'no-store'}});
    }catch(error){
      return Response.json({error:String(error?.message||error)},{status:500,headers:{'Cache-Control':'no-store'}});
    }
  },
  async scheduled(controller,env,ctx){
    const when=new Date(controller.scheduledTime);
    ctx.waitUntil(runEditorialGrowth(env,when).then(result=>{
      console.info('MAISON_EDITORIAL_GROWTH',JSON.stringify(result));
    }).catch(error=>{
      console.error('MAISON_EDITORIAL_GROWTH_FAILED',error?.message||error);
    }));
  }
};

export { modeFor, selectSignal };
