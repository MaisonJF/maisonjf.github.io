import { callZeroCostModel, configuredZeroCostModelSpecs } from './providers.js';

export const FEEDBACK_PERSONAS=[
  {id:'first_visit',label:'Visitante pela primeira vez',lens:'Nunca ouviste falar da MAISON JF. Diz, sem tentar agradar, o que percebeste que esta marca é, o que oferece e o que te deixou confuso.'},
  {id:'tarot_buyer',label:'Pessoa à procura de Tarot',lens:'Chegaste à procura de uma consulta de Tarot. Verifica clareza, preço, limites, confiança e se saberias o que fazer para marcar.'},
  {id:'skeptic',label:'Céptico',lens:'És céptico em relação a linguagem espiritual ou esotérica. Procura alegações exageradas, promessas, ambiguidade e razões concretas para confiar ou abandonar.'},
  {id:'emotionally_overloaded',label:'Pessoa emocionalmente sobrecarregada',lens:'Chegaste cansado e com pouca atenção. Avalia se percebes rapidamente para onde ir sem exigir esforço mental excessivo.'},
  {id:'gift_buyer',label:'Comprador de presente',lens:'Queres oferecer algo a outra pessoa. Avalia se percebes o que existe, para quem serve e qual seria o próximo passo.'},
  {id:'reader',label:'Leitor',lens:'Interessa-te sobretudo a vertente editorial. Avalia se encontras livros, se percebes o catálogo e se alguma coisa desperta curiosidade suficiente para continuar.'},
  {id:'professional',label:'Profissional ou parceiro B2B',lens:'Estás a avaliar a MAISON JF como potencial parceiro. Procura clareza, profissionalismo, limites, oferta e sinais que sustentem ou prejudiquem confiança.'},
  {id:'international',label:'Visitante internacional',lens:'Não assumes conhecimento de Portugal nem da marca. Procura barreiras de idioma, contexto, moeda, entrega, contacto e compreensão da oferta.'},
  {id:'mobile_impatient',label:'Visitante mobile impaciente',lens:'Imagina que estás num telemóvel e decides em poucos segundos se continuas. Avalia hierarquia, excesso de texto, CTA e informação essencial.'},
  {id:'conversion_critic',label:'Crítico de conversão',lens:'Não avalies beleza por si só. Procura fricção entre perceber, desejar, confiar e agir. Identifica exactamente onde uma pessoa pode desistir.'}
];

const PAGES=[
  ['home','https://maison-jf.com/'],
  ['volta_para_casa','https://maison-jf.com/teste/'],
  ['servicos','https://maison-jf.com/servicos/'],
  ['produtos','https://maison-jf.com/produtos/'],
  ['biblioteca','https://maison-jf.com/ebooks/']
];

function dayIndex(date){return Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000);}
function stripHtml(html){
  return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"')
    .replace(/\s+/g,' ').trim().slice(0,18000);
}
async function ensureSchema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_synthetic_feedback (
    feedback_id TEXT PRIMARY KEY, run_date TEXT NOT NULL, persona_id TEXT NOT NULL, persona_label TEXT NOT NULL,
    page_key TEXT NOT NULL, page_url TEXT NOT NULL, provider_id TEXT NOT NULL, model_id TEXT,
    opinion_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(run_date,persona_id,page_key)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_maison_feedback_date ON maison_synthetic_feedback(run_date,created_at)').run();
}
async function pageText(page){
  const response=await fetch(page[1],{headers:{'User-Agent':'MaisonJF-Internal-Feedback/1.0'}});
  if(!response.ok)throw new Error('feedback_page_http_'+response.status);
  return stripHtml(await response.text());
}
function promptFor(persona,page,text){
  return `És um participante independente num grupo de foco sintético interno da MAISON JF. A tua opinião NÃO será publicada como testemunho.
Não elogies por educação e não tentes adivinhar o que o fundador quer ouvir. Baseia tudo apenas no conteúdo recebido.
PERSONA: ${persona.label}. ${persona.lens}
PÁGINA: ${page[0]} — ${page[1]}
CONTEÚDO DA PÁGINA:
${text}

Escreve em português europeu. Produz uma opinião franca em primeira pessoa (120-250 palavras) e termina exactamente com:
CONTINUARIA: sim|talvez|não
COMPRARIA_OU_CONTACTARIA: sim|talvez|não
DÚVIDA_PRINCIPAL: <uma frase>
PROBLEMA_PRINCIPAL: <uma frase ou "nenhum">
EVIDÊNCIA: <trecho ou elemento concreto da página>
Não inventes cliques, páginas, preços ou experiências que não estejam no conteúdo.`;
}
export async function runFeedbackCouncil(env,{date=new Date(),reviews=2}={}){
  if(String(env.ZERO_COST_MODE||'').toLowerCase()!=='true')return {skipped:'zero_cost_mode_required'};
  const specs=configuredZeroCostModelSpecs(env);
  if(!specs.length)return {skipped:'no_zero_cost_model'};
  await ensureSchema(env.GROWTH_DB);
  const dateKey=date.toISOString().slice(0,10), base=dayIndex(date);
  const count=Math.max(1,Math.min(2,Number(reviews)||2)), stored=[];
  for(let i=0;i<count;i++){
    const persona=FEEDBACK_PERSONAS[(base*count+i)%FEEDBACK_PERSONAS.length];
    const page=PAGES[(base+i)%PAGES.length];
    const exists=await env.GROWTH_DB.prepare('SELECT feedback_id FROM maison_synthetic_feedback WHERE run_date=?1 AND persona_id=?2 AND page_key=?3').bind(dateKey,persona.id,page[0]).first();
    if(exists)continue;
    const text=await pageText(page);
    if(!text)continue;
    let result=null,lastError=null;
    for(const spec of specs){
      try{result=await callZeroCostModel(env,spec,promptFor(persona,page,text));break;}catch(error){lastError=error;}
    }
    if(!result){console.warn('MAISON_FEEDBACK_COUNCIL_NO_FREE_MODEL',lastError?.message||'unknown');continue;}
    const opinion=String(result.text||'').trim().slice(0,6000);
    if(!opinion)continue;
    const id='fb_'+crypto.randomUUID();
    await env.GROWTH_DB.prepare(`INSERT INTO maison_synthetic_feedback
      (feedback_id,run_date,persona_id,persona_label,page_key,page_url,provider_id,model_id,opinion_text)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(id,dateKey,persona.id,persona.label,page[0],page[1],result.providerId,result.modelId||null,opinion).run();
    stored.push({id,persona:persona.id,page:page[0],provider:result.providerId,model:result.modelId||null});
  }
  return {stored:stored.length,reviews:stored};
}
