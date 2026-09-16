export const OCEAN_DISCOVERY_BRIDGE={
  version:'2026-09-16',
  principle:'Every Ocean must flow into MAISON JF® through a deliberate public sink.',
  publicSinks:{
    pillars:'functions/_lib/seo-pillars-2026.js',
    answers:'/respostas/',
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
    requiredFields:['painLanguage','territory','intent','commercialAdjacency'],
    rule:'Attach to an existing public pillar/sink. If it represents a genuinely distinct search intent or a new territory, deliberately create/promote one canonical public page; never publish variants automatically.'
  },
  discovery:{
    google:'robots.txt + sitemap.xml/sitemap-maison.xml + crawlable public pillar links',
    bingAndIndexNowParticipants:'IndexNow workflow submits every public sitemap URL after main deploy',
    aiSearch:'OAI-SearchBot, PerplexityBot, Claude-SearchBot, Applebot and standard crawlers are allowed; llms.txt describes canonical structure',
    userExperience:'Respostas shows at most 8 items at a time on mobile-first search.'
  }
};
