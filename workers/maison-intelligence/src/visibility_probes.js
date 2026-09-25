import {domainOf} from './core.js';

const GROUNDED_PROVIDERS=new Set(['openai','google_gemini','perplexity']);

export const VISIBILITY_PROBES=Object.freeze([
  {
    id:'brand_identity',
    kind:'branded_representation',
    query:'O que é a MAISON JF em Portugal? O que oferece actualmente?',
    requiresGrounded:false
  },
  {
    id:'tarot_portugal',
    kind:'nonbranded_discovery',
    query:'Onde posso fazer uma consulta de tarot online em Portugal?',
    requiresGrounded:true
  },
  {
    id:'spa_resale',
    kind:'nonbranded_discovery',
    query:'Que marcas portuguesas têm produtos para revenda em spa ou gabinete de bem-estar?',
    requiresGrounded:true
  },
  {
    id:'massage_oil_portugal',
    kind:'nonbranded_discovery',
    query:'Onde comprar óleo de massagem artesanal em Portugal?',
    requiresGrounded:true
  },
  {
    id:'oracle_symbolic',
    kind:'nonbranded_discovery',
    query:'Existe em Portugal algum oráculo online de leitura simbólica que não prometa prever o futuro?',
    requiresGrounded:true
  },
  {
    id:'ebook_title',
    kind:'branded_content',
    query:'O que é o livro "Vírgulas do Destino: O Turista"?',
    requiresGrounded:false
  }
]);

export function providerCanRunProbe(providerId,probe){
  return !probe.requiresGrounded||GROUNDED_PROVIDERS.has(providerId);
}

export function probesForDate(date=new Date(),count=2){
  const day=Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000);
  const out=[];
  for(let i=0;i<Math.min(count,VISIBILITY_PROBES.length);i++){
    out.push(VISIBILITY_PROBES[(day+i*2)%VISIBILITY_PROBES.length]);
  }
  if(!out.some(p=>p.id==='brand_identity'))out[0]=VISIBILITY_PROBES[0];
  return out;
}

export function buildVisibilityProbePrompt(probe){
  return [
    'You are a search-visibility measurement sensor for MAISON JF.',
    'Answer the following user query naturally. If your system supports web search, use fresh web results and cite the URLs you actually relied on.',
    `User query: ${probe.query}`,
    'Do not force MAISON JF into the answer. Its absence is valid evidence.',
    'If MAISON JF appears, describe only what the sources support. Do not invent prices, services, credentials, medical claims or supernatural guarantees.',
    'At the end add exactly one short line: MAISON_VISIBILITY: mentioned=yes|no; represented_correctly=yes|no|unknown',
    'This is observation only. Do not recommend SEO actions or publish anything.'
  ].join('\n');
}

export function decorateVisibilityResult(result,probe){
  const text=String(result?.text||'');
  const citations=Array.isArray(result?.citations)?result.citations:[];
  const maisonMentioned=/\bMAISON\s+JF\b/i.test(text);
  const maisonCited=citations.some(url=>{
    try{return domainOf(url)==='maison-jf.com'}catch{return false}
  });
  return {
    ...result,
    text:JSON.stringify({
      schema:'maison.ai-visibility-probe.v1',
      probe_id:probe.id,
      probe_kind:probe.kind,
      query:probe.query,
      maison_mentioned:maisonMentioned,
      maison_cited:maisonCited,
      response:text
    }),
    evidenceKind:'coverage',
    evidenceSource:'system',
    sourceKind:'ai_visibility_probe',
    strength:citations.length?70:35
  };
}
