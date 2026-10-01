import { ingestVaultCandidate } from './vault_candidates.js';

const MAX_QUESTIONS=4;
const MAX_ORACLE_BLOCKS=2;

function clean(value,max=2400){
  return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
}
function candidatePrompt({oceanContext,brainAlert}){
  const ocean=clean(oceanContext?.oceanKey,160);
  const summary=clean(brainAlert?.response_excerpt,2400);
  const terms=(oceanContext?.matchedTerms||[]).map(x=>clean(x,100)).filter(Boolean).slice(0,8);
  return [
    'MAISON JF® PRIVATE EDITORIAL LAB. Produce candidate material only; never approve, activate or publish it.',
    'Write original European Portuguese. Do not quote sources, include names/usernames, personal confessions, contact details, medical diagnosis, supernatural certainty, false urgency or manipulative claims.',
    'The material will enter a private D1 Vault as candidate and will still require human/editorial review.',
    'Return STRICT JSON only, with exactly this top-level shape: {"questions":[],"oracle_blocks":[]}. No Markdown or commentary.',
    `Ocean key: ${ocean}`,
    `Observed public-language summary: ${summary}`,
    `Useful theme terms: ${terms.join(' | ')||'none'}`,
    '',
    'questions: 0 to 4 genuinely distinct questions. Prefer different moments/contexts, not synonyms. Use fields: theme, text, stage, exposure, intensity, target, pain_family, subterritory, emotional_function, cognitive_load, vulnerability, conflict_potential, playfulness, subthemes.',
    'Allowed stage: open, recognize, deepen, touch, close, signature. exposure: paid or public_social. intensity: 1-4. target: self, partner, both, prediction.',
    'Paid questions may fit PÁRA DE IGNORAR!. public_social questions must be safe for a free Volta Para Casa test and must not reveal or recycle a paid body.',
    'oracle_blocks: 0 to 2 original generic reflection blocks, never a final personalized reading. Use fields: territory, role, title, text, intensity, tone, rarity, pain_family, subterritory, emotional_function, tags.',
    'Allowed Oracle role: opening, recognition, tension, counterpoint, reframe, movement, close. intensity: 1-4. tone: gentle, direct, intimate, clear, confrontational. rarity: common, uncommon, rare.',
    'Keep every item useful on its own and recognizably MAISON: direct, intimate, elegant, simple, not clinical.'
  ].join('\n');
}
function parseJsonObject(raw){
  const text=String(raw??'').trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  const start=text.indexOf('{'), end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('editorial_candidate_json_missing');
  let parsed;
  try{parsed=JSON.parse(text.slice(start,end+1));}catch{throw new Error('editorial_candidate_json_invalid');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('editorial_candidate_payload_invalid');
  return parsed;
}
function rows(value,max){
  return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).slice(0,max):[];
}
function fallbackTheme(oceanContext){
  return clean(oceanContext?.matchedTerms?.[0]||oceanContext?.oceanKey||'maison',120);
}
function publicResult(result){
  return {
    content_type:result.content_type,
    content_id:result.content_id,
    duplicate:result.duplicate===true,
    status:result.status,
    lifecycle_state:result.lifecycle_state,
    editorial_review_required:result.editorial_review_required
  };
}

export async function generateEditorialCandidates(env,{caller,oceanContext,brainAlert,providerId='openrouter'}={}){
  if(typeof caller!=='function')throw new Error('editorial_candidate_provider_missing');
  if(!oceanContext?.oceanKey||!brainAlert) return {called:false,stored:0,duplicates:0,rejected:0,results:[],usage:null};
  const generated=await caller(env,candidatePrompt({oceanContext,brainAlert}));
  const payload=parseJsonObject(generated?.text);
  const questions=rows(payload.questions,MAX_QUESTIONS);
  const oracleBlocks=rows(payload.oracle_blocks,MAX_ORACLE_BLOCKS);
  const results=[];
  let rejected=0;
  for(const item of questions){
    try{
      const result=await ingestVaultCandidate(env,{
        ...item,
        content_type:'question',
        source_ocean_id:oceanContext.oceanKey,
        theme:item.theme||fallbackTheme(oceanContext),
        exposure:item.exposure==='public_social'?'public_social':'paid'
      });
      results.push(publicResult(result));
    }catch(error){
      rejected++;
      console.warn('MAISON_EDITORIAL_CANDIDATE_REJECTED','question',error?.message||error);
    }
  }
  for(const item of oracleBlocks){
    try{
      const result=await ingestVaultCandidate(env,{
        ...item,
        content_type:'oracle_block',
        source_ocean_id:oceanContext.oceanKey,
        territory:item.territory||fallbackTheme(oceanContext),
        role:item.role||'recognition'
      });
      results.push(publicResult(result));
    }catch(error){
      rejected++;
      console.warn('MAISON_EDITORIAL_CANDIDATE_REJECTED','oracle_block',error?.message||error);
    }
  }
  return {
    called:true,
    provider_id:generated?.providerId||providerId,
    model_id:generated?.modelId||null,
    stored:results.filter(x=>!x.duplicate).length,
    duplicates:results.filter(x=>x.duplicate).length,
    rejected,
    results,
    usage:generated?.usage||null
  };
}

export { candidatePrompt, parseJsonObject };
