import { ingestVaultCandidate } from './vault_candidates.js';
import { loadActiveFeedbackLearning } from './feedback_learning.js';
import { detectOperationalCommercialTopic, editorialDestinationDecision } from './content_suitability.js';

const MAX_QUESTIONS=6;
const MAX_ORACLE_BLOCKS=2;

function clean(value,max=2400){
  return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
}
function candidatePrompt({oceanContext,brainAlert,learningPatterns=[]}={}){
  const ocean=clean(oceanContext?.oceanKey,160);
  const summary=clean(brainAlert?.response_excerpt,2400);
  const terms=(oceanContext?.matchedTerms||[]).map(x=>clean(x,100)).filter(Boolean).slice(0,8);
  const learning=(learningPatterns||[]).slice(0,8).map((p,i)=>
    `${i+1}. [${p.scope||'global'}] ${clean(p.title,180)} → ${clean(p.guidance,700)} (confiança ${Number(p.confidence)||0}; repetição ${Number(p.occurrence_count)||1})`
  );
  return [
    'LABORATÓRIO EDITORIAL PRIVADO MAISON JF®. Produz apenas candidatos; nunca aproves, atives nem publiques.',
    'ESCREVE TODO O CONTEÚDO HUMANO EM PORTUGUÊS EUROPEU (PT-PT). Não devolvas inglês nem PT-BR.',
    'Não cites fontes nem incluas nomes/usernames, confissões pessoais, contactos, diagnóstico médico, certezas sobrenaturais, urgência falsa ou manipulação.',
    'O material que for aprovado para revisão entra num Vault D1 privado como candidate. A aprovação humana continua obrigatória.',
    'Antes de criares conteúdo, classifica o destino. Devolve APENAS JSON válido com esta forma: {"classification":{"eligible_destinations":[],"reason_code":"","reason":""},"questions":[],"oracle_blocks":[]}.',
    'eligible_destinations só pode conter: pdi_game, vpc_test, oracle, other_maison_asset, none. Se o sinal não servir de forma clara para um destino, usa other_maison_asset ou none e devolve arrays vazios. É perfeitamente correcto devolver zero perguntas e zero blocos de Oráculo.',
    'NÃO transformes sinais comerciais, técnicos ou operacionais em perguntas de jogo nem em afirmações de Oráculo. Ecommerce, customer journey, SEO, checkout, conversão, análise de vendas, UX do site, fornecedores, preço, stock, logística, integrações, código, deployment, métricas e estratégia comercial pertencem a outros destinos MAISON.',
    'Não uses o Oráculo como depósito de frases reflexivas genéricas. Só escolhe oracle quando existe uma tensão humana clara que beneficie de uma afirmação prudente, aberta e não preditiva. Não escrevas uma leitura pessoal como se conhecesses a pessoa.',
    'Só escolhe pdi_game (PÁRA DE IGNORAR!) quando a pergunta abre uma conversa real a dois ou num grupo e é adequada ao tema, modo e pack. Só escolhe vpc_test quando a pergunta mede ou explora uma experiência humana coerente com um teste de reflexão. Não forces uma pergunta gratuita para preencher cobertura.',
    'A pergunta deve ser feita diretamente à pessoa, num contexto reconhecível, sem pedir conselhos, estratégias ou ajuda do tipo “como posso…?”. Evita linguagem clínica ou de autoajuda genérica. O tema deve ser um slug estável em minúsculas, sem acentos, com palavras separadas por hífen.',
    `Ocean key: ${ocean}`,
    `Observed public-language summary: ${summary}`,
    `Useful theme terms: ${terms.join(' | ')||'none'}`,
    '',
    'APRENDIZAGEM EDITORIAL ATIVA (hipóteses vindas de contraditório sintético; não são factos nem ordens de publicação):',
    ...(learning.length?learning:['nenhuma aprendizagem ativa ainda']),
    'Usa esta aprendizagem apenas quando for relevante ao Ocean atual. Não sacrifiques identidade MAISON por uma regra genérica e não inventes prova que não esteja no sinal.',
    '',
    'questions: devolve entre 0 e 6 perguntas originais, apenas quando classification inclui pdi_game e/ou vpc_test. Nunca enchas com sinónimos. Cada pergunta tem de ter um destino claro: exposure=paid apenas para pdi_game; exposure=public_social apenas para vpc_test. Não mistures destinos nem recicles uma pergunta paga no gratuito. As perguntas de cada lote devem partilhar um tema canónico estável se fizerem realmente parte do mesmo tema.',
    'Campos de pergunta: theme, text, stage, exposure, intensity, target, pain_family, subterritory, emotional_function, cognitive_load, vulnerability, conflict_potential, playfulness, subthemes. stage: open, recognize, deepen, touch, close, signature. exposure: paid ou public_social. intensity: inteiro 1-4. target: self, partner, both, prediction. cognitive_load, vulnerability, conflict_potential e playfulness: inteiros 1-5.',
    'oracle_blocks: devolve entre 0 e 2 afirmações reflexivas originais apenas quando classification inclui oracle. Os blocos têm de desempenhar papéis diferentes, ser úteis sem contexto privado, admitir incerteza e devolver agência à pessoa. Não são previsões, diagnósticos ou certezas.',
    'Campos de bloco: territory, role, title, text, intensity, tone, rarity, pain_family, subterritory, emotional_function, tags. role: opening, recognition, tension, counterpoint, reframe, movement, close. intensity: 1-4. tone: gentle, direct, intimate, clear, confrontational. rarity: common, uncommon, rare.',
    'A ausência de conteúdo é melhor do que conteúdo absurdo, redundante, vazio ou sem destino. Cada item que produzires tem de soar reconhecivelmente MAISON: íntimo, directo, elegante, simples e humano.'
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
  const screening=detectOperationalCommercialTopic({
    sourceKey:oceanContext.oceanKey,
    sourceTitle:oceanContext.displayName||oceanContext.title||oceanContext.label||'',
    sourceSummary:brainAlert.response_excerpt,
    sourceTerms:oceanContext.matchedTerms||[]
  });
  if(!screening.eligibleForQuestionOrOracle){
    return {called:false,skipped:true,reason_code:screening.reasonCode,stored:0,duplicates:0,rejected:0,results:[],usage:null};
  }
  const learningPatterns=await loadActiveFeedbackLearning(env,{limit:8});
  const generated=await caller(env,candidatePrompt({oceanContext,brainAlert,learningPatterns}));
  const payload=parseJsonObject(generated?.text);
  const destination=editorialDestinationDecision(payload?.classification?.eligible_destinations);
  if(!destination.valid){
    return {called:true,skipped:true,reason_code:'editorial_classification_missing_or_invalid',stored:0,duplicates:0,rejected:0,results:[],usage:generated?.usage||null};
  }
  const destinations=new Set(destination.destinations);
  if(destinations.size===0){
    return {
      called:true,skipped:true,
      reason_code:clean(payload.classification?.reason_code||'no_suitable_destination',120),
      reason:clean(payload.classification?.reason||'',400),
      stored:0,duplicates:0,rejected:0,results:[],usage:generated?.usage||null
    };
  }
  const questions=(destinations.has('pdi_game')||destinations.has('vpc_test'))?rows(payload.questions,MAX_QUESTIONS):[];
  const oracleBlocks=destinations.has('oracle')?rows(payload.oracle_blocks,MAX_ORACLE_BLOCKS):[];
  const results=[];
  let rejected=0;
  for(const item of questions){
    try{
      const exposure=item.exposure==='public_social'?'public_social':'paid';
      if(exposure==='paid'&&!destinations.has('pdi_game')){
        rejected++;
        continue;
      }
      if(exposure==='public_social'&&!destinations.has('vpc_test')){
        rejected++;
        continue;
      }
      const screening=detectOperationalCommercialTopic({
        sourceKey:oceanContext.oceanKey,
        sourceTitle:oceanContext.displayName||oceanContext.title||oceanContext.label||'',
        sourceSummary:brainAlert.response_excerpt,
        sourceTerms:oceanContext.matchedTerms||[],
        candidateTitle:item.title||'',
        candidateBody:item.text||''
      });
      if(!screening.eligibleForQuestionOrOracle){
        rejected++;
        continue;
      }
      const result=await ingestVaultCandidate(env,{
        ...item,
        content_type:'question',
        source_ocean_id:oceanContext.oceanKey,
        theme:item.theme||fallbackTheme(oceanContext),
        exposure,
        product_fit:{
          ...(item.product_fit&&typeof item.product_fit==='object'?item.product_fit:{}),
          ...(exposure==='paid'?{para_de_ignorar:1}:{volta_para_casa:1})
        },
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
      const screening=detectOperationalCommercialTopic({
        sourceKey:oceanContext.oceanKey,
        sourceTitle:oceanContext.displayName||oceanContext.title||oceanContext.label||'',
        sourceSummary:brainAlert.response_excerpt,
        sourceTerms:oceanContext.matchedTerms||[],
        candidateTitle:item.title||'',
        candidateBody:item.text||''
      });
      if(!screening.eligibleForQuestionOrOracle){
        rejected++;
        continue;
      }
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
