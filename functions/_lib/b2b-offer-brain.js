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
  researchCandidates:[
    {
      id:'hospitality_guest_experience',
      status:'market_activity_evidenced_validation_required',
      segments:['alojamento'],
      hypothesis:'Validar pequenos pilotos de boas-vindas, assinatura sensorial, gifting ou continuidade para alojamento e hospitalidade usando rotas B2B já existentes.',
      evidence:[
        {
          source:'Turismo de Portugal · Overview 2025',
          published:'2026-03-05',
          url:'https://www.turismodeportugal.pt/en/Turismo_Portugal/visao_geral/Pages/default.aspx',
          observation:'Portugal registou 32,5 milhões de hóspedes e 82,1 milhões de dormidas em 2025.'
        },
        {
          source:'TravelBI · Short term accommodation 2025',
          published:'2026-08-27',
          url:'https://travelbi.turismodeportugal.pt/en/accommodation/short-term-accommodation-2025/',
          observation:'O alojamento local com mais de 10 camas registou 5,1 milhões de hóspedes e 12,1 milhões de dormidas em 2025.'
        }
      ],
      claimLimit:'Os dados provam actividade do sector, não procura específica por produtos ou serviços MAISON. Exige piloto, contacto humano e evidência de resposta antes de escalar.'
    },
    {
      id:'workplace_wellbeing_training',
      status:'problem_evidenced_buyer_demand_unverified',
      segments:['servico','organizacoes'],
      hypothesis:'Investigar workshops não-clínicos para equipas sobre pausa, comunicação, relações de trabalho e experiência humana, sem apresentar a MAISON como prestador de saúde mental.',
      evidence:[
        {
          source:'EU-OSHA · OSH Pulse 2025',
          published:'2025-10-10',
          url:'https://osha.europa.eu/en/highlights/world-mental-health-day-29-eu-workers-suffer-stress-depression-or-anxiety',
          observation:'29% dos trabalhadores da UE reportam stress, depressão ou ansiedade; mais de 40% reportam forte pressão temporal e quase 30% má comunicação ou cooperação.'
        },
        {
          source:'DGERT · Tipologias de formação profissional',
          url:'https://www.dgert.gov.pt/tipologias',
          observation:'A formação contínua inclui competências profissionais e relacionais; o Código do Trabalho prevê um mínimo anual de 40 horas por trabalhador.'
        }
      ],
      claimLimit:'A necessidade organizacional e o enquadramento de formação não provam procura pagante pela MAISON. Antes de vender, validar comprador, formato, competência, certificação aplicável e fronteira não-clínica.'
    }
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
    researchCandidates:(MAISON_B2B_BRAIN.researchCandidates||[]).map(x=>({
      ...x,
      segments:[...(x.segments||[])],
      evidence:(x.evidence||[]).map(e=>({...e}))
    })),
    routes:MAISON_B2B_BRAIN.routes.map(x=>({...x})),
    evidencePolicy:{...MAISON_B2B_BRAIN.evidencePolicy}
  };
}
