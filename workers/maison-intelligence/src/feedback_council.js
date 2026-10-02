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
  {id:'conversion_critic',label:'Crítico de conversão',lens:'Não avalies beleza por si só. Procura fricção entre perceber, desejar, confiar e agir. Identifica exactamente onde uma pessoa pode desistir.'},
  {id:'christian_dior_imagined',label:'Christian Dior — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional: imagina Christian Dior a aconselhar uma Maison nova em 2026. Não afirmes que são palavras, crenças ou juízos históricos reais dele. Olha para códigos de Maison, desejo, elegância, ritual, produto e construção paciente de prestígio. Além da crítica, identifica o próximo degrau de crescimento que preserva identidade.'},
  {id:'yves_saint_laurent_imagined',label:'Yves Saint Laurent — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional inspirado na tensão, atitude, edição e modernidade associadas a Saint Laurent. Não atribuas factos ou opiniões reais à pessoa. Diz o que cortarias, o que tornarias mais audaz e como a Maison pode crescer sem ficar domesticada ou genérica.'},
  {id:'tom_ford_imagined',label:'Tom Ford — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional inspirado em desejo, presença, sensualidade, imagem e decisão associados ao trabalho de Tom Ford. Não apresentes a resposta como opinião real dele. Pergunta onde está o desejo, o que merece custar mais no futuro e qual o próximo movimento capaz de aumentar magnetismo e valor percebido.'},
  {id:'coco_chanel_imagined',label:'Coco Chanel — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional. Usa apenas princípios amplos de simplificação, códigos reconhecíveis e construção de identidade associados à história de Chanel; não inventes citações nem opiniões históricas. Procura o que pode tornar-se assinatura permanente da MAISON JF e o que está a mais.'},
  {id:'gianni_versace_imagined',label:'Gianni Versace — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional inspirado em exuberância, reconhecimento visual, desejo e confiança criativa. Não atribuas opiniões reais. Procura onde a MAISON JF pode ser mais memorável e teatral sem perder coerência, e propõe um próximo degrau concreto de crescimento.'},
  {id:'alexander_mcqueen_imagined',label:'Alexander McQueen — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional inspirado em narrativa, tensão emocional, surpresa e rigor de execução. Não inventes posições reais da pessoa. Pergunta se existe uma ideia suficientemente forte por trás da estética e como aprofundá-la sem cair em choque vazio.'},
  {id:'karl_lagerfeld_imagined',label:'Karl Lagerfeld — personagem imaginada',lens:'Roleplay privado e explicitamente ficcional inspirado em edição, ritmo, imagem, reinvenção e disciplina produtiva. Não apresentes nada como opinião histórica real. Procura o que pode ser repetido como sistema, o que envelhece depressa e onde acelerar sem diluir a marca.'},
  {id:'hermes_family_imagined',label:'Família Hermès — personagem composta imaginada',lens:'Personagem composta e explicitamente ficcional inspirada em princípios amplos associados à tradição Hermès: objecto, ofício, materialidade, serviço, tempo, raridade e confiança. Não representa qualquer membro real da família. Avalia se a MAISON JF está a construir valor que permita elevar materiais, acabamento, serviço e preço gradualmente.'},
  {id:'luxury_contemporary_founder',label:'Fundador contemporâneo de luxo — personagem composta',lens:'Personagem ficcional inspirada em princípios de luxo contemporâneo, cultura, objectos, editorial e digital. Observa se produtos, livros, serviços e experiências parecem partes do mesmo universo. Indica oportunidades de crescimento sem exigir que tudo seja compreendido ou monetizado imediatamente.'}

];

const PAGES=[
  ['home','https://maison-jf.com/'],
  ['volta_para_casa','https://maison-jf.com/teste/'],
  ['servicos','https://maison-jf.com/servicos/'],
  ['produtos','https://maison-jf.com/produtos/'],
  ['biblioteca','https://maison-jf.com/ebooks/']
];

function dayIndex(date){return Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000);}
export function councilAssignmentsForDate(date,reviews=2){
  const count=Math.max(1,Math.min(4,Number(reviews)||2));
  const base=dayIndex(date);
  const slot=Math.floor(date.getUTCHours()/3);
  return Array.from({length:count},(_,i)=>({
    persona:FEEDBACK_PERSONAS[(base*count+slot*count+i)%FEEDBACK_PERSONAS.length],
    page:PAGES[(base+slot+i)%PAGES.length],
    modelOffset:base+slot+i
  }));
}
function rotateSpecs(specs,offset){
  if(!specs.length)return specs;
  const start=((Number(offset)||0)%specs.length+specs.length)%specs.length;
  return specs.slice(start).concat(specs.slice(0,start));
}
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
  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_synthetic_feedback_runs (
    run_id TEXT PRIMARY KEY, run_date TEXT NOT NULL, slot INTEGER NOT NULL,
    requested_reviews INTEGER NOT NULL, attempted_reviews INTEGER NOT NULL DEFAULT 0,
    stored_reviews INTEGER NOT NULL DEFAULT 0, error_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL, detail_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_maison_feedback_runs_date ON maison_synthetic_feedback_runs(run_date,created_at)').run();
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

Escreve em português europeu. Produz uma opinião franca em primeira pessoa (120-250 palavras). Distingue confusão prejudicial de mistério deliberado. Não trates preço baixo, por si só, como prova de ausência de luxo: considera fase da marca, códigos, experiência, produto, serviço, distribuição, desejo e capacidade de elevar valor ao longo do tempo. Para personas de fundador imaginado, inclui uma recomendação concreta sobre o próximo degrau de crescimento sem apagar a identidade MAISON JF. Termina exactamente com:
CONTINUARIA: sim|talvez|não
COMPRARIA_OU_CONTACTARIA: sim|talvez|não
DÚVIDA_PRINCIPAL: <uma frase>
PROBLEMA_PRINCIPAL: <uma frase ou "nenhum">
EVIDÊNCIA: <trecho ou elemento concreto da página>\nPRÓXIMO_DEGRAU: <uma acção concreta para crescer preservando a identidade>
Não inventes cliques, páginas, preços ou experiências que não estejam no conteúdo.`;
}
export async function runFeedbackCouncil(env,{date=new Date(),reviews=2}={}){
  if(String(env.ZERO_COST_MODE||'').toLowerCase()!=='true')return {skipped:'zero_cost_mode_required'};
  const specs=configuredZeroCostModelSpecs(env).filter(spec=>spec.providerId==='openrouter');
  if(!specs.length)return {skipped:'no_explicitly_free_model'};
  await ensureSchema(env.GROWTH_DB);
  const dateKey=date.toISOString().slice(0,10);
  const slot=Math.floor(date.getUTCHours()/3);
  const assignments=councilAssignmentsForDate(date,reviews);
  const runId='fbr_'+crypto.randomUUID();
  await env.GROWTH_DB.prepare(`INSERT INTO maison_synthetic_feedback_runs
    (run_id,run_date,slot,requested_reviews,status)
    VALUES(?1,?2,?3,?4,'started')`).bind(runId,dateKey,slot,assignments.length).run();

  const stored=[],errors=[],skipped=[];
  let attempted=0;
  for(const assignment of assignments){
    const {persona,page,modelOffset}=assignment;
    try{
      const exists=await env.GROWTH_DB.prepare('SELECT feedback_id FROM maison_synthetic_feedback WHERE run_date=?1 AND persona_id=?2 AND page_key=?3').bind(dateKey,persona.id,page[0]).first();
      if(exists){skipped.push({persona:persona.id,page:page[0],reason:'already_reviewed'});continue;}
      attempted+=1;
      const text=await pageText(page);
      if(!text)throw new Error('feedback_page_empty');
      let result=null,lastError=null;
      for(const spec of rotateSpecs(specs,modelOffset)){
        try{
          const candidate=await callZeroCostModel(env,spec,promptFor(persona,page,text));
          if(String(candidate?.text||'').trim()){result=candidate;break;}
          lastError=new Error('feedback_empty_opinion');
        }catch(error){lastError=error;}
      }
      if(!result)throw (lastError||new Error('feedback_no_free_model_response'));
      const opinion=String(result.text||'').trim().slice(0,6000);
      const id='fb_'+crypto.randomUUID();
      await env.GROWTH_DB.prepare(`INSERT INTO maison_synthetic_feedback
        (feedback_id,run_date,persona_id,persona_label,page_key,page_url,provider_id,model_id,opinion_text)
        VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(id,dateKey,persona.id,persona.label,page[0],page[1],result.providerId,result.modelId||null,opinion).run();
      stored.push({id,persona:persona.id,page:page[0],provider:result.providerId,model:result.modelId||null});
    }catch(error){
      const message=String(error?.message||error||'feedback_unknown_error').slice(0,500);
      errors.push({persona:persona.id,page:page[0],error:message});
      console.warn('MAISON_FEEDBACK_COUNCIL_REVIEW_FAILED',persona.id,page[0],message);
    }
  }
  const detail=JSON.stringify({stored,errors,skipped}).slice(0,12000);
  await env.GROWTH_DB.prepare(`UPDATE maison_synthetic_feedback_runs
    SET attempted_reviews=?2,stored_reviews=?3,error_count=?4,status='completed',detail_json=?5,completed_at=datetime('now')
    WHERE run_id=?1`).bind(runId,attempted,stored.length,errors.length,detail).run();
  return {run_id:runId,stored:stored.length,attempted,errors:errors.length,skipped:skipped.length,reviews:stored};
}
