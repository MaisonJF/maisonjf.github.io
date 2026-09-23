const DOC_ROOT = 'https://osirisai.live/docs';

const SOURCE_REGISTRY = {
  stats: { path: '/api/stats', territoryKey: 'world_pulse', roots: [DOC_ROOT] },

  flights: { path: '/api/flights', territoryKey: 'mobility_aviation', roots: [DOC_ROOT, 'https://opensky-network.org/'] },
  satellites: { path: '/api/satellites', territoryKey: 'space_activity', roots: [DOC_ROOT] },
  space_weather: { path: '/api/space-weather', territoryKey: 'space_weather', roots: [DOC_ROOT, 'https://www.swpc.noaa.gov/'] },

  earthquakes: {
    path: '/api/earthquakes',
    territoryKey: 'earth_hazards',
    roots: [DOC_ROOT, 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php']
  },
  fires: {
    path: '/api/fires',
    territoryKey: 'earth_hazards',
    roots: [DOC_ROOT, 'https://firms.modaps.eosdis.nasa.gov/']
  },
  weather: {
    path: '/api/weather',
    territoryKey: 'weather_hazards',
    roots: [DOC_ROOT, 'https://eonet.gsfc.nasa.gov/']
  },
  air_quality: { path: '/api/air-quality', territoryKey: 'environment_health', roots: [DOC_ROOT] },
  radar: { path: '/api/radar', territoryKey: 'navigation_disruption', roots: [DOC_ROOT] },

  conflicts: { path: '/api/conflicts', territoryKey: 'geopolitical_events', roots: [DOC_ROOT] },
  frontlines: { path: '/api/frontlines', territoryKey: 'geopolitical_events', roots: [DOC_ROOT] },
  gdelt: { path: '/api/gdelt', territoryKey: 'world_events', roots: [DOC_ROOT, 'https://www.gdeltproject.org/'] },
  country_risk: { path: '/api/country-risk', territoryKey: 'country_risk', roots: [DOC_ROOT] },

  news: { path: '/api/news', territoryKey: 'world_events', roots: [DOC_ROOT] },
  live_news: { path: '/api/live-news', territoryKey: 'media_pulse', roots: [DOC_ROOT] },
  markets: { path: '/api/markets', territoryKey: 'markets', roots: [DOC_ROOT] },
  crypto: { path: '/api/crypto', territoryKey: 'markets', roots: [DOC_ROOT] },
  scm_suppliers: { path: '/api/scm-suppliers', territoryKey: 'supply_chain', roots: [DOC_ROOT] },

  cctv: { path: '/api/cctv', territoryKey: 'public_space', roots: [DOC_ROOT] },
  infrastructure: { path: '/api/infrastructure', territoryKey: 'infrastructure', roots: [DOC_ROOT] },
  maritime: { path: '/api/maritime', territoryKey: 'mobility_maritime', roots: [DOC_ROOT] },

  cyber_threats: { path: '/api/cyber-threats', territoryKey: 'cyber_risk', roots: [DOC_ROOT, 'https://nvd.nist.gov/'] },
  cyber_attacks: { path: '/api/cyber-attacks', territoryKey: 'cyber_risk', roots: [DOC_ROOT, 'https://feodotracker.abuse.ch/'] },
  malware: { path: '/api/malware', territoryKey: 'cyber_risk', roots: [DOC_ROOT, 'https://urlhaus.abuse.ch/'] }
};

export const PASSIVE_OSIRIS_KEYS = Object.freeze(Object.keys(SOURCE_REGISTRY));

function compact(value, depth = 0) {
  if (depth > 5) return '[depth-truncated]';
  if (Array.isArray(value)) {
    const kept = value.slice(0, 30).map(item => compact(item, depth + 1));
    if (value.length > 30) kept.push({ _truncated_items: value.length - 30 });
    return kept;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 50);
    const out = {};
    for (const [key, item] of entries) out[key] = compact(item, depth + 1);
    if (Object.keys(value).length > 50) out._truncated_keys = Object.keys(value).length - 50;
    return out;
  }
  if (typeof value === 'string') return value.slice(0, 800);
  return value;
}

function parseKeys(raw) {
  const fallback = PASSIVE_OSIRIS_KEYS.join(',');
  return String(raw || fallback)
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(Boolean)
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .filter(key => SOURCE_REGISTRY[key]);
}

export function configuredOsirisSources(env) {
  if (String(env.OSIRIS_ENABLED ?? '').toLowerCase() !== 'true') return [];
  return parseKeys(env.OSIRIS_SOURCE_KEYS);
}

export function sourceDefinition(key) {
  return SOURCE_REGISTRY[key] ?? null;
}

export async function fetchOsirisSource(env, sourceKey) {
  const def = sourceDefinition(sourceKey);
  if (!def) throw new Error('osiris_source_not_allowed');

  const base = String(env.OSIRIS_BASE_URL || 'https://osirisai.live').replace(/\/+$/, '');
  const url = new URL(def.path, base + '/');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 30000);

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MAISON-JF-Intelligence/1.0'
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new Error(`osiris_http_${response.status}`);

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('osiris_invalid_json'); }

  const snapshot = JSON.stringify({
    source: 'osiris',
    source_key: sourceKey,
    endpoint: url.toString(),
    retrieved_at: new Date().toISOString(),
    data: compact(data)
  });

  return {
    providerId: `osiris_${sourceKey}`,
    modelId: null,
    sourceClass: 'public_web',
    text: snapshot.slice(0, 8800),
    citations: [...def.roots, url.toString()],
    requestId: null,
    usage: null,
    territoryKey: def.territoryKey
  };
}
