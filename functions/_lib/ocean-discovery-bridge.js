export const OCEAN_DISCOVERY_BRIDGE={
  version:'2026-09-25',
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
  persistence:{
    authorization:'permanent_human_authorization_2026-09-25',
    canonicalStore:'.github/maison-growth/oceans/candidates.json',
    derivedStores:[
      '.github/maison-growth/brain/editorial-queue.json',
      'functions/_lib/vpc-ocean-signals.generated.js'
    ],
    duplicateRule:'Analyse the canonical Oceans before every write. A materially distinct human territory may be added; a semantically similar signal must enrich the existing canonical Ocean instead of creating a clone.',
    enrichmentRule:'For a similar signal, merge only new independent evidence, useful theme candidates and materially additive commercial adjacency; preserve firstSeenAt and human/editorial state, and advance lastSeenAt.',
    newOceanEvidenceMinimum:2,
    conflictRecovery:'On a stale-SHA/write conflict, refetch the canonical file, repeat duplicate analysis against the fresh state, reapply the merge/create operation, then retry. Never overwrite a concurrent human decision.',
    verification:'A write is successful only after candidates, editorial queue and generated signal bridge are read back and agree on the canonical Ocean set.',
    publicWrite:false,
    paidBodies:false,
    pii:false
  },
  discovery:{
    internal:'Scheduled enrichment may add or refine candidates every six hours when evidence justifies it. Similar discoveries deepen the canonical Ocean; they do not inflate Ocean counts.',
    google:'Only deliberate canonical public surfaces belong in public sitemaps.',
    bingAndIndexNowParticipants:'IndexNow submits public sitemap URLs only.',
    aiSearch:'Public canonical surfaces may be crawled; the internal Ocean candidate store is not a public-content surface.',
    userExperience:'Visitors never browse an Ocean catalogue. They encounter Farol, Volta Para Casa, Oráculo, products, services and other deliberate Maison surfaces.'
  }
};
