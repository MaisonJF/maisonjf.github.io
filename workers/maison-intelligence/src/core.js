import { VPC_OCEAN_SIGNALS } from '../../../functions/_lib/vpc-ocean-signals.generated.js';

const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'gclid','fbclid','mc_cid','mc_eid','ref','ref_src'
]);

export const DISCOVERY_TERRITORY = { key: 'organic_discovery', query: 'free, scalable organic discovery for MAISON JF: places, searches, conversations, formats and distribution surfaces where people who do not yet know the brand can recognise themselves in a Maison idea before purchase intent exists' };

export const ATELIER_TERRITORY = { key: 'atelier', query: 'transferable mechanisms of excellence in psychology, behaviour, culture, advertising, entertainment, luxury, design, retail, storytelling, UX, virality and brand building that MAISON JF can reinterpret and test without copying expression or identity' };

export const TERRITORIES = VPC_OCEAN_SIGNALS
  .filter(ocean=>ocean?.id&&!['descoberta-organica-e-reconhecimento-da-maison','atelier-principios-transferiveis-e-dna-maison'].includes(String(ocean.id)))
  .map(ocean=>({
    key:String(ocean.id),
    query:[
      String(ocean.painLanguage||'').trim(),
      String(ocean.intent||'').trim(),
      Array.isArray(ocean.themes)&&ocean.themes.length?`Related language/themes: ${ocean.themes.slice(0,12).join(', ')}`:''
    ].filter(Boolean).join(' ')
  }));

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
  if (territory.key === ATELIER_TERRITORY.key) {
    return [
      'Act as a read-only Atelier research sensor for MAISON JF. Study excellence, not audience demand.',
      'Mission: find documented mechanisms of attention, identification, memory, desire, participation, propagation, conversion and cultural meaning that MAISON JF can understand, reinterpret and test.',
      'Starting references may include Barnum/Forer and other psychology or behavioural mechanisms; P. T. Barnum where relevant; Martha Stewart; Alex Hormozi; Dior; Saint Laurent; Tom Ford; Apple. Do not limit discovery to these names, industries, countries or eras.',
      'Fame is not evidence of excellence. Prefer documented cases, primary material, reputable research and observable outcomes. Discover lesser-known masters when they solved a Maison-relevant problem exceptionally well.',
      'Never copy voice, protected expression, identity or surface aesthetics. Extract the mechanism and transferable principle, then propose a distinctly Maison hypothesis.',
      'For every useful case distinguish: master/case; observed evidence; mechanism; why it may work; transferable principle; possible Maison application; measurable hypothesis; risks or counter-evidence.',
      'Psychological mechanisms may be combined. Treat them as testable hypotheses, not magic tricks or universal truths.',
      'Zero-cost first and existing-assets first. Prefer applications that can improve current discovery, content, Jogo, Oráculo, tests, ebooks, guides, products or experiences before proposing new infrastructure.',
      'Do not collect personal identifiers. Return a concise synthesis (max 900 words) with public citations whenever supported.',
      'Do not publish, contact anyone, spend money, change the site, catalogue, prices or checkout. You are a sensor only.'
    ].join('\\n');
  }
  if (territory.specialistOcean) {
    const ocean=territory.specialistOcean;
    return [
      'Act as a read-only specialist research sensor for the MAISON JF intelligence network.',
      `Specialist Ocean: ${ocean.display_name} [${ocean.ocean_key}] — pillar: ${ocean.pillar_key}.`,
      `Mission: ${ocean.mission}.`,
      `Focus areas: ${(ocean.focus||[]).join('; ')}.`,
      `Connected Oceans to consider for cross-signals: ${(ocean.connections||[]).join(', ')}.`,
      'Use the freshest public information available to your system. Search the sources most relevant to this specific Ocean rather than returning a generic trend summary.',
      'Prefer primary sources, official catalogues and technical documents, reputable research/reporting, search signals and direct public discussions. Cite public URLs and dates whenever supported.',
      'Separate observed facts, public interest signals, interpretation, uncertainty and Maison JF hypotheses. Never invent sources, popularity, recipes, test results, current availability or absence of competitors.',
      'For supplier or Portugal-market questions, record the exact geography, price/conditions where available, source and observation date. For scent formulas, distinguish an idea from a physically tested formula and from a safety-validated product.',
      'Do not copy a brand’s protected expression or identity. Do not collect personal identifiers or private conversations.',
      'Return a concise synthesis (max 700 words). Do not publish, contact anyone, spend money or alter any public system. You are a sensor only.'
    ].join('\\n');
  }
  if (territory.key === DISCOVERY_TERRITORY.key) {
    return [
      'Act as a read-only organic-discovery research sensor for MAISON JF. Use the freshest public information available to your system.',
      'Mission: find free and scalable places, moments, searches, conversations and formats where people who do not yet know MAISON JF could recognise themselves in a Maison idea before they have purchase intent.',
      'Do not assume the person already wants tarot, an ebook, mentoring, rituals, aromas or any named Maison product. Look for latent needs, tensions, desires, contradictions, behaviours and language that can produce the reaction: this is about me.',
      'Prioritise observable attention and distribution surfaces capable of sending qualified organic visits to maison-jf.com. Prefer opportunities with repeatable or compounding reach over one-off link placement.',
      'Zero-cost first: do not propose paid advertising, sponsorship, paid placement or a new paid tool.',
      'Existing-assets first: identify the human signal and discovery surface; do not invent a new Maison product when an existing page, test, ebook, game, service, product or piece of content could answer it.',
      'For every useful signal distinguish: observed evidence; interpretation; where the attention exists; why a person may identify; a zero-cost way MAISON could appear there; the most appropriate type of existing Maison destination; and how real traffic/outcome could be measured.',
      'Look globally. Pay special attention to Portuguese, Brazilian Portuguese, Spanish and English-language public sources, while keeping unusually strong signals from other languages.',
      'Prefer primary sources, reputable reporting, search/trend evidence and direct public discussions. Never treat an uncited model assertion as proof of demand.',
      'Do not collect names, handles, emails, phone numbers, private conversations or other personal identifiers.',
      'Return a concise synthesis (max 900 words). Cite public URLs whenever your system supports citations.',
      'Do not publish, contact anyone, spend money, change the site, catalogue, prices or checkout. You are a sensor only.'
    ].join('\\n');
  }
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

export function territoriesForDate(date = new Date(), count = 2, specialistOceans = []) {
  // The legacy human-signal pool continues to feed PDI/Oráculo and discovery.
  // Half the bounded sensor slots now rotate through dedicated specialist Oceans;
  // this adds a new research lane without replacing the existing human-signal mesh.
  const slot = Math.floor(date.getTime() / (3 * 3600000));
  const limit = Math.max(0, Math.min(count, TERRITORIES.length + 2 + specialistOceans.length));
  if (!limit) return [];
  const pool=[...TERRITORIES,DISCOVERY_TERRITORY,ATELIER_TERRITORY];
  const specialistCount=specialistOceans.length?Math.min(limit,Math.max(1,Math.floor(limit/2))):0;
  const baseCount=limit-specialistCount;
  const selected=[];
  for(let i=0;i<Math.min(baseCount,pool.length);i++){
    selected.push(pool[(slot+i*3)%pool.length]);
  }
  for(let i=0;i<specialistCount;i++){
    const ocean=specialistOceans[(slot*specialistCount+i)%specialistOceans.length];
    if(!ocean)continue;
    selected.push({
      key:ocean.ocean_key,
      query:[ocean.display_name,ocean.mission,`Focus: ${(ocean.focus||[]).slice(0,8).join(', ')}`].filter(Boolean).join('. '),
      specialistOcean:{
        ocean_key:ocean.ocean_key,
        display_name:ocean.display_name,
        pillar_key:ocean.pillar_key,
        mission:ocean.mission,
        focus:Array.isArray(ocean.focus)?ocean.focus.slice(0,12):[],
        connections:Array.isArray(ocean.connections)?ocean.connections.slice(0,12):[]
      }
    });
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
