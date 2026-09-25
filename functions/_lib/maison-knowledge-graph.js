import {MAISON_B2B_BRAIN,maisonB2bKnowledgeContext} from './b2b-offer-brain.js';

/*
MAISON JF® knowledge graph
Machine-facing semantic map. Human-facing prose stays in João voice.
This file describes relationships. It must never invent claims that are not supported by public MAISON content.
*/

export const MAISON_KNOWLEDGE_GRAPH={
  version:'2026-09-25-v2',
  principle:'Humano vê João. Máquina vê estrutura. Brain compreende os dois. MAISON transforma isso em desejo, utilidade e negócio.',
  brand:{id:'maison-jf',name:'MAISON JF®',url:'https://maison-jf.com/'},
  territories:[
    {
      id:'casa',label:'Casa',url:'/portas/casa',
      humanSituations:['chegar a casa sem sentir que o dia acabou','querer mudar o ambiente com um gesto simples','procurar conforto e ritual no quotidiano'],
      intents:['discover','recognise','shop'],
      relatedOffers:['nevoa','vela-pequena','presentes-intencao'],
      relatedTerritories:['corpo','presenca']
    },
    {
      id:'corpo',label:'Corpo',url:'/portas/corpo',
      humanSituations:['precisar de parar antes de conseguir explicar','querer devolver tempo e cuidado ao corpo','procurar uma experiência sensorial simples'],
      intents:['discover','recognise','shop'],
      relatedOffers:['escalda-pes','oleo-massagem'],
      relatedTerritories:['casa','presenca','cabeca']
    },
    {
      id:'cabeca',label:'Cabeça',url:'/portas/cabeca',
      humanSituations:['andar às voltas com uma decisão','querer ver uma situação de outra maneira','precisar de perguntas antes de escolher o próximo passo'],
      intents:['discover','reflect','seek_service'],
      relatedOffers:['tarot','oracle-control','oracle-direction','mentoria'],
      relatedTerritories:['presenca','corpo']
    },
    {
      id:'presenca',label:'Presença',url:'/portas/companhia',
      humanSituations:['não querer atravessar uma situação sozinho','procurar companhia ou conversa','precisar de presença enquanto alguma coisa ainda está a acontecer'],
      intents:['discover','seek_service','connect'],
      relatedOffers:['presenca','pdi-relacoes','oracle-belong','oracle-attachment'],
      relatedTerritories:['cabeca','corpo','casa']
    }
  ],
  surfaces:[
    {id:'farol',url:'/farol',role:'routing',connects:['casa','corpo','cabeca','presenca']},
    {id:'oracle',url:'/oraculo/',role:'symbolic_reflection',connects:['cabeca','presenca']},
    {id:'products',url:'/produtos/',role:'commerce',connects:['casa','corpo','presenca']},
    {id:'services',url:'/servicos/',role:'commerce',connects:['cabeca','presenca']},
    {id:'editions',url:'/ebooks/',role:'editorial_commerce',connects:['cabeca','presenca']},
    {id:'free_tests',url:'/teste/',role:'recognition_and_routing',connects:['cabeca','presenca','corpo','casa']},
    {id:'pdi',url:'/para-de-ignorar/',role:'conversation_product',connects:['presenca']},
    {id:MAISON_B2B_BRAIN.surface.id,url:MAISON_B2B_BRAIN.surface.url,role:MAISON_B2B_BRAIN.surface.role,connects:['casa','corpo']}
  ],
  professionalLayer:maisonB2bKnowledgeContext(),
  intelligenceLayer:{
    sensors:['public_web','osiris','openrouter','cloudflare_workers_ai','openai','google_gemini','perplexity','anthropic','authorized_future_providers'],
    flow:['sensors','radar','oceans','brain','maison_outputs','human_and_machine_response','learning','oceans'],
    rules:[
      'Providers supply signals or transformations. They do not own MAISON voice.',
      'OpenRouter is a gateway, not the Brain.',
      'OSIRIS is a sensor and intelligence family, not the public voice.',
      'Oceans can expand the graph internally without automatically creating public pages.',
      'Public semantic relationships must remain consistent with visible public content.'
    ]
  }
};

export function maisonTerritory(id){
  return MAISON_KNOWLEDGE_GRAPH.territories.find(x=>x.id===String(id||''))||null;
}

export function maisonRelatedTerritories(id){
  const territory=maisonTerritory(id);
  return territory ? territory.relatedTerritories.map(maisonTerritory).filter(Boolean) : [];
}

export function maisonMachineContext(id){
  const territory=maisonTerritory(id);
  if(!territory)return null;
  return {
    entity:territory.id,
    label:territory.label,
    canonicalPath:territory.url,
    humanSituations:territory.humanSituations,
    intents:territory.intents,
    relatedOffers:territory.relatedOffers,
    relatedTerritories:territory.relatedTerritories,
    principle:MAISON_KNOWLEDGE_GRAPH.principle
  };
}
