import {
  callOpenRouterModel,
  callOsirisGateway,
  openRouterZeroCostModels
} from './providers.js';

const REVIEWER_ROLES=[
  {
    id:'evidence_auditor',
    label:'Auditor de evidência',
    brief:'Procura exageros, inferências frágeis, contradições entre personas e recomendações que não são sustentadas pelo conteúdo realmente observado.'
  },
  {
    id:'maison_guardian',
    label:'Guardião MAISON',
    brief:'Separa crítica útil de sugestões que tornariam a MAISON genérica. Protege mistério deliberado, desejo, identidade, PT-PT e coerência sem usar isso como desculpa para confusão real.'
  },
  {
    id:'commercial_architect',
    label:'Arquiteto comercial',
    brief:'Procura implicações concretas para clareza, confiança, conversão, navegação, oferta, reutilização de ativos, bundles, recorrência e B2B. Não inventa procura nem receita.'
  }
];

const ALLOWED_SCOPES=new Set([
  'global','voice','navigation','trust','conversion','editorial','products',
  'services','mobile','international','b2b','offer'
]);

function enabled(value){return String(value??'').toLowerCase()==='true';}
function clean(value,max=4000){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}
function clamp(value,min,max,fallback=min){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
}
function parseJsonObject(raw){
  const text=String(raw??'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const start=text.indexOf('{'),end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('feedback_learning_json_missing');
  let parsed;
  try{parsed=JSON.parse(text.slice(start,end+1));}catch{throw new Error('feedback_learning_json_invalid');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('feedback_learning_payload_invalid');
  return parsed;
}
async function sha256(value){
  const data=new TextEncoder().encode(String(value));
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function normalizePatternKey(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,150);
}
function rotate(list,offset){
  if(!list.length)return list;
  const start=((Number(offset)||0)%list.length+list.length)%list.length;
  return list.slice(start).concat(list.slice(0,start));
}

async function ensureSchema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_feedback_learning_runs (
    learning_run_id TEXT PRIMARY KEY,
    input_hash TEXT NOT NULL UNIQUE,
    feedback_count INTEGER NOT NULL,
    osiris_context_count INTEGER NOT NULL DEFAULT 0,
    reviewer_count INTEGER NOT NULL DEFAULT 0,
    stored_patterns INTEGER NOT NULL DEFAULT 0,
    active_patterns INTEGER NOT NULL DEFAULT 0,
    candidate_patterns INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    detail_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_feedback_learning_runs_created ON maison_feedback_learning_runs(created_at)').run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_feedback_learning_reviews (
    review_id TEXT PRIMARY KEY,
    learning_run_id TEXT NOT NULL,
    role TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    model_id TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_feedback_learning_reviews_run ON maison_feedback_learning_reviews(learning_run_id,created_at)').run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_feedback_learning_patterns (
    pattern_id TEXT PRIMARY KEY,
    pattern_key TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL,
    title TEXT NOT NULL,
    guidance TEXT NOT NULL,
    rationale TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    status TEXT NOT NULL,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    evidence_feedback_ids_json TEXT NOT NULL DEFAULT '[]',
    supporting_roles_json TEXT NOT NULL DEFAULT '[]',
    dissent_json TEXT NOT NULL DEFAULT '[]',
    osiris_context_refs_json TEXT NOT NULL DEFAULT '[]',
    source_run_id TEXT NOT NULL,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_feedback_learning_patterns_status ON maison_feedback_learning_patterns(status,confidence,occurrence_count)').run();
}

async function loadFeedback(db,limit=12){
  const safe=Math.max(4,Math.min(20,Number.parseInt(limit,10)||12));
  const result=await db.prepare(`
    SELECT feedback_id,persona_id,persona_label,page_key,opinion_text,created_at
      FROM maison_synthetic_feedback
     ORDER BY created_at DESC
     LIMIT ${safe}
  `).all();
  return result?.results||[];
}

async function loadOsirisContext(db,limit=8){
  const safe=Math.max(0,Math.min(12,Number.parseInt(limit,10)||8));
  if(!safe)return [];
  try{
    const result=await db.prepare(`
      SELECT observation_id,provider_id,territory_key,response_excerpt,observed_at
        FROM external_intelligence_observations
       WHERE provider_id LIKE 'osiris_%'
       ORDER BY observed_at DESC
       LIMIT ${safe}
    `).all();
    return result?.results||[];
  }catch{return [];}
}

async function loadExistingPatterns(db,limit=20){
  try{
    const result=await db.prepare(`
      SELECT pattern_key,scope,title,guidance,confidence,status,occurrence_count,updated_at
        FROM maison_feedback_learning_patterns
       WHERE status IN ('candidate','active')
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, confidence DESC, occurrence_count DESC
       LIMIT ${Math.max(4,Math.min(30,Number.parseInt(limit,10)||20))}
    `).all();
    return result?.results||[];
  }catch{return [];}
}

function feedbackPacket(feedback){
  return feedback.map(row=>({
    feedback_id:row.feedback_id,
    persona_id:row.persona_id,
    persona_label:row.persona_label,
    page_key:row.page_key,
    opinion:clean(row.opinion_text,2600)
  }));
}
function osirisPacket(rows){
  return rows.map(row=>({
    observation_id:row.observation_id,
    provider_id:row.provider_id,
    territory_key:row.territory_key,
    observed_at:row.observed_at,
    excerpt:clean(row.response_excerpt,900)
  }));
}

function buildReviewerPrompt({role,feedback,osiris}){
  return [
    'MAISON JF® — CONTRADITÓRIO PRIVADO DE APRENDIZAGEM.',
    'Estás a rever críticas sintéticas, não testemunhos reais nem prova causal. Nunca transformes opinião sintética em facto.',
    'Escreve em português europeu. Sê rigoroso e discordante quando necessário.',
    `PAPEL: ${role.label}. ${role.brief}`,
    '',
    'CRÍTICAS SINTÉTICAS:',
    JSON.stringify(feedback),
    '',
    'CONTEXTO OSIRIS OSINT RECENTE (pode ser irrelevante; ignora-o se não tiver relação direta):',
    JSON.stringify(osiris),
    '',
    'Devolve APENAS JSON válido com esta forma:',
    '{"claims":[{"pattern_key":"chave-curta-estavel","scope":"global|voice|navigation|trust|conversion|editorial|products|services|mobile|international|b2b|offer","title":"...","guidance":"...","stance":"support|challenge|reject","confidence":0,"feedback_ids":["fb_..."],"osiris_refs":["obs_..."],"reason":"..."}]}',
    'Usa apenas feedback_ids e osiris_refs realmente fornecidos. Não inventes evidência.',
    'support = merece virar hipótese de aprendizagem; challenge = há sinal mas precisa de cuidado; reject = seria uma má aprendizagem.',
    'Máximo 6 claims. Prefere padrões recorrentes a observações isoladas.'
  ].join('\n');
}

function buildSynthesisPrompt({reviews,feedbackIds,osirisIds,existing}){
  return [
    'MAISON JF® — SÍNTESE PRIVADA DE APRENDIZAGEM.',
    'Tens revisões independentes de críticos. Não votes por simpatia: preserva desacordo e nunca apresentes crítica sintética como facto causal.',
    'Se um padrão já existir, reutiliza exatamente a pattern_key existente quando a ideia for semanticamente a mesma.',
    '',
    'PADRÕES JÁ CONHECIDOS:',
    JSON.stringify(existing),
    '',
    'REVISÕES:',
    JSON.stringify(reviews),
    '',
    `feedback_ids permitidos: ${feedbackIds.join(', ')}`,
    `osiris_refs permitidos: ${osirisIds.join(', ')||'nenhum'}`,
    '',
    'Devolve APENAS JSON válido:',
    '{"patterns":[{"pattern_key":"...","scope":"...","title":"...","guidance":"...","rationale":"...","confidence":0,"supporting_roles":["evidence_auditor"],"feedback_ids":["fb_..."],"osiris_refs":["obs_..."],"dissent":["..."]}]}',
    'Máximo 8 patterns. Só inclui aprendizagem que tenha pelo menos duas críticas sintéticas concretas por trás.',
    'guidance deve ser uma instrução útil para próximas gerações/revisões, não uma ordem de publicação ou alteração automática.',
    'Não incluas preço, checkout, política legal, promessa comercial ou publicação automática.'
  ].join('\n');
}

async function callFreeJson(env,models,start,prompt){
  let lastError=null;
  for(const model of rotate(models,start)){
    try{
      const out=await callOpenRouterModel(env,prompt,model);
      if(!String(out?.text||'').trim())throw new Error('feedback_learning_empty_model_response');
      const payload=parseJsonObject(out.text);
      return {out,payload};
    }catch(error){lastError=error;}
  }
  throw lastError||new Error('feedback_learning_all_free_models_failed');
}

function validSubset(values,allowed,max=20){
  const out=[];
  for(const value of Array.isArray(values)?values:[]){
    const v=String(value||'').trim();
    if(v&&allowed.has(v)&&!out.includes(v))out.push(v);
    if(out.length>=max)break;
  }
  return out;
}

function normalizedConfidence(value){
  const n=Number(value);
  if(!Number.isFinite(n))return 50;
  if(n>=0&&n<=10)return clamp(n*10,0,100,50);
  return clamp(n,0,100,50);
}

const STOPWORDS=new Set([
  'para','com','sem','uma','uns','umas','que','dos','das','do','da','de','e','em','ao','aos','as','os',
  'por','mais','menos','como','entre','sobre','ser','estar','ter','sua','seu','suas','seus','maison','jf'
]);
function tokenSet(value){
  return new Set(
    String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/[^a-z0-9]+/g,' ').split(/\s+/)
      .filter(x=>x.length>=3&&!STOPWORDS.has(x))
  );
}
function similarity(a,b){
  const A=tokenSet(a),B=tokenSet(b);
  if(!A.size||!B.size)return 0;
  let intersection=0;
  for(const token of A)if(B.has(token))intersection++;
  const union=A.size+B.size-intersection;
  return union?intersection/union:0;
}
function patternLike(a,b){
  const keyA=normalizePatternKey(a.pattern_key||a.title);
  const keyB=normalizePatternKey(b.pattern_key||b.title);
  if(keyA&&keyA===keyB)return true;
  const scopeA=ALLOWED_SCOPES.has(String(a.scope||''))?String(a.scope):'global';
  const scopeB=ALLOWED_SCOPES.has(String(b.scope||''))?String(b.scope):'global';
  if(scopeA!==scopeB)return false;
  return similarity(`${a.title||''} ${a.guidance||''}`,`${b.title||''} ${b.guidance||''}`)>=0.30;
}

export function synthesizePatternsFromReviews(reviews,{feedbackIds=[],osirisIds=[],existing=[]}={}){
  const validFeedback=new Set(feedbackIds);
  const validOsiris=new Set(osirisIds);
  const clusters=[];

  for(const review of Array.isArray(reviews)?reviews:[]){
    const role=String(review?.role||'').trim();
    const claims=Array.isArray(review?.payload?.claims)?review.payload.claims:[];
    for(const raw of claims){
      if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
      const stance=['support','challenge','reject'].includes(String(raw.stance||''))?String(raw.stance):'challenge';
      const claim={
        role,
        stance,
        pattern_key:normalizePatternKey(raw.pattern_key||raw.title),
        scope:ALLOWED_SCOPES.has(String(raw.scope||''))?String(raw.scope):'global',
        title:clean(raw.title,240),
        guidance:clean(raw.guidance,1600),
        reason:clean(raw.reason,1200),
        confidence:normalizedConfidence(raw.confidence),
        feedback_ids:validSubset(raw.feedback_ids,validFeedback,20),
        osiris_refs:validSubset(raw.osiris_refs,validOsiris,12)
      };
      if(!claim.pattern_key||!claim.title||!claim.guidance)continue;
      let cluster=clusters.find(x=>patternLike(x.representative,claim));
      if(!cluster){
        cluster={representative:claim,claims:[]};
        clusters.push(cluster);
      }
      cluster.claims.push(claim);
    }
  }

  const out=[];
  for(const cluster of clusters){
    const positive=cluster.claims.filter(x=>x.stance==='support'||x.stance==='challenge');
    const roles=[...new Set(positive.map(x=>x.role).filter(Boolean))];
    if(roles.length<2)continue;
    const evidence=[...new Set(positive.flatMap(x=>x.feedback_ids))];
    const osiris=[...new Set(positive.flatMap(x=>x.osiris_refs))];
    const ranked=positive.slice().sort((a,b)=>{
      const stanceScore=x=>x.stance==='support'?10:0;
      return (b.confidence+stanceScore(b))-(a.confidence+stanceScore(a));
    });
    const best=ranked[0];
    const confidence=Math.round(positive.reduce((sum,x)=>sum+x.confidence,0)/positive.length);
    const dissent=cluster.claims
      .filter(x=>x.stance!=='support')
      .map(x=>clean(`${x.role}: ${x.reason||x.stance}`,500))
      .filter(Boolean)
      .slice(0,8);
    const rationale=positive.map(x=>x.reason).filter(Boolean).slice(0,3).join(' | ');
    let key=best.pattern_key;
    const known=(existing||[]).find(x=>patternLike(x,best));
    if(known?.pattern_key)key=String(known.pattern_key);

    out.push({
      pattern_key:key,
      scope:best.scope,
      title:best.title,
      guidance:best.guidance,
      rationale:rationale||'Padrão convergente entre revisores independentes.',
      confidence,
      supporting_roles:roles,
      feedback_ids:evidence,
      osiris_refs:osiris,
      dissent
    });
    if(out.length>=8)break;
  }
  return out;
}

export function promoteLearningStatus({existingOccurrence=0,supportingRoles=0,evidenceCount=0,confidence=0}={}){
  const occurrence=Number(existingOccurrence||0)+1;
  if(supportingRoles>=3&&evidenceCount>=3&&confidence>=80)return 'active';
  if(occurrence>=2&&supportingRoles>=2&&evidenceCount>=2&&confidence>=70)return 'active';
  return 'candidate';
}

async function storePattern(db,{item,runId,validRoles,feedbackIds,osirisIds}){
  const key=normalizePatternKey(item.pattern_key||item.title);
  if(key.length<3)return null;
  const scope=ALLOWED_SCOPES.has(String(item.scope||''))?String(item.scope):'global';
  const roles=validSubset(item.supporting_roles,new Set(validRoles),8);
  const evidence=validSubset(item.feedback_ids,new Set(feedbackIds),20);
  const osirisRefs=validSubset(item.osiris_refs,new Set(osirisIds),12);
  const confidence=normalizedConfidence(item.confidence);
  if(roles.length<2||evidence.length<1||confidence<60)return null;

  const existing=await db.prepare('SELECT pattern_id,status,occurrence_count FROM maison_feedback_learning_patterns WHERE pattern_key=?1').bind(key).first();
  const status=existing?.status==='active'?'active':promoteLearningStatus({
    existingOccurrence:Number(existing?.occurrence_count||0),
    supportingRoles:roles.length,
    evidenceCount:evidence.length,
    confidence
  });
  const title=clean(item.title||key,240);
  const guidance=clean(item.guidance,1800);
  const rationale=clean(item.rationale,1800);
  if(!guidance||!rationale)return null;
  const dissent=(Array.isArray(item.dissent)?item.dissent:[]).map(x=>clean(x,500)).filter(Boolean).slice(0,8);

  if(existing){
    await db.prepare(`
      UPDATE maison_feedback_learning_patterns
         SET scope=?2,title=?3,guidance=?4,rationale=?5,confidence=?6,status=?7,
             occurrence_count=occurrence_count+1,
             evidence_feedback_ids_json=?8,supporting_roles_json=?9,dissent_json=?10,
             osiris_context_refs_json=?11,source_run_id=?12,last_seen_at=datetime('now'),updated_at=datetime('now')
       WHERE pattern_key=?1
    `).bind(key,scope,title,guidance,rationale,confidence,status,JSON.stringify(evidence),JSON.stringify(roles),JSON.stringify(dissent),JSON.stringify(osirisRefs),runId).run();
    return {pattern_id:existing.pattern_id,pattern_key:key,status,updated:true};
  }

  const id='flp_'+crypto.randomUUID();
  await db.prepare(`
    INSERT INTO maison_feedback_learning_patterns
      (pattern_id,pattern_key,scope,title,guidance,rationale,confidence,status,
       evidence_feedback_ids_json,supporting_roles_json,dissent_json,osiris_context_refs_json,source_run_id)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
  `).bind(id,key,scope,title,guidance,rationale,confidence,status,JSON.stringify(evidence),JSON.stringify(roles),JSON.stringify(dissent),JSON.stringify(osirisRefs),runId).run();
  return {pattern_id:id,pattern_key:key,status,updated:false};
}

export async function loadActiveFeedbackLearning(env,{limit=8}={}){
  if(!env?.GROWTH_DB)return [];
  try{
    const safe=Math.max(1,Math.min(12,Number.parseInt(limit,10)||8));
    const result=await env.GROWTH_DB.prepare(`
      SELECT pattern_key,scope,title,guidance,confidence,occurrence_count,updated_at
        FROM maison_feedback_learning_patterns
       WHERE status='active'
       ORDER BY confidence DESC, occurrence_count DESC, updated_at DESC
       LIMIT ${safe}
    `).all();
    return result?.results||[];
  }catch{return [];}
}

export async function runFeedbackLearning(env,{date=new Date(),feedbackLimit=12}={}){
  if(!env?.GROWTH_DB)return {skipped:'growth_db_missing'};
  if(String(env.ZERO_COST_MODE||'').toLowerCase()!=='true')return {skipped:'zero_cost_mode_required'};
  let models;
  try{models=openRouterZeroCostModels(env);}catch{return {skipped:'openrouter_free_models_unavailable'};}
  if(models.length<4)return {skipped:'insufficient_free_model_diversity'};

  await ensureSchema(env.GROWTH_DB);
  const feedback=await loadFeedback(env.GROWTH_DB,feedbackLimit);
  if(feedback.length<4)return {skipped:'insufficient_feedback',feedback_count:feedback.length};
  const packet=feedbackPacket(feedback);
  const osirisRows=await loadOsirisContext(env.GROWTH_DB,8);
  const osiris=osirisPacket(osirisRows);
  const existing=await loadExistingPatterns(env.GROWTH_DB,20);
  const inputHash=await sha256(JSON.stringify(packet.map(x=>[x.feedback_id,x.persona_id,x.page_key])));

  const duplicate=await env.GROWTH_DB.prepare('SELECT learning_run_id,status FROM maison_feedback_learning_runs WHERE input_hash=?1').bind(inputHash).first();
  if(duplicate){
    if(duplicate.status==='started'){
      const rows=await env.GROWTH_DB.prepare(`
        SELECT role,provider_id,model_id,payload_json
          FROM maison_feedback_learning_reviews
         WHERE learning_run_id=?1
         ORDER BY created_at ASC
      `).bind(duplicate.learning_run_id).all();
      const resumedReviews=(rows?.results||[]).map(row=>({
        role:row.role,
        provider_id:row.provider_id,
        model_id:row.model_id,
        payload:parseJsonObject(row.payload_json)
      }));
      if(resumedReviews.length>=2){
        return await finalizeLearningRun(env,{
          runId:duplicate.learning_run_id,
          packet,
          osiris,
          reviews:resumedReviews,
          errors:[],
          existing,
          resumed:true
        });
      }
      return {skipped:'feedback_learning_in_progress',learning_run_id:duplicate.learning_run_id,status:duplicate.status};
    }
    return {skipped:'feedback_learning_duplicate',learning_run_id:duplicate.learning_run_id,status:duplicate.status};
  }

  const runId='fbl_'+crypto.randomUUID();
  await env.GROWTH_DB.prepare(`
    INSERT INTO maison_feedback_learning_runs
      (learning_run_id,input_hash,feedback_count,osiris_context_count,status)
    VALUES(?1,?2,?3,?4,'started')
  `).bind(runId,inputHash,packet.length,osiris.length).run();

  const base=Math.floor(date.getTime()/86400000)%models.length;
  const reviewerTasks=REVIEWER_ROLES.map(async(role,i)=>{
    try{
      const {out,payload}=await callFreeJson(env,models,base+i,buildReviewerPrompt({role,feedback:packet,osiris}));
      return {ok:true,review:{role:role.id,provider_id:out.providerId,model_id:out.modelId,payload}};
    }catch(error){
      return {ok:false,error:{role:role.id,error:clean(error?.message||error,500)}};
    }
  });

  if(enabled(env.OSIRIS_GATEWAY_ENABLED)&&env.OSIRIS_GATEWAY_API_KEY&&env.OSIRIS_GATEWAY_MODEL){
    const role={id:'osiris_gateway_challenger',label:'OSIRIS AI Gateway — contraditor',brief:'Procura o ponto cego comum às três revisões e desafia consenso fácil.'};
    reviewerTasks.push((async()=>{
      try{
        const out=await callOsirisGateway(env,buildReviewerPrompt({role,feedback:packet,osiris}));
        if(!String(out?.text||'').trim())throw new Error('osiris_gateway_empty_response');
        const payload=parseJsonObject(out.text);
        return {ok:true,review:{role:role.id,provider_id:out.providerId,model_id:out.modelId,payload}};
      }catch(error){
        return {ok:false,error:{role:role.id,error:clean(error?.message||error,500)}};
      }
    })());
  }

  const settled=await Promise.all(reviewerTasks);
  const reviews=settled.filter(x=>x.ok).map(x=>x.review);
  const errors=settled.filter(x=>!x.ok).map(x=>x.error);

  for(const review of reviews){
    await env.GROWTH_DB.prepare(`
      INSERT INTO maison_feedback_learning_reviews
        (review_id,learning_run_id,role,provider_id,model_id,payload_json)
      VALUES(?1,?2,?3,?4,?5,?6)
    `).bind('flv_'+crypto.randomUUID(),runId,review.role,review.provider_id,review.model_id||null,JSON.stringify(review.payload)).run();
  }

  if(reviews.length<2){
    const detail=JSON.stringify({errors,reviews:reviews.map(x=>x.role)});
    await env.GROWTH_DB.prepare(`
      UPDATE maison_feedback_learning_runs
         SET reviewer_count=?2,status='failed',detail_json=?3,completed_at=datetime('now')
       WHERE learning_run_id=?1
    `).bind(runId,reviews.length,detail).run();
    return {learning_run_id:runId,stored:0,active:0,candidate:0,reviewers:reviews.length,errors:errors.length,status:'failed'};
  }

  return await finalizeLearningRun(env,{runId,packet,osiris,reviews,errors,existing,resumed:false});
}

async function finalizeLearningRun(env,{runId,packet,osiris,reviews,errors=[],existing=[],resumed=false}){
  const validRoles=reviews.map(x=>x.role);
  const feedbackIds=packet.map(x=>x.feedback_id);
  const osirisIds=osiris.map(x=>x.observation_id);
  const patterns=synthesizePatternsFromReviews(reviews,{feedbackIds,osirisIds,existing});
  const stored=[];
  for(const item of patterns){
    try{
      const result=await storePattern(env.GROWTH_DB,{item,runId,validRoles,feedbackIds,osirisIds});
      if(result)stored.push(result);
    }catch(error){errors.push({role:'store_pattern',error:clean(error?.message||error,500)});}
  }

  const active=stored.filter(x=>x.status==='active').length;
  const candidate=stored.filter(x=>x.status==='candidate').length;
  const detail=JSON.stringify({
    review_roles:validRoles,
    errors,
    resumed,
    synthesis:'deterministic_consensus_v1',
    osiris_osint_refs:osirisIds,
    osiris_gateway_used:validRoles.includes('osiris_gateway_challenger'),
    osiris_memory_configured:enabled(env.OSIRIS_MEMORY_ENABLED)&&Boolean(env.OSIRIS_MEMORY_BRIDGE_URL)&&Boolean(env.OSIRIS_MEMORY_BRIDGE_TOKEN)
  }).slice(0,12000);

  await env.GROWTH_DB.prepare(`
    UPDATE maison_feedback_learning_runs
       SET reviewer_count=?2,stored_patterns=?3,active_patterns=?4,candidate_patterns=?5,
           status='completed',detail_json=?6,completed_at=datetime('now')
     WHERE learning_run_id=?1
  `).bind(runId,reviews.length,stored.length,active,candidate,detail).run();

  return {
    learning_run_id:runId,
    feedback_count:packet.length,
    osiris_context_count:osiris.length,
    reviewers:reviews.length,
    stored:stored.length,
    active,
    candidate,
    errors:errors.length,
    resumed,
    patterns:stored
  };
}

export {
  REVIEWER_ROLES,
  buildReviewerPrompt,
  buildSynthesisPrompt,
  normalizePatternKey,
  parseJsonObject,
  synthesizePatternsFromReviews
};
