import {normalizeVaultVpcRow} from './vpc-question-engine.js';

const PUBLIC_VPC_CACHE_TTL_MS=5*60*1000;
const PUBLIC_VPC_CACHE=new Map();

export async function listActivePublicVpcQuestions(db,test){
  const theme=themeForTest(test);
  if(!theme)return [];
  const cached=PUBLIC_VPC_CACHE.get(theme);
  if(cached&&cached.expiresAt>Date.now())return structuredClone(cached.rows);
  try{
    const result=await db.prepare(
      `SELECT question_id,text,theme,product_fit_json,source_ocean_id,status,exposure,lifecycle_state,rotation_state
         FROM vault_questions
        WHERE status='active'
          AND exposure='public_social'
          AND lifecycle_state='live'
          AND rotation_state IN ('new','limited','normal')
          AND theme=?1
        ORDER BY question_id`
    ).bind(theme).all();

    const rows=(result.results||[])
      .map(normalizeVaultVpcRow)
      .filter(Boolean);
    PUBLIC_VPC_CACHE.set(theme,{rows,expiresAt:Date.now()+PUBLIC_VPC_CACHE_TTL_MS});
    return structuredClone(rows);
  }catch{
    return [];
  }
}

function themeForTest(test){
  const value=String(test||'').toLowerCase();
  if(value==='attention'||value==='atencao')return 'vpc-attention';
  if(value==='apego'||value==='attachment')return 'vpc-apego';
  if(value==='afeto'||value==='afecto'||value==='affection')return 'vpc-afeto';
  return '';
}


export async function listLocalizedPublicVpcSet(db,test,locale,seed){
  const normalized=normalizePublicTest(test);
  const target=normalizeVpcLocale(locale);
  if(!normalized||target==='pt-PT')return null;
  const coreTest=normalized==='attention'?'attention-core':normalized;
  const coreCount=normalized==='attention'?12:10;
  const core=await localizedRows(db,coreTest,target);
  if(core.length<coreCount)return null;
  const rng=seededRandom(String(seed||'vpc')+'|'+normalized+'|'+target);
  const questions=shuffleWith(core,rng).slice(0,coreCount).map(row=>toPublicCard(row,coreTest));
  if(questions.some(x=>!x))return null;
  let routeQuestions=[];
  if(normalized==='attention'){
    const route=await localizedRows(db,'attention-route',target);
    if(route.length<2)return null;
    routeQuestions=shuffleWith(route,rng).slice(0,2).map(row=>toPublicCard(row,'attention-route'));
    if(routeQuestions.some(x=>!x))return null;
  }
  return {questions,routeQuestions};
}
async function localizedRows(db,test,locale){
  const result=await db.prepare(`
    SELECT q.source_id,q.test,t.question_text,t.choices_json
      FROM vpc_public_questions q
      JOIN vpc_public_question_translations t ON t.source_id=q.source_id
     WHERE q.test=?1 AND q.status='active' AND t.locale=?2 AND t.status='active'
     ORDER BY q.source_id`).bind(test,locale).all();
  return result.results||[];
}
function toPublicCard(row,test){
  let choices;
  try{choices=JSON.parse(row.choices_json||'[]')}catch{return null}
  if(!Array.isArray(choices)||!row.question_text)return null;
  if(test==='attention-core'){
    const a=choices.map(x=>{
      const [p,s]=String(x.key||'').split('|');
      return {t:String(x.text||''),p,s};
    });
    return {q:String(row.question_text),a};
  }
  if(test==='attention-route'){
    return {q:String(row.question_text),a:choices.map(x=>({t:String(x.text||''),r:String(x.key||'').replace(/^route:/,'')}))};
  }
  return [String(row.question_text),choices.map(x=>[String(x.key||''),String(x.text||'')])];
}
function normalizePublicTest(test){
  const value=String(test||'').toLowerCase();
  if(value==='attention'||value==='atencao')return 'attention';
  if(value==='apego'||value==='attachment')return 'apego';
  if(value==='afeto'||value==='afecto'||value==='affection')return 'afeto';
  return '';
}
function normalizeVpcLocale(locale){
  const value=String(locale||'').toLowerCase();
  if(value==='pt-br'||value==='br')return 'pt-BR';
  if(value==='en')return 'en';
  if(value==='es')return 'es';
  return 'pt-PT';
}
function seededRandom(seed){
  let h=2166136261;
  for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}
  return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
}
function shuffleWith(items,rng){
  const out=items.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}
