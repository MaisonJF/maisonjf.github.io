export const OCEAN_DISCOVERY_BRIDGE={
  version:'2026-09-18',
  principle:'Oceans enrich the Maison internally; only deliberate canonical surfaces become public.',
  publicSinks:{
    pillars:'functions/_lib/seo-pillars-2026.js',
    farol:'/farol',
    voltaParaCasa:'/teste/',
    gifts:'/presentes/',
    products:'/produtos/',
    services:'/servicos/',
    oracle:'/oraculo/',
    company:'/portas/companhia',
    professionals:'/profissionais/'
  },
  futureOcean:{
    default:'internal',
    robots:'noindex,nofollow',
    sitemap:false,
    requiredFields:['painLanguage','territory','intent','commercialAdjacency','evidence'],
    rule:'Keep the candidate internal. If it later represents a genuinely distinct search intent, Oracle territory or commercial opportunity, propose one deliberate canonical surface for human approval; never publish variants automatically.'
  },
  discovery:{
    internal:'Scheduled enrichment may add or refine candidates every six hours when evidence justifies it.',
    google:'Only deliberate canonical public surfaces belong in public sitemaps.',
    bingAndIndexNowParticipants:'IndexNow submits public sitemap URLs only.',
    aiSearch:'Public canonical surfaces may be crawled; the internal Ocean candidate store is not a public-content surface.',
    userExperience:'Visitors never browse an Ocean catalogue. They encounter Farol, Volta Para Casa, Oráculo, products, services and other deliberate Maison surfaces.'
  }
};
