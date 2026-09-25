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
      id:'organizacao',
      label:'Equipa, organização, associação ou entidade',
      status:'pilot_surface',
      territories:['cabeca','presenca'],
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
    {id:'presentear',label:'Criar presentes para clientes, hóspedes, equipa, parceiros ou ocasiões',opportunityType:'gifting'},
    {id:'equipa',label:'Melhorar experiência, comunicação ou consistência da equipa',opportunityType:'team_workshop'},
    {id:'formacao',label:'Dar formação prática a equipas ou profissionais',opportunityType:'training_pilot'}
  ],
  offerFamilies:[
    {
      id:'curated_resale',
      label:'Revenda curada',
      status:'active_quote',
      segments:['loja','spa','terapeuta'],
      solutionType:'b2b',validationMode:'manual_b2b_pilot',
      routes:['/profissionais/produtos-para-revenda-em-loja','/profissionais/produtos-para-revenda-em-spa','/profissionais/velas-aromaticas-para-revenda'],
      recurrence:['reorder'],
      claimLimit:'Selecção, quantidades, preço e reposição são sempre confirmados numa proposta.'
    },
    {
      id:'hospitality_welcome',
      label:'Boas-vindas & hospitalidade',
      status:'active_quote',
      segments:['alojamento'],
      solutionType:'b2b',validationMode:'manual_b2b_pilot',
      routes:['/profissionais/produtos-de-boas-vindas-para-alojamento-local','/profissionais/como-criar-um-ritual-de-boas-vindas-para-clientes'],
      recurrence:['reorder','seasonal_project'],
      claimLimit:'Não pressupõe impacto em reviews, ocupação ou receita sem medição.'
    },
    {
      id:'sensory_signature',
      label:'Assinatura sensorial & experiência',
      status:'active_quote',
      segments:['spa','terapeuta','alojamento','servico'],
      solutionType:'b2b',validationMode:'manual_b2b_pilot',
      routes:['/profissionais/aromas-para-espacos-de-bem-estar','/profissionais/como-escolher-aromas-para-um-gabinete-de-massagem'],
      recurrence:['reorder','repeat_project'],
      claimLimit:'A proposta pode organizar aroma, ritual e detalhe de experiência; não promete resultados clínicos ou comerciais.'
    },
    {
      id:'gifting',
      label:'Presentes & gifting',
      status:'manual_proposal',
      segments:['loja','spa','terapeuta','alojamento','servico','organizacao','outro'],
      solutionType:'b2b',validationMode:'manual_b2b_pilot',
      routes:['/contacto/?interesse=b2b-presentes'],
      recurrence:['occasion','seasonal_project'],
      claimLimit:'Formato, personalização, quantidades, capacidade, prazo e preço são validados antes da proposta final.'
    },
    {
      id:'small_series',
      label:'Pequenas séries & projectos especiais',
      status:'manual_proposal',
      segments:['loja','spa','terapeuta','alojamento','servico','organizacao','outro'],
      solutionType:'b2b',validationMode:'manual_b2b_pilot',
      routes:['/contacto/?interesse=b2b'],
      recurrence:['repeat_project'],
      claimLimit:'Só avança após revisão de materiais, capacidade, custo, prazo e âmbito.'
    },
    {
      id:'team_workshop',
      label:'Workshop-piloto para equipas',
      status:'pilot_by_conversation',
      segments:['organizacao','servico'],
      solutionType:'service',validationMode:'manual_service_pilot',
      routes:['/contacto/?interesse=b2b-formacao'],
      recurrence:['repeat_workshop'],
      evidenceCandidate:'workplace_wellbeing_training',
      claimLimit:'Piloto não-clínico. Não é psicoterapia, intervenção de saúde mental, formação oficial ou promessa de melhoria de desempenho.'
    },
    {
      id:'professional_training',
      label:'Formação profissional MAISON',
      status:'research_validation',
      segments:['organizacao','terapeuta','servico'],
      solutionType:'service',validationMode:'manual_service_pilot',
      routes:[],recurrence:['cohort','renewal'],
      evidenceCandidate:'workplace_wellbeing_training',
      claimLimit:'Não comercializar como certificação oficial/DGERT nem como credencial MAISON activa antes de validação jurídica, curricular, de capacidade e de procura.'
    },
    {
      id:'professional_tools',
      label:'Ferramentas profissionais MAISON',
      status:'research_validation',
      segments:['organizacao','terapeuta','servico','spa','alojamento'],
      solutionType:'digital_product',validationMode:'manual_digital_validation',
      routes:[],recurrence:['version_update'],
      claimLimit:'Sem ferramenta pública ou gratuita adicional enquanto não existir problema e intenção de compra validados.'
    },
    {
      id:'professional_digital_products',
      label:'Produtos digitais profissionais',
      status:'research_validation',
      segments:['organizacao','terapeuta','servico','spa','alojamento'],
      solutionType:'digital_product',validationMode:'manual_digital_validation',
      routes:[],recurrence:['license_or_update'],
      claimLimit:'Não criar catálogo digital B2B por especulação; começar por uma dor profissional validada.'
    },
    {
      id:'licensed_professional_network',
      label:'Rede profissional licenciada',
      status:'future_validation',
      segments:['terapeuta','servico','organizacao'],
      solutionType:'b2b',validationMode:'manual_b2b_pilot',
      routes:[],recurrence:['license_renewal'],
      claimLimit:'Não é franquia activa, certificação oficial ou direito de sublicença.'
    }
  ],
  recurrence:{
    supportedNow:['reorder','repeat_project','occasion','seasonal_project'],
    pilotOnly:['repeat_workshop'],
    futureValidation:['cohort','renewal','license_or_update','license_renewal','version_update'],
    rule:'Recorrência nasce de comportamento observado. Não criar subscrição, fidelização ou licença periódica apenas para fabricar receita recorrente.'
  },
  leadContract:{
    canonicalEvent:'b2b.lead',
    canonicalSolutionType:'b2b',
    currentSurface:'/contacto/',
    observedIntentEvent:'contact_whatsapp_click',
    runtimeStatus:'b2b_context_ready_canonical_ingestion_owned_by_central_telemetry_or_commerce',
    allowedNonPii:['interest','origin','business','goal','gap','client','model','scale','start','result_type'],
    forbidden:['name','email','phone','free_text_message','health_data','client_identity'],
    rule:'O rio B2B define e produz contexto não identificável; a persistência canónica de b2b.lead deve reutilizar a telemetria/commerce central, não criar CRM ou pipeline paralelo.'
  },
  professionalNetwork:{
    status:'internal_model_validation_required',
    principle:'Ensinar pode ser distribuído; a chancela, o método e a autoridade de certificação permanecem MAISON.',
    credentialIssuer:'maison-jf',
    franchiseStatus:'not_yet',
    levels:[
      {
        id:'certified_professional',
        label:'Profissional Certificado MAISON',
        can:['aplicar_metodos_autorizados','usar_materiais_licenciados','identificar_se_como_profissional_certificado'],
        cannot:['formar_terceiros','emitir_certificacao_maison','sublicenciar_marca','alterar_metodo_como_se_fosse_maison']
      },
      {
        id:'certified_facilitator',
        label:'Facilitador Certificado MAISON',
        can:['aplicar_metodos_autorizados','facilitar_workshops_autorizados','usar_materiais_licenciados','identificar_se_como_facilitador_certificado'],
        cannot:['formar_novos_profissionais','emitir_certificacao_maison','sublicenciar_marca','criar_curriculo_maison_paralelo']
      },
      {
        id:'licensed_trainer',
        label:'Formador Licenciado MAISON',
        can:['ministrar_formacao_maison_autorizada','acompanhar_praticantes','usar_curriculo_e_materiais_licenciados'],
        cannot:['emitir_certificacao_final_em_nome_proprio','sublicenciar_marca','nomear_outros_formadores_sem_aprovacao_maison','alterar_criterios_de_certificacao']
      },
      {
        id:'territorial_partner',
        label:'Parceiro Territorial MAISON',
        status:'future_only_after_validation',
        can:['operar_modelo_local_aprovado','coordenar_rede_local_quando_contratualmente_autorizado'],
        cannot:['existir_sem_modelo_economico_validado','conceder_subfranquias_sem_contrato_especifico','apropriar_se_da_propriedade_intelectual_maison']
      }
    ],
    safeguards:{
      sublicensing:false,
      centralCertification:true,
      brandUseByWrittenLicence:true,
      curriculumControl:'maison',
      qualityReviewRequired:true,
      renewalRequired:true,
      clinicalClaimsForbidden:true,
      officialQualificationClaimsForbiddenUnlessLegallySupported:true
    },
    economicsHypotheses:[
      'formacao_inicial',
      'renovacao_licenca',
      'licenca_de_materiais',
      'taxa_por_turma_ou_certificacao',
      'kits_e_reposicao_de_produtos',
      'auditoria_ou_supervisao_de_qualidade'
    ],
    validationRule:'Não definir royalties, exclusividades territoriais, direito de sublicença ou fees de franquia antes de validar procura, margem, capacidade de suporte, qualidade e enquadramento jurídico.'
  },
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
  opportunityTypes:['welcome','continuity','ticket','signature','resale','pilot','gifting','proposal','team_workshop','training_pilot'],
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
    offerFamilies:(MAISON_B2B_BRAIN.offerFamilies||[]).map(x=>({
      ...x,
      segments:[...(x.segments||[])],routes:[...(x.routes||[])],recurrence:[...(x.recurrence||[])]
    })),
    recurrence:{
      ...MAISON_B2B_BRAIN.recurrence,
      supportedNow:[...(MAISON_B2B_BRAIN.recurrence?.supportedNow||[])],
      pilotOnly:[...(MAISON_B2B_BRAIN.recurrence?.pilotOnly||[])],
      futureValidation:[...(MAISON_B2B_BRAIN.recurrence?.futureValidation||[])]
    },
    leadContract:{
      ...MAISON_B2B_BRAIN.leadContract,
      allowedNonPii:[...(MAISON_B2B_BRAIN.leadContract?.allowedNonPii||[])],
      forbidden:[...(MAISON_B2B_BRAIN.leadContract?.forbidden||[])]
    },
    professionalNetwork:{
      ...MAISON_B2B_BRAIN.professionalNetwork,
      levels:(MAISON_B2B_BRAIN.professionalNetwork?.levels||[]).map(level=>({
        ...level,
        can:[...(level.can||[])],
        cannot:[...(level.cannot||[])]
      })),
      safeguards:{...(MAISON_B2B_BRAIN.professionalNetwork?.safeguards||{})},
      economicsHypotheses:[...(MAISON_B2B_BRAIN.professionalNetwork?.economicsHypotheses||[])]
    },
    researchCandidates:(MAISON_B2B_BRAIN.researchCandidates||[]).map(x=>({
      ...x,
      segments:[...(x.segments||[])],
      evidence:(x.evidence||[]).map(e=>({...e}))
    })),
    routes:MAISON_B2B_BRAIN.routes.map(x=>({...x})),
    evidencePolicy:{...MAISON_B2B_BRAIN.evidencePolicy}
  };
}
