import { ingestVaultCandidate } from './vault_candidates.js';
import { ingestCandidateInbox, CANDIDATE_TYPES } from './candidate_inbox.js';
import { callZeroCostModel } from './providers.js';
import { loadActiveFeedbackLearning } from './feedback_learning.js';

const MAX_CANDIDATES=6;
const ASSETS=[
  'Vela Aromática 170 g','Vela Aromática 70 g','Névoa de Ambiente 20 ml',
  'Óleo de Massagem 60 ml','Escalda-Pés 280 g','Curadoria A Floressência',
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
  if(lens==='daily_content')return 'Prioriza conteúdo público diário: pelo menos um reel e um post. Acrescenta story, carousel ou video_script apenas quando forem realmente distintos. Os hooks têm de ser concretos e imediatamente utilizáveis.';
  if(lens==='commercial_reuse')return 'Prioriza expansão comercial usando PRIMEIRO ativos existentes: bundles, digitais, serviços existentes, ofertas sazonais, B2B ou campanhas. Só propõe novo produto físico se explicares por que razão nenhum ativo existente resolve a oportunidade.';
  if(lens==='editorial_experience')return 'Prioriza expansão editorial e de experiência: questions, Oracle blocks, tests, Farol paths, ebooks, digitais e experiências. Não recicles corpos pagos nem finjas certezas.';
  return 'Produz um conjunto equilibrado: um candidato de conteúdo, um comercial, um editorial/experiência e um experimento/campanha quando útil.';
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
  const feedback_learning=await loadActiveFeedbackLearning(env,{limit:8});
  return {
    signals,
    feedback_learning,
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
  const learningLines=(context?.feedback_learning||[]).slice(0,8).map((p,i)=>
    `${i+1}. [${p.scope||'global'}] ${clean(p.title,180)} → ${clean(p.guidance,700)} (confiança ${Number(p.confidence)||0}; repetição ${Number(p.occurrence_count)||1})`
  );
  return [
    'FOUNDRY PRIVADA DE EXPANSÃO MAISON JF®. Pensa com ambição, mas cria apenas candidatos. Nunca aproves, publiques, fixes preços, lances, contactes alguém ou alteres o site.',
    'Tudo o que devolves entra num Candidate Inbox D1 privado e exige revisão humana.',
    'ESCREVE TODO O CONTEÚDO HUMANO EM PORTUGUÊS EUROPEU (PT-PT). Isto inclui title, body, rationale, territory, hook, angle, CTA e texto dentro de payload. Não devolvas inglês nem PT-BR.',
    'Sem dados pessoais, alegações médicas, certezas sobrenaturais, urgência manipuladora ou evidência inventada.',
    'REUTILIZA PRIMEIRO o ecossistema MAISON existente. Antes de inventar um produto novo, procura nova utilização, bundle, ponte digital, cross-sell, upsell, recompra, recorrência, presente, B2B ou experiência usando ativos já existentes.',
    'Não proponhas “coaching”, “assessoria”, “consultoria genérica” ou “kit de autoconhecimento” como novidade. Se propuseres um bundle/kit, lista componentes MAISON existentes concretos. Se propuseres serviço, parte de Tarot, mentoria, Serviços e Presença ou B2B já existentes.',
    'Novo produto físico só quando houver uma lacuna material que os ativos atuais não consigam responder; explica essa lacuna no rationale.',
    'Não parafraseies apenas os sinais. Converte-os em oportunidades distintas, concretas e reconhecivelmente MAISON JF.',
    `Lente atribuída: ${lens}. ${lensInstruction(lens)}`,
    'Ativos MAISON atuais: '+(context?.existing_assets||ASSETS).join(' | '),
    'Sinais Ocean/Brain recentes:',
    ...(signalLines.length?signalLines:['Não há sinal recente. Usa o universo MAISON existente e propõe candidatos evergreen.']),
    '',
    'APRENDIZAGEM ATIVA DO CONSELHO (hipóteses contraditadas, não factos nem ordens):',
    ...(learningLines.length?learningLines:['nenhuma aprendizagem ativa ainda']),
    'Aplica apenas o que for relevante ao candidato atual. Não destruas identidade MAISON para obedecer a uma heurística genérica.',
    '',
    'Devolve APENAS JSON válido com esta forma de topo: {"candidates":[]}. Sem Markdown.',
    'Devolve 3 a 6 candidatos. Cada candidato usa: candidate_type, title, body, rationale, territory, related_assets, evidence_refs, novelty_score, maison_fit_score, feasibility_score, demand_score, commercial_score, reuse_existing_score, payload.',
    'candidate_type permitido: question, oracle_block, test, farol_path, reel, post, story, carousel, video_script, physical_product, digital_product, bundle, service, experience, ebook, campaign, b2b, seasonal_offer, experiment.',
    'Os scores são inteiros 0-100 e são hipóteses, não factos.',
    'Para reel/post/story/carousel/video_script, payload pode incluir hook, angle, objective, CTA, platform e reuse_from.',
    'Para produtos/bundles/serviços/experiências, payload pode incluir components, estimated_effort, price_hypothesis_range_eur, why_now e validation_test. O preço é só hipótese.',
    'Para question, payload tem de incluir theme, stage, exposure, target, intensity e pode incluir subthemes, pain_family, subterritory, emotional_function, cognitive_load, vulnerability, conflict_potential, playfulness.',
    'Para oracle_block, payload tem de incluir territory, role, intensity, tone, rarity e pode incluir tags, pain_family, subterritory, emotional_function.',
    'Para test/farol_path, explica que tensão humana ajuda a reconhecer e para que destino MAISON já existente pode encaminhar.',
    'Conteúdo diário deve ser útil mesmo sem venda. Candidatos comerciais devem declarar concretamente como reutilizam ativos MAISON existentes.'
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
