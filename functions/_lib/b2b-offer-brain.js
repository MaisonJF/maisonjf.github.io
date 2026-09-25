export const MAISON_B2B_BRAIN={
  version:'2026-09-25',
  test:'/profissionais/teste/',
  visibility:'professional-area-only',
  maxOffers:3,
  surface:{
    id:'professionals',
    label:'Profissionais & B2B',
    url:'/profissionais/',
    role:'b2b_recognition_and_routing'
  },
  serviceAssetRef:'catalog:service:b2b',
  dimensions:['business','goal','gap','client','model','scale','start','confession'],
  segments:[
    {
      id:'loja',
      label:'Loja ou espaço de retalho',
      status:'public_validated',
      territories:['casa'],
      routes:[
        '/profissionais/produtos-para-revenda-em-loja',
        '/profissionais/velas-aromaticas-para-revenda'
      ]
    },
    {
      id:'spa',
      label:'Spa, centro de estética ou espaço de bem-estar',
      status:'public_validated',
      territories:['corpo','casa'],
      routes:[
        '/profissionais/produtos-para-revenda-em-spa',
        '/profissionais/aromas-para-espacos-de-bem-estar'
      ]
    },
    {
      id:'terapeuta',
      label:'Massagista, terapeuta ou gabinete individual',
      status:'public_validated',
      territories:['corpo'],
      routes:[
        '/profissionais/produtos-para-revenda-em-spa',
        '/profissionais/como-escolher-produtos-para-um-spa-ou-gabinete'
      ]
    },
    {
      id:'alojamento',
      label:'Alojamento local, hotel ou espaço de hospitalidade',
      status:'public_validated',
      territories:['casa'],
      routes:[
        '/profissionais/produtos-de-boas-vindas-para-alojamento-local',
        '/profissionais/como-criar-um-ritual-de-boas-vindas-para-clientes'
      ]
    },
    {
      id:'servico',
      label:'Outro negócio de serviços com clientes presenciais',
      status:'public_validated',
      territories:[],
      routes:['/profissionais/']
    },
    {
      id:'outro',
      label:'Outro tipo de negócio ou projecto',
      status:'public_validated',
      territories:[],
      routes:['/profissionais/']
    }
  ],
  needs:[
    {id:'ticket',label:'Aumentar valor médio por cliente',opportunityType:'ticket'},
    {id:'recompra',label:'Criar razões coerentes para recompra',opportunityType:'resale'},
    {id:'diferenciar',label:'Tornar a experiência mais memorável',opportunityType:'signature'},
    {id:'continuar',label:'Prolongar a experiência depois da visita',opportunityType:'continuity'},
    {id:'boasvindas',label:'Melhorar chegada, oferta ou detalhe de boas-vindas',opportunityType:'welcome'},
    {id:'testar',label:'Testar uma nova linha sem começar demasiado grande',opportunityType:'pilot'},
    {id:'presentear',label:'Criar presentes para clientes, hóspedes, equipa, parceiros ou ocasiões',opportunityType:'gifting'}
  ],
  opportunityTypes:['welcome','continuity','ticket','signature','resale','pilot','gifting','proposal'],
  routes:[
    {id:'diagnostic',href:'/profissionais/teste/',role:'recognition'},
    {id:'direct_contact',href:'/contacto/?interesse=b2b',role:'lead'},
    {id:'professional_home',href:'/profissionais/',role:'discovery'}
  ],
  evidencePolicy:{
    publicValidated:'A entrada existe hoje na área pública Profissionais ou no diagnóstico profissional.',
    marketEvidenced:'Uma oportunidade nova só pode ser tratada como procura de mercado depois de evidência externa actual e verificável.',
    researchCandidate:'Sinais promissores podem entrar como candidatos de investigação, nunca como procura provada.',
    noSyntheticDemand:'Nunca transformar possibilidade estratégica, tendência genérica ou intuição interna em procura declarada.'
  },
  principles:{
    optional:'O diagnóstico é sempre opcional; acesso directo ao contacto B2B continua disponível.',
    commercial:'Procura oportunidades de ticket médio, recompra, continuidade, diferenciação, experiência e gifting.',
    realistic:'Não promete aumento de vendas, margem ou retorno sem dados.',
    inventory:'Não recomenda stock grande sem conhecer procura, capacidade e condições.',
    noDarkPatterns:'Não inventar perdas, urgência, escassez ou resultados para pressionar o profissional.'
  }
};

export function maisonB2bSegment(id){
  return MAISON_B2B_BRAIN.segments.find(x=>x.id===String(id||''))||null;
}

export function maisonB2bNeed(id){
  return MAISON_B2B_BRAIN.needs.find(x=>x.id===String(id||''))||null;
}

export function maisonB2bKnowledgeContext(){
  return {
    surface:MAISON_B2B_BRAIN.surface,
    serviceAssetRef:MAISON_B2B_BRAIN.serviceAssetRef,
    dimensions:[...MAISON_B2B_BRAIN.dimensions],
    opportunityTypes:[...MAISON_B2B_BRAIN.opportunityTypes],
    segments:MAISON_B2B_BRAIN.segments.map(x=>({
      id:x.id,label:x.label,status:x.status,territories:[...x.territories],routes:[...x.routes]
    })),
    needs:MAISON_B2B_BRAIN.needs.map(x=>({...x})),
    routes:MAISON_B2B_BRAIN.routes.map(x=>({...x})),
    evidencePolicy:{...MAISON_B2B_BRAIN.evidencePolicy}
  };
}
