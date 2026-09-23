const SOURCE_REGISTRY = {
  stats: {
    path: '/api/stats',
    territoryKey: 'world_pulse',
    roots: ['https://osirisai.live/docs']
  },
  earthquakes: {
    path: '/api/earthquakes',
    territoryKey: 'earth_hazards',
    roots: [
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
      'https://osirisai.live/docs'
    ]
  },
  fires: {
    path: '/api/fires',
    territoryKey: 'earth_hazards',
    roots: [
      'https://firms.modaps.eosdis.nasa.gov/',
      'https://osirisai.live/docs'
    ]
  },
  weather: {
    path: '/api/weather',
    territoryKey: 'weather_hazards',
    roots: [
      'https://eonet.gsfc.nasa.gov/',
      'https://osirisai.live/docs'
    ]
  },
  news: {
    path: '/api/news',
    territoryKey: 'world_events',
    roots: ['https://osirisai.live/docs']
  },
  markets: {
    path: '/api/markets',
    territoryKey: 'markets',
    roots: ['https://osirisai.live/docs']
  },
  cctv: {
    path: '/api/cctv',
    territoryKey: 'public_space',
    roots: ['https://osirisai.live/docs']
  }
};

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
  const fallback = 'stats,earthquakes,fires,weather,news,markets';
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
