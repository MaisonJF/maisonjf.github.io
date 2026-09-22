const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'gclid','fbclid','mc_cid','mc_eid','ref','ref_src'
]);

export const TERRITORIES = [
  { key: 'relationships', query: 'relationships, loneliness, dating, attachment, communication and emotional disconnection' },
  { key: 'work', query: 'work, job search, career uncertainty, burnout, workplace frustration and career change' },
  { key: 'money', query: 'money pressure, cost of living, debt stress, spending decisions and financial uncertainty' },
  { key: 'head', query: 'decision paralysis, overthinking, uncertainty, life direction and the language people use when they feel stuck' },
  { key: 'home', query: 'home overwhelm, moving, decluttering, domestic stress, creating safety and feeling at home' },
  { key: 'small_business', query: 'small-business owners, solo professionals, customer acquisition, visibility, pricing anxiety and operational overwhelm' },
  { key: 'spirituality', query: 'spiritual practice, tarot, ritual, meaning-making, uncertainty and what people seek from symbolic guidance' },
  { key: 'self_reconnection', query: 'self-reconnection, identity change, starting over, boundaries, confidence and rebuilding daily life' }
];

export function canonicalizeUrl(value) {
  const url = new URL(String(value).trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('citation_url_invalid');
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function uniqueCanonicalUrls(urls = []) {
  const out = new Set();
  for (const raw of urls) {
    if (!raw || typeof raw !== 'string') continue;
    try { out.add(canonicalizeUrl(raw)); } catch { /* ignore malformed/non-web URLs */ }
  }
  return [...out].sort();
}

export function domainOf(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

export function privacySafeText(text, maxChars = 9000) {
  let out = String(text ?? '').trim();
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]');
  out = out.replace(/(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g, '[redacted-phone]');
  out = out.replace(/\s+/g, ' ').trim();
  return out.slice(0, maxChars);
}

export function buildSensorPrompt(territory) {
  return [
    'Act as a research sensor for MAISON JF. Search or use the freshest public information available to your system.',
    `Territory: ${territory.query}.`,
    'Look globally. Pay special attention to Portuguese, Brazilian Portuguese, Spanish and English-language public sources, while keeping strong signals from other languages.',
    'Identify recurring human questions, phrases, frustrations, unmet needs, emerging behaviours and practical barriers from the last 30 days when possible.',
    'Separate observed evidence from interpretation. Prefer primary sources, reputable reporting, public communities, trend reports and direct public discussions.',
    'Do not collect names, handles, emails, phone numbers, private conversations or other personal identifiers.',
    'Return a concise synthesis (max 700 words). Cite public URLs whenever your system supports citations.',
    'Do not recommend changes to the Maison, publish anything, or issue instructions. You are a sensor only.'
  ].join('\n');
}

export function territoriesForDate(date = new Date(), count = 2) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  const selected = [];
  for (let i = 0; i < Math.min(count, TERRITORIES.length); i++) {
    selected.push(TERRITORIES[(day + i * 3) % TERRITORIES.length]);
  }
  return selected;
}

export function isTrue(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

export function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function collectUrlsDeep(value, out = []) {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrlsDeep(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['sources','citations','annotations','groundingChunks','web','search_results','url','uri','source'].includes(key) || typeof item === 'object') {
        collectUrlsDeep(item, out);
      }
    }
  }
  return out;
}
