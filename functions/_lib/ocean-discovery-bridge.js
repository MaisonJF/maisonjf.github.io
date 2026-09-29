export const OCEAN_DISCOVERY_BRIDGE={
  version:'2026-09-29',
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
    liveStore:'D1:ocean_memory_signals/ocean_memory_state/ocean_memory_alerts',
    liveRoute:'/internal/oceans/ingest',
    memoryRoute:'/internal/oceans/memory',
    alertRoute:'/internal/oceans/alerts',
    repositorySnapshot:'.github/maison-growth/oceans/candidates.json',
    derivedStores:[
      '.github/maison-growth/brain/editorial-queue.json',
      'functions/_lib/vpc-ocean-signals.generated.js'
    ],
    entryRule:'Persist privacy-safe signals immediately. One independent source is enough to remember a signal; filtering, semantic merging and confidence gates happen downstream.',
    duplicateRule:'Payload hashes prevent duplicate signal rows. Semantic duplicate analysis happens after persistence, before a provisional hypothesis can become a canonical Ocean.',
    enrichmentRule:'Signals may enrich an existing Ocean automatically. Preserve human/editorial state; stronger evidence increases confidence instead of blocking intake.',
    newOceanEvidenceMinimumToStore:1,
    newOceanEvidenceMinimumToPromote:2,
    promotionRule:'A provisional Ocean requires downstream evidence and review gates before canonical promotion. Public publication remains separately gated.',
    snapshotRule:'GitHub is an asynchronous snapshot/audit sink. The permanently authorized Oceans Radar and Commercial Brain actor may update only the approved internal snapshot files directly; a Git failure must never block D1 persistence, Brain visibility, alerts or future iterations.',
    conflictRecovery:'On SHA conflict, refresh once and retry the same direct write once when still authorized. Never create an approval fallback, and never roll back live D1 memory because a snapshot failed.',
    verification:'Live persistence is successful when D1 readback succeeds. Repository/derived agreement is a later snapshot-health concern, not an ingestion precondition.',
    publicWrite:false,
    paidBodies:false,
    pii:false
  },
  discovery:{
    internal:'Scheduled enrichment writes privacy-safe signals into D1 as soon as they are observed. Similar discoveries deepen state downstream; GitHub snapshots are secondary and may lag without blocking the Brain.',
    google:'Only deliberate canonical public surfaces belong in public sitemaps.',
    bingAndIndexNowParticipants:'IndexNow submits public sitemap URLs only.',
    aiSearch:'Public canonical surfaces may be crawled; the internal Ocean candidate store is not a public-content surface.',
    userExperience:'Visitors never browse an Ocean catalogue. They encounter Farol, Volta Para Casa, Oráculo, products, services and other deliberate Maison surfaces.'
  }
};
