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
    'LABORATÓRIO EDITORIAL PRIVADO MAISON JF®. Produz apenas candidatos; nunca aproves, atives nem publiques.',
    'ESCREVE TODO O CONTEÚDO HUMANO EM PORTUGUÊS EUROPEU (PT-PT). Isto inclui text, title, theme, territory, pain_family, subterritory e emotional_function. Não devolvas inglês nem PT-BR. Traduz mentalmente antes de devolver o JSON.',
    'Não cites fontes nem incluas nomes/usernames, confissões pessoais, contactos, diagnóstico médico, certezas sobrenaturais, urgência falsa ou manipulação.',
    'O material entra num Vault D1 privado como candidate e continua sujeito a revisão humana/editorial.',
    'Devolve APENAS JSON válido, com exatamente esta forma de topo: {"questions":[],"oracle_blocks":[]}. Sem Markdown nem comentário.',
    `Ocean key: ${ocean}`,
    `Observed public-language summary: ${summary}`,
    `Useful theme terms: ${terms.join(' | ')||'none'}`,
    '',
    'questions: devolve exatamente 4 perguntas genuinamente distintas quando o sinal o suportar; nunca enchas com sinónimos. Usa momentos/contextos e estágios diferentes. Campos: theme, text, stage, exposure, intensity, target, pain_family, subterritory, emotional_function, cognitive_load, vulnerability, conflict_potential, playfulness, subthemes.',
    'A pergunta deve ser feita diretamente à pessoa e fazê-la reconhecer-se; não peças conselhos, estratégias ou ajuda do tipo “como posso…?”. Evita linguagem clínica, terapêutica ou de autoajuda genérica.',
    'stage permitido: open, recognize, deepen, touch, close, signature. exposure: paid ou public_social. intensity: inteiro 1-4. target: self, partner, both, prediction. cognitive_load, vulnerability, conflict_potential e playfulness TÊM de ser inteiros 1-5, nunca palavras.',
    'Das 4 perguntas, inclui pelo menos 2 paid para PÁRA DE IGNORAR! e pelo menos 1 public_social separada para um teste Volta Para Casa, quando for seguro e sustentado. Nunca recicles uma pergunta paga no gratuito.',
    'oracle_blocks: devolve exatamente 2 blocos genéricos de reflexão, originais e com papéis diferentes quando o sinal o suportar; nunca uma leitura personalizada final. Campos: territory, role, title, text, intensity, tone, rarity, pain_family, subterritory, emotional_function, tags.',
    'role permitido: opening, recognition, tension, counterpoint, reframe, movement, close. intensity: 1-4. tone: gentle, direct, intimate, clear, confrontational. rarity: common, uncommon, rare.',
    'Cada item deve funcionar sozinho e soar reconhecivelmente MAISON: íntimo, direto, elegante, simples e humano.'
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
function questionRows(value,max){
  const all=Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];
  const selected=all.slice(0,max);
  if(selected.length&& !selected.some(x=>x.exposure==='public_social')){
    const publicItem=all.find(x=>x.exposure==='public_social');
    if(publicItem)selected[selected.length-1]=publicItem;
  }
  return selected;
}
function score1to5(value,fallback=2){
  const n=Number(value);
  if(Number.isInteger(n)&&n>=1&&n<=5)return n;
  const s=String(value??'').trim().toLowerCase();
  if(['baixo','baixa','low'].includes(s))return 1;
  if(['moderado','moderada','médio','media','média','medium'].includes(s))return 3;
  if(['alto','alta','high'].includes(s))return 5;
  return fallback;
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
  const questions=questionRows(payload.questions,MAX_QUESTIONS);
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
        exposure:item.exposure==='public_social'?'public_social':'paid',
        cognitive_load:score1to5(item.cognitive_load,2),
        vulnerability:score1to5(item.vulnerability,2),
        conflict_potential:score1to5(item.conflict_potential,2),
        playfulness:score1to5(item.playfulness,2)
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
