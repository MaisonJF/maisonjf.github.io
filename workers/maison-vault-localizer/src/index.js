const LOCALES=['pt-BR','en','es'];
const QUALITY_VERSION='vault-localizer-v1';

function enabled(value){return String(value??'').toLowerCase()==='true';}
function clamp(value,fallback,min,max){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):fallback;
}
function structuredItems(data){
  const candidates=[
    data?.response,
    data?.result?.response,
    data?.choices?.[0]?.message?.parsed,
    data?.choices?.[0]?.message?.content,
    data?.choices?.[0]?.text,
    data
  ];
  for(const candidate of candidates){
    if(candidate&&typeof candidate==='object'&&Array.isArray(candidate.items))return candidate.items;
    if(typeof candidate!=='string')continue;
    let raw=candidate.trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
    try{
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed?.items))return parsed.items;
      if(Array.isArray(parsed))return parsed;
    }catch{}
    const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
    if(start>=0&&end>start){
      try{
        const parsed=JSON.parse(raw.slice(start,end+1));
        if(Array.isArray(parsed?.items))return parsed.items;
      }catch{}
    }
  }
  throw new Error('localizer_invalid_structured_output');
}
function translationSchema(kind){
  const properties=kind==='question'
    ? {id:{type:'string'},text:{type:'string'}}
    : {id:{type:'string'},title:{type:['string','null']},text:{type:'string'}};
  return {
    type:'object',
    properties:{
      items:{
        type:'array',
        items:{
          type:'object',
          properties,
          required:kind==='question'?['id','text']:['id','title','text'],
          additionalProperties:false
        }
      }
    },
    required:['items'],
    additionalProperties:false
  };
}
function normalizeText(value,max){
  const text=String(value??'').replace(/\r\n?/g,'\n').trim();
  return text.length>=2&&text.length<=max?text:null;
}
function sameText(a,b){
  const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  return norm(a)===norm(b);
}
function localeInstruction(locale){
  if(locale==='pt-BR')return 'Português brasileiro natural e contemporâneo, preservando intimidade e sentido.';
  if(locale==='en')return 'Natural international English, emotionally precise and contemporary.';
  if(locale==='es')return 'Natural international Spanish, emotionally precise and contemporary.';
  throw new Error('unsupported_locale');
}

async function callTranslator(env,{locale,kind,items}){
  if(!env.AI)throw new Error('workers_ai_binding_missing');
  if(!items.length)return [];
  const payload=items.map(x=>kind==='question'
    ? {id:x.id,text:x.text}
    : {id:x.id,title:x.title||null,text:x.text}
  );
  const system=[
    'You are the private localization engine for MAISON JF paid reflective editorial content.',
    'Source language is European Portuguese (pt-PT).',
    'Preserve meaning, emotional precision, ambiguity, intensity, punctuation and direct address.',
    'Do not add explanations, diagnoses, predictions, advice, disclaimers or new facts.',
    'Do not translate MAISON JF brand names. Keep every ID exactly unchanged.',
    kind==='question'
      ? 'Each item is a standalone reflective question. Keep it concise and preserve a final question mark when present.'
      : 'Each item is an Oracle editorial block. Preserve paragraph breaks. Translate title only when one exists; otherwise return null.'
  ].join(' ');
  const user=[
    'Target locale: '+locale+'.',
    localeInstruction(locale),
    'Translate every input item exactly once and return only the structured result.',
    'INPUT:',
    JSON.stringify(payload)
  ].join('\n');
  const data=await env.AI.run(env.LOCALIZER_MODEL||'@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
    messages:[
      {role:'system',content:system},
      {role:'user',content:user}
    ],
    response_format:{
      type:'json_schema',
      json_schema:translationSchema(kind)
    },
    max_tokens:3072,
    temperature:0.1
  });
  const translated=structuredItems(data);
  if(translated.length!==items.length)throw new Error('localizer_item_count_mismatch');
  return translated;
}

async function activateApproved(db,locale){
  await db.prepare(`
    UPDATE vault_question_translations
       SET status='active',activated_at=coalesce(activated_at,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     WHERE locale=?1 AND status='approved'
       AND question_id IN (
         SELECT question_id FROM vault_questions
          WHERE status='active' AND exposure='paid' AND lifecycle_state='live'
            AND rotation_state IN ('new','limited','normal')
       )`).bind(locale).run();
  await db.prepare(`
    UPDATE vault_oracle_block_translations
       SET status='active',activated_at=coalesce(activated_at,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     WHERE locale=?1 AND status='approved'
       AND block_id IN (
         SELECT block_id FROM vault_oracle_blocks
          WHERE status='active' AND lifecycle_state='live'
            AND rotation_state IN ('new','limited','normal')
       )`).bind(locale).run();
}

async function questionBatch(db,locale,limit){
  const result=await db.prepare(`
    SELECT q.question_id AS id,q.text
      FROM vault_questions q
      LEFT JOIN vault_question_translations t
        ON t.question_id=q.question_id AND t.locale=?1
     WHERE q.status='active' AND q.exposure='paid' AND q.lifecycle_state='live'
       AND q.rotation_state IN ('new','limited','normal')
       AND (t.question_id IS NULL OR t.status <> 'active')
     ORDER BY q.question_id
     LIMIT ?2`).bind(locale,limit).all();
  return result.results||[];
}
async function oracleBatch(db,locale,limit){
  const result=await db.prepare(`
    SELECT b.block_id AS id,b.title,b.text
      FROM vault_oracle_blocks b
      LEFT JOIN vault_oracle_block_translations t
        ON t.block_id=b.block_id AND t.locale=?1
     WHERE b.status='active' AND b.lifecycle_state='live'
       AND b.rotation_state IN ('new','limited','normal')
       AND (t.block_id IS NULL OR t.status IN ('candidate','review'))
     ORDER BY b.block_id
     LIMIT ?2`).bind(locale,limit).all();
  return result.results||[];
}

async function storeQuestions(db,locale,source,translated){
  const byId=new Map(source.map(x=>[String(x.id),x]));
  const seen=new Set(),writes=[];
  for(const item of translated){
    const id=String(item?.id||'');
    if(!id||seen.has(id)||!byId.has(id))continue;
    seen.add(id);
    const original=byId.get(id);
    const text=normalizeText(item.text,800);
    if(!text)continue;
    if(original.text.trim().endsWith('?')&&!text.endsWith('?'))continue;
    if(locale!=='pt-BR'&&original.text.length>20&&sameText(original.text,text))continue;
    writes.push(db.prepare(`
      INSERT INTO vault_question_translations
        (question_id,locale,text,status,source_kind,quality_version,activated_at)
      VALUES(?1,?2,?3,'active','brain_localization',?4,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(question_id,locale) DO UPDATE SET
        text=excluded.text,status='active',source_kind=excluded.source_kind,
        quality_version=excluded.quality_version,activated_at=excluded.activated_at
      WHERE vault_question_translations.status <> 'active'`)
      .bind(id,locale,text,QUALITY_VERSION));
  }
  for(let i=0;i<writes.length;i+=50)await db.batch(writes.slice(i,i+50));
  return writes.length;
}

async function storeOracle(db,locale,source,translated){
  const byId=new Map(source.map(x=>[String(x.id),x]));
  const seen=new Set(),writes=[];
  for(const item of translated){
    const id=String(item?.id||'');
    if(!id||seen.has(id)||!byId.has(id))continue;
    seen.add(id);
    const original=byId.get(id);
    const text=normalizeText(item.text,12000);
    const title=item.title==null?null:normalizeText(item.title,300);
    if(!text)continue;
    if(locale!=='pt-BR'&&original.text.length>20&&sameText(original.text,text))continue;
    writes.push(db.prepare(`
      INSERT INTO vault_oracle_block_translations
        (block_id,locale,title,text,status,source_kind,quality_version,activated_at)
      VALUES(?1,?2,?3,?4,'active','brain_localization',?5,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(block_id,locale) DO UPDATE SET
        title=excluded.title,text=excluded.text,status='active',
        source_kind=excluded.source_kind,quality_version=excluded.quality_version,
        activated_at=excluded.activated_at
      WHERE vault_oracle_block_translations.status IN ('candidate','review')`)
      .bind(id,locale,title,text,QUALITY_VERSION));
  }
  for(let i=0;i<writes.length;i+=30)await db.batch(writes.slice(i,i+30));
  return writes.length;
}

async function localizeLocale(env,locale,{questionLimit,oracleLimit}){
  const db=env.GROWTH_DB;
  await activateApproved(db,locale);
  const [questions,oracle]=await Promise.all([
    questionLimit>0?questionBatch(db,locale,questionLimit):Promise.resolve([]),
    oracleLimit>0?oracleBatch(db,locale,oracleLimit):Promise.resolve([])
  ]);
  let questionsActivated=0,oracleActivated=0;
  if(questions.length){
    const translated=await callTranslator(env,{locale,kind:'question',items:questions});
    questionsActivated=await storeQuestions(db,locale,questions,translated);
  }
  if(oracle.length){
    const translated=await callTranslator(env,{locale,kind:'oracle',items:oracle});
    oracleActivated=await storeOracle(db,locale,oracle,translated);
  }
  return {locale,questionsActivated,oracleActivated};
}

async function pendingCounts(db){
  const q=await db.prepare(`
    SELECT l.locale,COUNT(*) AS pending
      FROM (SELECT 'pt-BR' locale UNION ALL SELECT 'en' UNION ALL SELECT 'es') l
      JOIN vault_questions q
        ON q.status='active' AND q.exposure='paid' AND q.lifecycle_state='live'
       AND q.rotation_state IN ('new','limited','normal')
      LEFT JOIN vault_question_translations t
        ON t.question_id=q.question_id AND t.locale=l.locale AND t.status='active'
     WHERE t.question_id IS NULL
     GROUP BY l.locale ORDER BY l.locale`).all();
  const o=await db.prepare(`
    SELECT l.locale,COUNT(*) AS pending
      FROM (SELECT 'pt-BR' locale UNION ALL SELECT 'en' UNION ALL SELECT 'es') l
      JOIN vault_oracle_blocks b
        ON b.status='active' AND b.lifecycle_state='live'
       AND b.rotation_state IN ('new','limited','normal')
      LEFT JOIN vault_oracle_block_translations t
        ON t.block_id=b.block_id AND t.locale=l.locale AND t.status='active'
     WHERE t.block_id IS NULL
     GROUP BY l.locale ORDER BY l.locale`).all();
  const questions=Object.fromEntries((q.results||[]).map(x=>[x.locale,Number(x.pending||0)]));
  const oracle=Object.fromEntries((o.results||[]).map(x=>[x.locale,Number(x.pending||0)]));
  for(const locale of LOCALES){questions[locale]??=0;oracle[locale]??=0;}
  return {
    questions,oracle,
    total:Object.values(questions).reduce((a,b)=>a+b,0)+Object.values(oracle).reduce((a,b)=>a+b,0)
  };
}

async function persistTelemetry(db,{locale,questionsActivated=0,oracleActivated=0,pending}) {
  await db.prepare(`INSERT INTO vault_localizer_telemetry (
    singleton_id,updated_at,last_locale,last_status,last_questions_activated,last_oracle_activated,
    pending_total,pending_questions_pt_br,pending_questions_en,pending_questions_es,
    pending_oracle_pt_br,pending_oracle_en,pending_oracle_es
  ) VALUES (1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),?1,'success',?2,?3,?4,?5,?6,?7,?8,?9,?10)
  ON CONFLICT(singleton_id) DO UPDATE SET
    updated_at=excluded.updated_at,last_locale=excluded.last_locale,last_status=excluded.last_status,
    last_questions_activated=excluded.last_questions_activated,last_oracle_activated=excluded.last_oracle_activated,
    pending_total=excluded.pending_total,pending_questions_pt_br=excluded.pending_questions_pt_br,
    pending_questions_en=excluded.pending_questions_en,pending_questions_es=excluded.pending_questions_es,
    pending_oracle_pt_br=excluded.pending_oracle_pt_br,pending_oracle_en=excluded.pending_oracle_en,
    pending_oracle_es=excluded.pending_oracle_es`)
    .bind(locale,questionsActivated,oracleActivated,pending.total,pending.questions['pt-BR'],
      pending.questions.en,pending.questions.es,pending.oracle['pt-BR'],pending.oracle.en,pending.oracle.es)
    .run();
}

export async function runVaultLocalization(env,{locale}={}){
  if(!enabled(env.LOCALIZER_ENABLED))return {skipped:'disabled'};
  const legacyLimit=clamp(env.LOCALIZER_BATCH_SIZE,12,1,24);
  const questionLimit=clamp(env.LOCALIZER_QUESTION_BATCH_SIZE,legacyLimit,0,24);
  const oracleLimit=clamp(env.LOCALIZER_ORACLE_BATCH_SIZE,2,0,8);
  const chosen=LOCALES.includes(locale)?locale:LOCALES[0];
  const result=await localizeLocale(env,chosen,{questionLimit,oracleLimit});
  const pending=await pendingCounts(env.GROWTH_DB);
  await persistTelemetry(env.GROWTH_DB,{locale:chosen,questionsActivated:result.questionsActivated,oracleActivated:result.oracleActivated,pending});
  return {results:[result],pending};
}

function isResourceLimit(error){
  const message=String(error?.message||'').toLowerCase();
  return message.includes('4006')||
    message.includes('daily free allocation')||
    message.includes('free tier daily row read limit')||
    message.includes('exceeded d1')||
    message.includes('rate limit')||
    message.includes('quota');
}

async function readPendingTelemetry(db){
  const row=await db.prepare(`
    SELECT pending_total,pending_questions_pt_br,pending_questions_en,pending_questions_es,
           pending_oracle_pt_br,pending_oracle_en,pending_oracle_es
      FROM vault_localizer_telemetry WHERE singleton_id=1 LIMIT 1`).first();
  if(!row)return null;
  return {
    total:Number(row.pending_total||0),
    questions:{'pt-BR':Number(row.pending_questions_pt_br||0),en:Number(row.pending_questions_en||0),es:Number(row.pending_questions_es||0)},
    oracle:{'pt-BR':Number(row.pending_oracle_pt_br||0),en:Number(row.pending_oracle_en||0),es:Number(row.pending_oracle_es||0)}
  };
}

function decrementPending(snapshot,locale,questionsActivated){
  if(!snapshot)return null;
  const pending=structuredClone(snapshot);
  pending.questions[locale]=Math.max(0,Number(pending.questions[locale]||0)-questionsActivated);
  pending.total=Object.values(pending.questions).reduce((a,b)=>a+b,0)+Object.values(pending.oracle).reduce((a,b)=>a+b,0);
  return pending;
}

async function runQuestionBackfill(env,locale){
  const db=env.GROWTH_DB;
  const limit=clamp(env.LOCALIZER_BACKFILL_SIZE,60,20,120);
  const chunk=clamp(env.LOCALIZER_AI_CHUNK_SIZE,25,5,25);
  const candidates=await questionBatch(db,locale,limit);
  let questionsActivated=0,failedBatches=0,resourceLimited=false,attempted=0;
  for(let i=0;i<candidates.length;i+=chunk){
    const batch=candidates.slice(i,i+chunk);
    attempted+=batch.length;
    try{
      const translated=await callTranslator(env,{locale,kind:'question',items:batch});
      questionsActivated+=await storeQuestions(db,locale,batch,translated);
    }catch(error){
      failedBatches++;
      console.error('Vault backfill batch failed',JSON.stringify({
        locale,batchStart:i,batchSize:batch.length,
        name:String(error?.name||'Error'),
        message:String(error?.message||'backfill_batch_failed').slice(0,500)
      }));
      if(isResourceLimit(error)){resourceLimited=true;break;}
    }
  }
  if(resourceLimited){
    return {locale,questionsActivated,failedBatches,attempted,resourceLimited,pending:null};
  }
  const previous=await readPendingTelemetry(db);
  const pending=decrementPending(previous,locale,questionsActivated);
  if(pending)await persistTelemetry(db,{locale,questionsActivated,oracleActivated:0,pending});
  return {locale,questionsActivated,failedBatches,attempted,resourceLimited,pending};
}

function localeForSchedule(controller,env){
  const forced=String(env.LOCALIZER_LOCALE||'').trim();
  if(LOCALES.includes(forced))return forced;
  const when=Number(controller?.scheduledTime||Date.now());
  const utcDayIndex=Math.floor(when/86400000);
  return LOCALES[((utcDayIndex%LOCALES.length)+LOCALES.length)%LOCALES.length];
}

async function runLocalizationRounds(env,locale){
  const rounds=clamp(env.LOCALIZER_ROUNDS_PER_CRON,1,1,2);
  let last=null;
  for(let i=0;i<rounds;i++){
    last=await runVaultLocalization(env,{locale});
    const q=Number(last?.pending?.questions?.[locale]||0);
    const o=Number(last?.pending?.oracle?.[locale]||0);
    if(q+o===0)break;
  }
  return last;
}

export default {
  async fetch(){return new Response('Not Found',{status:404});},
  async scheduled(controller,env,ctx){
    const locale=localeForSchedule(controller,env);
    ctx.waitUntil(
      runQuestionBackfill(env,locale).then(result=>{
        const pending=result?.pending||{};
        console.log('Vault question backfill completed',JSON.stringify({
          locale,
          attempted:Number(result?.attempted||0),
          questionsActivated:Number(result?.questionsActivated||0),
          failedBatches:Number(result?.failedBatches||0),
          resourceLimited:Boolean(result?.resourceLimited),
          pendingTotal:pending?Number(pending.total||0):null,
          pendingQuestions:pending?.questions||null,
          pendingOracle:pending?.oracle||null
        }));
        return result;
      }).catch(error=>{
        console.error('Vault localizer exception',JSON.stringify({
          locale,
          name:String(error?.name||'Error'),
          message:String(error?.message||'localizer_failed').slice(0,500)
        }));
        throw error;
      })
    );
  }
};
