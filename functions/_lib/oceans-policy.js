export const OCEANS_POLICY={
  version:'2026-09-18',
  growth:'unbounded',
  growthCadence:'PT6H',
  defaultVisibility:'internal',
  defaultRobots:'noindex,nofollow',
  internalCandidateStore:'.github/maison-growth/oceans/candidates.json',
  publicPromotionSource:'functions/_lib/seo-pillars-2026.js',
  rules:[
    'New Oceans are internal by default.',
    'Internal Ocean candidates may be enriched every six hours, but only when a genuinely distinct pain, intent or commercial adjacency is evidenced.',
    'New Oceans must not enter a public sitemap automatically.',
    'New Oceans must not appear in public browse lists automatically.',
    'Respostas is not a public Ocean catalogue.',
    'An Ocean becomes public only by deliberate human-approved promotion into a canonical public surface.',
    'Internal Oceans may grow independently of the number of public pages or Oracle territories.',
    'Oceans feed Volta Para Casa routing, the Farol, Offer Brain, Oráculo territory design and future commercial offers without exposing the full knowledge base.',
    'No personal data, private conversation content or paid Oracle reading body may be stored as an Ocean candidate.'
  ]
};

export function oceanVisibility({path='',pillarPaths=[]}={}){
  const isPublic=pillarPaths.includes(path);
  return isPublic
    ? {robots:'index,follow',sitemap:true,browse:'canonical-only'}
    : {robots:OCEANS_POLICY.defaultRobots,sitemap:false,browse:'hidden'};
}
