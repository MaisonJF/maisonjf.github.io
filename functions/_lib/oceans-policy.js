export const OCEANS_POLICY={
  version:'2026-09-16',
  growth:'unbounded',
  defaultVisibility:'internal',
  defaultRobots:'noindex,nofollow',
  publicPromotionSource:'functions/_lib/seo-pillars-2026.js',
  publicHub:'/respostas/',
  publicHubMaxVisible:8,
  rules:[
    'New Oceans are internal by default.',
    'New Oceans must not enter a public sitemap automatically.',
    'New Oceans must not appear in public browse lists automatically.',
    'An Ocean becomes public only by deliberate promotion into the SEO pillar registry.',
    'Public pillar count may grow when new territories are deliberately created; the hub still shows at most eight items at once.',
    'Internal Oceans may grow independently of the number of public pillars.',
    'Oceans feeds Test routing, Offer Brain, Oráculo territory design and future commercial offers without exposing the full knowledge base.'
  ]
};

export function oceanVisibility({path='',pillarPaths=[]}={}){
  const isPublic=pillarPaths.includes(path);
  return isPublic
    ? {robots:'index,follow',sitemap:true,browse:'search-only'}
    : {robots:OCEANS_POLICY.defaultRobots,sitemap:false,browse:'hidden'};
}
