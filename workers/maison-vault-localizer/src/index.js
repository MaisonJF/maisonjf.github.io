const LOCALES=['pt-BR','en','es'];
const QUALITY_VERSION='vault-localizer-v1';

function enabled(value){return String(value??'').toLowerCase()==='true';}
function clamp(value,fallback,min,max){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):fallback;
}
function aiText(data){
  return (typeof data==='string'&&data)||
    (typeof data?.response==='string'&&data.response)||
    (typeof data?.result?.response==='string'&&data.result.response)||
    (typeof data?.result==='string'&&data.result)||'';
}
function parseArray(text){
  let raw=String(text||'').trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  const start=raw.indexOf('['),end=raw.lastIndexOf(']');
  if(start<0||end<=start)throw new Error('localizer_invalid_json');
  const parsed=JSON.parse(raw.slice(start,end+1));
  if(!Array.isArray(parsed))throw new Error('localizer_array_required');
  return parsed;
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
  const payload=items.map(x=>kind==='question'?{id:x.id,text:x.text}:{id:x.id,title:x.title||null,text:x.text});
  const prompt=[
    'You are the private localization engine for MAISON JF paid reflective editorial content.',
    'Source language: European Portuguese (pt-PT). Target locale: '+locale+'.',
    localeInstruction(locale),
    'Preserve meaning, emotional precision, ambiguity, intensity, punctuation and direct address.',
    'Do not add explanations, diagnoses, predictions, advice, disclaimers or new facts.',
    'Do not translate MAISON JF brand names. Keep every ID exactly unchanged.',
    kind==='question'
      ? 'Each item is a standalone reflective question. Keep it concise and preserve a final question mark when present.'
      : 'Each item is an Oracle editorial block. Preserve paragraph breaks and translate the title when present.',
    'Return ONLY valid JSON, as an array in the same order.',
    kind==='question'?'Schema: [{"id":"...","text":"..."}]':'Schema: [{"id":"...","title":"..." or null,"text":"..."}]',
    'INPUT:',
    JSON.stringify(payload)
  ].join('\n');
  const data=await env.AI.run(env.LOCALIZER_MODEL||'@cf/google/gemma-4-26b-a4b-it',{
    messages:[
      {role:'system',content:'You are a precise private localization engine. Return only the requested JSON.'},
      {role:'user',content:prompt}
    ],
    max_tokens:4096,
    temperature:0.1
  });
  return parseArray(aiText(data));
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
       AND (t.question_id IS NULL OR t.status IN ('candidate','review'))
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
      WHERE vault_question_translations.status IN ('candidate','review')`)
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

async function localizeLocale(env,locale,limit){
  const db=env.GROWTH_DB;
  await activateApproved(db,locale);
  const [questions,oracle]=await Promise.all([
    questionBatch(db,locale,limit),
    oracleBatch(db,locale,Math.min(limit,14))
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

export async function runVaultLocalization(env){
  if(!enabled(env.LOCALIZER_ENABLED))return {skipped:'disabled'};
  const limit=clamp(env.LOCALIZER_BATCH_SIZE,24,4,40);
  const results=[];
  for(const locale of LOCALES){
    results.push(await localizeLocale(env,locale,limit));
  }
  return {results,pending:await pendingCounts(env.GROWTH_DB)};
}

async function runLocalizationRounds(env){
  const rounds=clamp(env.LOCALIZER_ROUNDS_PER_CRON,1,1,4);
  let last=null;
  for(let i=0;i<rounds;i++){
    last=await runVaultLocalization(env);
    if(last?.pending?.total===0)break;
  }
  return last;
}

export default {
  async fetch(){return new Response('Not Found',{status:404});},
  async scheduled(_controller,env,ctx){
    ctx.waitUntil(
      runLocalizationRounds(env).then(result=>{
        const pending=result?.pending||{};
        console.log('Vault localizer completed',JSON.stringify({
          pendingTotal:Number(pending.total||0),
          pendingQuestions:pending.questions||{},
          pendingOracle:pending.oracle||{}
        }));
        return result;
      }).catch(error=>{
        console.error('Vault localizer exception',JSON.stringify({
          name:String(error?.name||'Error'),
          message:String(error?.message||'localizer_failed').slice(0,500)
        }));
        throw error;
      })
    );
  }
};
