const EUROSTAT_ROOT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const EUROSTAT_DOC = 'https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/';
const BASE_ROOT = 'https://www.base.gov.pt/APIBase2/';
const BASE_DOC = 'https://www.base.gov.pt/APIBase2';
const OPENALEX_ROOT = 'https://api.openalex.org/works';
const OPENALEX_DOC = 'https://help.openalex.org/api/';

const BASE_ENDPOINTS = new Set([
  'GetInfoContrato',
  'GetInfoAnuncio',
  'GetInfoModContrat',
  'GetInfoEntidades'
]);

function enabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function compact(value, depth = 0) {
  if (depth > 5) return '[depth-truncated]';
  if (Array.isArray(value)) {
    const kept = value.slice(0, 40).map(item => compact(item, depth + 1));
    if (value.length > 40) kept.push({ _truncated_items: value.length - 40 });
    return kept;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 60);
    const out = {};
    for (const [key, item] of entries) out[key] = compact(item, depth + 1);
    if (Object.keys(value).length > 60) out._truncated_keys = Object.keys(value).length - 60;
    return out;
  }
  if (typeof value === 'string') return value.slice(0, 1000);
  return value;
}

function parseProfiles(raw, family) {
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(String(raw)); }
  catch { throw new Error(`${family}_invalid_queries_json`); }
  if (!Array.isArray(parsed)) throw new Error(`${family}_queries_must_be_array`);
  if (parsed.length > 20) throw new Error(`${family}_too_many_queries`);
  return parsed.map((profile, index) => validateProfile(profile, family, index));
}

function validateKey(value, family) {
  const key = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,59}$/.test(key)) throw new Error(`${family}_invalid_key`);
  return key;
}

function validateTerritory(value, family) {
  const territoryKey = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,79}$/i.test(territoryKey)) throw new Error(`${family}_invalid_territory`);
  return territoryKey;
}

function cadenceHours(value, fallback = 24) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > 168) throw new Error('public_source_invalid_cadence');
  return n;
}

function cleanParams(raw, family) {
  if (raw == null) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${family}_params_must_be_object`);
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(key)) throw new Error(`${family}_invalid_param_key`);
    if (Array.isArray(value)) {
      if (value.length > 100) throw new Error(`${family}_param_array_too_large`);
      out[key] = value.map(x => String(x).slice(0, 300));
    } else if (['string','number','boolean'].includes(typeof value)) {
      out[key] = String(value).slice(0, 1000);
    } else {
      throw new Error(`${family}_invalid_param_value`);
    }
  }
  return out;
}

function validateProfile(profile, family, index) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error(`${family}_invalid_profile_${index}`);
  const base = {
    family,
    key: validateKey(profile.key, family),
    territoryKey: validateTerritory(profile.territoryKey, family),
    cadenceHours: cadenceHours(profile.cadenceHours, family === 'openalex' ? 24 : 12)
  };

  if (family === 'eurostat') {
    const dataset = String(profile.dataset || '').trim();
    if (!/^[A-Za-z0-9_.-]{2,100}$/.test(dataset)) throw new Error('eurostat_invalid_dataset');
    return { ...base, dataset, params: cleanParams(profile.params, family) };
  }

  if (family === 'base_pt') {
    const endpoint = String(profile.endpoint || '').trim();
    if (!BASE_ENDPOINTS.has(endpoint)) throw new Error('base_pt_endpoint_not_allowed');
    return { ...base, endpoint, params: cleanParams(profile.params, family) };
  }

  if (family === 'openalex') {
    const search = String(profile.search || '').trim();
    if (!search || search.length > 2000) throw new Error('openalex_search_required');
    const perPage = Number(profile.perPage ?? 25);
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('openalex_invalid_per_page');
    const sort = profile.sort == null ? 'publication_date:desc' : String(profile.sort).slice(0, 200);
    const select = profile.select == null ? 'id,title,publication_date,primary_topic,open_access' : String(profile.select).slice(0, 500);
    const filter = profile.filter == null ? '' : String(profile.filter).slice(0, 2000);
    return { ...base, search, perPage, sort, select, filter };
  }

  throw new Error('unsupported_public_source_family');
}

export function configuredPublicSourceTasks(env) {
  if (!enabled(env.PUBLIC_DATA_ENABLED)) return [];
  const out = [];

  if (enabled(env.EUROSTAT_ENABLED)) {
    for (const profile of parseProfiles(env.EUROSTAT_QUERIES_JSON, 'eurostat')) {
      out.push({ ...profile, providerId: `eurostat_${profile.key}` });
    }
  }

  if (enabled(env.BASE_PT_ENABLED) && env.BASE_PT_API_TOKEN) {
    for (const profile of parseProfiles(env.BASE_PT_QUERIES_JSON, 'base_pt')) {
      out.push({ ...profile, providerId: `base_pt_${profile.key}` });
    }
  }

  // OpenAlex production use requires an account key; never fall back to the anonymous demo budget.
  if (enabled(env.OPENALEX_ENABLED) && env.OPENALEX_API_KEY) {
    for (const profile of parseProfiles(env.OPENALEX_QUERIES_JSON, 'openalex')) {
      out.push({ ...profile, providerId: `openalex_${profile.key}` });
    }
  }

  return out;
}

export function publicSourceDue(task, scheduledDate) {
  const epochHour = Math.floor(scheduledDate.getTime() / 3600000);
  return epochHour % task.cadenceHours === 0;
}

function appendParams(url, params) {
  for (const [key, raw] of Object.entries(params || {})) {
    if (Array.isArray(raw)) {
      for (const value of raw) url.searchParams.append(key, value);
    } else {
      url.searchParams.set(key, raw);
    }
  }
  return url;
}

function requestForTask(env, task) {
  if (task.family === 'eurostat') {
    const url = appendParams(new URL(encodeURIComponent(task.dataset), EUROSTAT_ROOT), { lang: 'en', ...task.params });
    return {
      url,
      headers: { 'Accept':'application/json', 'User-Agent':'MAISON-JF-Intelligence/1.0' },
      roots: [EUROSTAT_DOC, url.toString()]
    };
  }

  if (task.family === 'base_pt') {
    const url = appendParams(new URL(task.endpoint, BASE_ROOT), task.params);
    return {
      url,
      headers: {
        'Accept':'application/json',
        'User-Agent':'MAISON-JF-Intelligence/1.0',
        '_AcessToken': String(env.BASE_PT_API_TOKEN)
      },
      roots: [BASE_DOC, url.toString()]
    };
  }

  if (task.family === 'openalex') {
    const url = new URL(OPENALEX_ROOT);
    url.searchParams.set('search', task.search);
    url.searchParams.set('per_page', String(task.perPage));
    if (task.sort) url.searchParams.set('sort', task.sort);
    if (task.select) url.searchParams.set('select', task.select);
    if (task.filter) url.searchParams.set('filter', task.filter);
    return {
      url,
      headers: {
        'Accept':'application/json',
        'User-Agent':'MAISON-JF-Intelligence/1.0',
        'Authorization': `Bearer ${env.OPENALEX_API_KEY}`
      },
      roots: [OPENALEX_DOC, url.toString()]
    };
  }

  throw new Error('unsupported_public_source_family');
}

export function publicTaskIdentity(task) {
  if (task.family === 'eurostat') return JSON.stringify({ family:task.family,key:task.key,dataset:task.dataset,params:task.params });
  if (task.family === 'base_pt') return JSON.stringify({ family:task.family,key:task.key,endpoint:task.endpoint,params:task.params });
  if (task.family === 'openalex') return JSON.stringify({
    family:task.family,key:task.key,search:task.search,filter:task.filter,sort:task.sort,select:task.select,perPage:task.perPage
  });
  throw new Error('unsupported_public_source_family');
}

export async function fetchPublicSource(env, task) {
  const request = requestForTask(env, task);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 30000);
  let response;
  try {
    response = await fetch(request.url, {
      method:'GET',
      headers:request.headers,
      signal:controller.signal
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new Error(`${task.family}_http_${response.status}`);
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`${task.family}_invalid_json`); }

  const usage = task.family === 'openalex'
    ? { total_cost: Number(data?.meta?.cost_usd ?? 0) || 0 }
    : null;

  const snapshot = {
    source_family: task.family,
    source_key: task.key,
    retrieved_at: new Date().toISOString(),
    request_url: request.url.toString(),
    data: compact(data)
  };

  return {
    providerId: task.providerId,
    modelId: null,
    sourceClass: 'public_web',
    text: JSON.stringify(snapshot).slice(0, 8800),
    citations: request.roots,
    requestId: response.headers.get('x-request-id') || null,
    usage,
    territoryKey: task.territoryKey
  };
}
