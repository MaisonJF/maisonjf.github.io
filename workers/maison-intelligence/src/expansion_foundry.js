import { ingestVaultCandidate } from './vault_candidates.js';
import { ingestCandidateInbox, CANDIDATE_TYPES } from './candidate_inbox.js';
import { callZeroCostModel } from './providers.js';

const MAX_CANDIDATES=6;
const ASSETS=[
  'Vela Aromática 170 g','Vela Aromática 70 g','Névoa de Ambiente 20 ml',
  'Óleo de Massagem 60 ml','Escalda-Pés 150 g','Curadoria A Floressência',
  'PÁRA DE IGNORAR!','Oráculo MAISON JF®','Volta Para Casa','O Farol',
  'ebooks / Éditions Maison JF','Serviços e Presença','B2B / Profissionais'
];

function clean(value,max=2400){
  return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
}
function safeJson(value,fallback){
  try{return JSON.parse(String(value??''));}catch{return fallback;}
}
function rows(value,max=MAX_CANDIDATES){
  return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).slice(0,max):[];
}
function parseJsonObject(raw){
  const text=String(raw??'').trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  const start=text.indexOf('{'),end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('foundry_json_missing');
  let parsed;
  try{parsed=JSON.parse(text.slice(start,end+1));}catch{throw new Error('foundry_json_invalid');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('foundry_payload_invalid');
  return parsed;
}
function modelLens(spec){
  const explicit=String(spec?.lens||'').trim();
  if(['daily_content','commercial_reuse','editorial_experience','mixed_growth'].includes(explicit))return explicit;
  if(spec?.providerId==='cloudflare_workers_ai')return 'daily_content';
  const seed=[...String(spec?.key||'')].reduce((n,ch)=>n+ch.charCodeAt(0),0)%4;
  return ['daily_content','commercial_reuse','editorial_experience','mixed_growth'][seed];
}
function lensInstruction(lens){
  if(lens==='daily_content')return 'Prioritise daily public content: at least one reel and one post. Add a story, carousel or video_script only when distinct. Hooks must be concrete and immediately usable.';
  if(lens==='commercial_reuse')return 'Prioritise commercial expansion using existing assets first: bundles, physical/digital products, services, seasonal offers, B2B or campaigns. Avoid ideas that require major new stock or paid infrastructure unless evidence is unusually strong.';
  if(lens==='editorial_experience')return 'Prioritise editorial and experience expansion: questions, Oracle blocks, tests, Farol paths, ebooks, digital products and experiences. Do not recycle paid question bodies or pretend certainty.';
  return 'Produce a balanced growth set: one content candidate, one commercial candidate, one experience/editorial candidate and one experiment or campaign when useful.';
}

export async function loadDailyExpansionContext(env,{limit=12}={}){
  if(!env?.GROWTH_DB)throw new Error('growth_db_missing');
  const safeLimit=Math.max(4,Math.min(20,Number.parseInt(limit,10)||12));
  const result=await env.GROWTH_DB.prepare(`
    SELECT ocean_key,summary,evidence_roots_json,theme_candidates_json,commercial_adjacency_json,
           relevance_score,commercial_score,observed_at
      FROM ocean_memory_signals
     ORDER BY observed_at DESC
     LIMIT ${safeLimit}
  `).all();
  const signals=(result?.results||[]).map(row=>({
    ocean_key:clean(row.ocean_key,160),
    summary:clean(row.summary,1000),
    evidence_roots:safeJson(row.evidence_roots_json,[]).slice(0,8),
    themes:safeJson(row.theme_candidates_json,[]).slice(0,8),
    commercial_adjacency:safeJson(row.commercial_adjacency_json,[]).slice(0,5),
    relevance_score:Number(row.relevance_score)||0,
    commercial_score:Number(row.commercial_score)||0,
    observed_at:row.observed_at
  }));
  return {
    signals,
    strongest_ocean:signals.slice().sort((a,b)=>
      (b.relevance_score+b.commercial_score)-(a.relevance_score+a.commercial_score)
    )[0]?.ocean_key||'maison-daily-expansion',
    existing_assets:ASSETS
  };
}

export function buildExpansionPrompt({spec,context}={}){
  const lens=modelLens(spec);
  const signalLines=(context?.signals||[]).slice(0,12).map((s,i)=>
    `${i+1}. [${s.ocean_key}] relevance=${s.relevance_score} commercial=${s.commercial_score}; ${s.summary}; themes=${(s.themes||[]).join(', ')}`
  );
  return [
    'MAISON JF® PRIVATE EXPANSION FOUNDRY. Think boldly, but create candidates only. Never approve, publish, price, launch, contact anyone or change the site.',
    'Everything you return goes to a private D1 Candidate Inbox with human review required.',
    'Use original European Portuguese. No personal data, medical claims, supernatural certainty, manipulative urgency or invented evidence.',
    'Prefer what can reuse or recombine existing Maison assets before proposing new stock, suppliers, tools or paid acquisition.',
    'Do not merely paraphrase the signals. Convert them into useful, distinct opportunities that feel like MAISON JF.',
    `Your assigned lens: ${lens}. ${lensInstruction(lens)}`,
    'Current Maison assets: '+(context?.existing_assets||ASSETS).join(' | '),
    'Recent Ocean/Brain signals:',
    ...(signalLines.length?signalLines:['No recent signal available. Use the existing Maison universe and propose evergreen candidates.']),
    '',
    'Return STRICT JSON only with this exact top-level shape: {"candidates":[]}. No Markdown.',
    'Return 3 to 6 candidates. Each candidate uses: candidate_type, title, body, rationale, territory, related_assets, evidence_refs, novelty_score, maison_fit_score, feasibility_score, demand_score, commercial_score, reuse_existing_score, payload.',
    'Allowed candidate_type: question, oracle_block, test, farol_path, reel, post, story, carousel, video_script, physical_product, digital_product, bundle, service, experience, ebook, campaign, b2b, seasonal_offer, experiment.',
    'Scores are integers 0-100 and are hypotheses, not facts.',
    'For reel/post/story/carousel/video_script, payload may include hook, angle, objective, CTA, platform and reuse_from.',
    'For products/bundles/services/experiences, payload may include components, estimated_effort, price_hypothesis_range_eur, why_now and validation_test. Price is a hypothesis only.',
    'For question, payload must include theme, stage, exposure, target, intensity and may include subthemes, pain_family, subterritory, emotional_function, cognitive_load, vulnerability, conflict_potential, playfulness.',
    'For oracle_block, payload must include territory, role, intensity, tone, rarity and may include tags, pain_family, subterritory, emotional_function.',
    'For test/farol_path, explain what human tension it helps recognise and what existing Maison destination it could lead to.',
    'Daily content should be useful even without selling. Commercial candidates should state how they reuse existing assets whenever possible.'
  ].join('\n');
}

function globalEvidence(context){
  const out=[];
  for(const signal of context?.signals||[]){
    for(const url of signal.evidence_roots||[])if(typeof url==='string'&&!out.includes(url))out.push(url);
  }
  return out.slice(0,20);
}
function fallbackTerritory(item,context){
  return clean(item?.territory||item?.payload?.territory||context?.strongest_ocean||'maison',120);
}
function sourceOcean(item,context){
  const requested=clean(item?.source_ocean_id||'',160);
  if(requested&&context?.signals?.some(s=>s.ocean_key===requested))return requested;
  return clean(context?.strongest_ocean||'maison-daily-expansion',160);
}

async function storeCandidate(env,{item,spec,context}){
  const type=clean(item?.candidate_type||item?.content_type,80);
  if(!CANDIDATE_TYPES.has(type))throw new Error('foundry_candidate_type_invalid');
  const payload=item?.payload&&typeof item.payload==='object'&&!Array.isArray(item.payload)?item.payload:{};
  const evidence=Array.isArray(item?.evidence_refs)&&item.evidence_refs.length?item.evidence_refs:globalEvidence(context);
  const ocean=sourceOcean(item,context);
  const territory=fallbackTerritory(item,context);

  if(type==='question'){
    return await ingestVaultCandidate(env,{
      ...payload,
      content_type:'question',
      source_ocean_id:ocean,
      theme:payload.theme||territory,
      text:clean(item.body||item.title,500),
      stage:payload.stage||'open',
      exposure:payload.exposure==='public_social'?'public_social':'paid',
      target:payload.target||'both',
      intensity:Number(payload.intensity)||2,
      product_fit:{
        source:'expansion_foundry',provider_id:spec.providerId,model_id:spec.modelId,
        rationale:clean(item.rationale,1000),evidence_refs:evidence.slice(0,10)
      }
    });
  }

  if(type==='oracle_block'){
    return await ingestVaultCandidate(env,{
      ...payload,
      content_type:'oracle_block',
      source_ocean_id:ocean,
      territory:payload.territory||territory,
      role:payload.role||'recognition',
      text:clean(item.body||item.title,4000),
      title:clean(item.title,180),
      intensity:Number(payload.intensity)||2,
      tone:payload.tone||'intimate',
      rarity:payload.rarity||'common',
      product_fit:{
        source:'expansion_foundry',provider_id:spec.providerId,model_id:spec.modelId,
        rationale:clean(item.rationale,1000),evidence_refs:evidence.slice(0,10)
      }
    });
  }

  return await ingestCandidateInbox(env,{
    candidate_type:type,
    source_ocean_id:ocean,
    provider_id:spec.providerId,
    model_id:spec.modelId,
    territory,
    title:clean(item.title||item.body,240),
    body:clean(item.body||item.title,5000),
    rationale:clean(item.rationale||'Candidate from zero-cost expansion Foundry.',2000),
    related_assets:Array.isArray(item.related_assets)?item.related_assets:[],
    evidence_refs:evidence,
    novelty_score:item.novelty_score,
    maison_fit_score:item.maison_fit_score,
    feasibility_score:item.feasibility_score,
    demand_score:item.demand_score,
    commercial_score:item.commercial_score,
    reuse_existing_score:item.reuse_existing_score,
    payload
  });
}

export async function runExpansionFoundry(env,{spec,context}={}){
  if(!spec?.providerId)throw new Error('foundry_model_spec_missing');
  const resolvedContext=context||await loadDailyExpansionContext(env);
  const generated=await callZeroCostModel(env,spec,buildExpansionPrompt({spec,context:resolvedContext}));
  const payload=parseJsonObject(generated?.text);
  const candidates=rows(payload.candidates,MAX_CANDIDATES);
  const results=[];
  let rejected=0;
  for(const item of candidates){
    try{
      const stored=await storeCandidate(env,{item,spec,context:resolvedContext});
      results.push({
        candidate_type:stored.candidate_type||stored.content_type,
        candidate_id:stored.candidate_id||stored.content_id,
        duplicate:stored.duplicate===true
      });
    }catch(error){
      rejected++;
      console.warn('MAISON_FOUNDRY_CANDIDATE_REJECTED',spec.key,error?.message||error);
    }
  }
  return {
    called:true,
    provider_id:generated?.providerId||spec.providerId,
    model_id:generated?.modelId||spec.modelId,
    model_key:spec.key,
    lens:modelLens(spec),
    stored:results.filter(x=>!x.duplicate).length,
    duplicates:results.filter(x=>x.duplicate).length,
    rejected,
    results,
    usage:generated?.usage||null
  };
}

export { parseJsonObject, modelLens };
