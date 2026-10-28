const OPERATIONAL_TOPIC_PATTERNS = [
  ['ecommerce_operations', /\b(e\s?commerce|customer journey|mobile commerce|checkout|shopping cart|cart abandonment|product page|product listing|product catalogue|site navigation|conversion rate|conversion optimisation|conversion optimization|sales funnel|acquisition funnel|customer acquisition|cart conversion|online sales|ecommerce sales)\b/],
  ['seo_and_growth', /\b(seo|search engine optimization|search engine optimisation|organic traffic|paid traffic|paid media|ad campaign|campaign performance|marketing strategy|growth strategy|brand positioning|brand awareness|email marketing|a\/b test|ab test|analytics dashboard)\b/],
  ['commercial_operations', /\b(supplier|suppliers|fornecedor|fornecedores|inventory|stock management|shipping|fulfilment|fulfillment|logistics|logistica|pricing strategy|price testing|price optimisation|price optimization|pricing|profit margin|sales margin|revenue target|cost of acquisition|customer retention metric|payment integration|payment methods|b2b sales|retail operations|store operations)\b/],
  ['technical_operations', /\b(api|webhook|stripe integration|cloudflare|github|pull request|deployment|deploy pipeline|ci\/cd|technical audit|site performance|website performance|website speed|web performance|technical debt|codebase|runtime error|build failure|software integration|mobile ux audit|mobile commerce)\b/],
  ['ecommerce_strategy', /\b(customer journey|purchase funnel|conversion funnel|cart abandonment|product catalogue|product detail page|customer acquisition cost|average order value|checkout friction|catalogue architecture|merchandising strategy|commercial conversion|conversion optimisation|conversion optimization)\b/]
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\\/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects business/technical topics that must not be converted into a game
 * question or an Oracle statement. This is an exclusion gate, not a claim that
 * all other topics are suitable: positive editorial fit still needs explicit
 * classification and human approval.
 */
export function detectOperationalCommercialTopic({
  sourceKey = '',
  sourceTitle = '',
  sourceSummary = '',
  sourceTerms = [],
  territory = '',
  focus = [],
  candidateTitle = '',
  candidateBody = ''
} = {}) {
  const sourceText = normalize([
    sourceKey, sourceTitle, sourceSummary, territory,
    ...(Array.isArray(sourceTerms) ? sourceTerms : [sourceTerms]),
    ...(Array.isArray(focus) ? focus : [focus])
  ].join(' '));
  const candidateText = normalize([candidateTitle, candidateBody].join(' '));

  for (const [reasonCode, pattern] of OPERATIONAL_TOPIC_PATTERNS) {
    if (pattern.test(sourceText)) {
      return { eligibleForQuestionOrOracle: false, reasonCode, matchedIn: 'source' };
    }
  }
  for (const [reasonCode, pattern] of OPERATIONAL_TOPIC_PATTERNS) {
    if (pattern.test(candidateText)) {
      return { eligibleForQuestionOrOracle: false, reasonCode, matchedIn: 'candidate' };
    }
  }
  return {
    eligibleForQuestionOrOracle: true,
    reasonCode: 'no_operational_commercial_match',
    matchedIn: null
  };
}

export function editorialDestinationDecision(value) {
  const allowed = new Set(['pdi_game', 'vpc_test', 'oracle', 'other_maison_asset', 'none']);
  if (!Array.isArray(value)) return { valid: false, destinations: [] };
  const destinations = [...new Set(value.map(item => String(item ?? '').trim()).filter(Boolean))];
  if (destinations.some(item => !allowed.has(item))) return { valid: false, destinations: [] };
  if (destinations.includes('none') || destinations.includes('other_maison_asset')) {
    return { valid: true, destinations: [] };
  }
  return {
    valid: true,
    destinations: destinations.filter(item => ['pdi_game', 'vpc_test', 'oracle'].includes(item))
  };
}
