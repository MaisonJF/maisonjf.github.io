export const OCEANS_POLICY={
  version:'2026-09-29',
  growth:'unbounded',
  growthCadence:'adaptive-scheduled',
  defaultVisibility:'internal',
  defaultRobots:'noindex,nofollow',
  internalCandidateStore:'.github/maison-growth/oceans/candidates.json',
  publicPromotionSource:'functions/_lib/seo-pillars-2026.js',
  rules:[
    'New Oceans are internal by default.',
    'Internal Ocean candidates may be enriched on any authorized scheduled iteration when materially useful independent evidence, human language, moments, themes or commercial adjacency is found; never advance timestamps merely to prove activity.',
    'New Oceans must not enter a public sitemap automatically.',
    'New Oceans must not appear in public browse lists automatically.',
    'Respostas is not a public Ocean catalogue.',
    'An Ocean becomes public only by deliberate human-approved promotion into a canonical public surface.',
    'Internal Oceans may grow independently of the number of public pages or Oracle territories.',
    'Oceans feed Volta Para Casa routing, the Farol, Offer Brain, PÁRA DE IGNORAR! question candidates, Oráculo territory/reading candidates and future commercial offers without exposing the full knowledge base.',
    'No personal data, private conversation content, paid PÁRA DE IGNORAR! question body or paid Oracle reading body may be stored as an Ocean candidate.'
  ]
};

export function oceanVisibility({path='',pillarPaths=[]}={}){
  const isPublic=pillarPaths.includes(path);
  return isPublic
    ? {robots:'index,follow',sitemap:true,browse:'canonical-only'}
    : {robots:OCEANS_POLICY.defaultRobots,sitemap:false,browse:'hidden'};
}
