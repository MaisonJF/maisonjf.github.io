import { collectUrlsDeep, uniqueCanonicalUrls } from './core.js';

async function jsonFetch(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) {
      const err = new Error(`provider_http_${response.status}`);
      err.status = response.status;
      err.providerBody = text.slice(0, 1200);
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function enabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function openAIText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const parts = [];
  for (const item of data.output ?? []) {
    if (item.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n');
}

export async function callCloudflareWorkersAI(env, prompt) {
  if (!env.AI || !env.WORKERS_AI_MODEL) throw new Error('cloudflare_workers_ai_not_configured');
  const data = await env.AI.run(env.WORKERS_AI_MODEL, {
    prompt,
    max_tokens: 1600
  });
  const text =
    (typeof data === 'string' && data) ||
    (typeof data?.response === 'string' && data.response) ||
    (typeof data?.result?.response === 'string' && data.result.response) ||
    '';
  return {
    providerId: 'cloudflare_workers_ai',
    modelId: env.WORKERS_AI_MODEL,
    sourceClass: 'ai_api',
    text,
    citations: [],
    requestId: null,
    usage: data?.usage ?? null
  };
}

function openRouterText(data) {
  return data?.choices?.[0]?.message?.content ?? '';
}

export function isZeroCostOpenRouterModel(model) {
  const value = String(model ?? '').trim().toLowerCase();
  return value === 'openrouter/free' || value.endsWith(':free');
}

export function openRouterZeroCostModels(env) {
  const models = [];
  const primary = String(env.OPENROUTER_MODEL ?? '').trim();
  if (primary) models.push(primary);
  if (env.OPENROUTER_FALLBACK_MODELS_JSON) {
    let parsed;
    try { parsed = JSON.parse(String(env.OPENROUTER_FALLBACK_MODELS_JSON)); }
    catch { throw new Error('openrouter_invalid_fallback_models_json'); }
    if (!Array.isArray(parsed)) throw new Error('openrouter_fallback_models_must_be_array');
    for (const item of parsed) {
      const model = String(item ?? '').trim();
      if (model) models.push(model);
    }
  }
  const unique = [...new Set(models)];
  if (!unique.length || unique.some(model => !isZeroCostOpenRouterModel(model))) {
    throw new Error('openrouter_paid_model_forbidden');
  }
  return unique;
}

export async function callOpenRouterModel(env, prompt, model) {
  if (!env.OPENROUTER_API_KEY) throw new Error('openrouter_not_configured');
  if (!isZeroCostOpenRouterModel(model)) throw new Error('openrouter_paid_model_forbidden');
  const data = await jsonFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://maison-jf.com',
      'X-OpenRouter-Title': 'MAISON JF Intelligence'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1600,
      temperature: 0.35,
      provider: {
        allow_fallbacks: false,
        max_price: { prompt: 0, completion: 0 }
      }
    })
  });
  return {
    providerId: 'openrouter',
    modelId: data.model ?? model,
    sourceClass: 'ai_api',
    text: openRouterText(data),
    citations: [],
    requestId: data.id ?? null,
    usage: data.usage ?? null
  };
}

export async function callOsirisGateway(env, prompt) {
  if (!env.OSIRIS_GATEWAY_API_KEY || !env.OSIRIS_GATEWAY_MODEL) throw new Error('osiris_gateway_not_configured');
  const base = String(env.OSIRIS_GATEWAY_BASE_URL || 'https://ai.osiris-code.com/v1').replace(/\/+$/, '');
  const data = await jsonFetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OSIRIS_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OSIRIS_GATEWAY_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1600,
      temperature: 0.3
    })
  });
  return {
    providerId: 'osiris_gateway',
    modelId: data.model ?? env.OSIRIS_GATEWAY_MODEL,
    sourceClass: 'ai_api',
    text: openRouterText(data),
    citations: [],
    requestId: data.id ?? null,
    usage: data.usage ?? null
  };
}

export async function callOpenRouter(env, prompt) {
  const models = openRouterZeroCostModels(env);
  let lastError = null;
  for (const model of models) {
    try { return await callOpenRouterModel(env,prompt,model); }
    catch (error) { lastError=error; }
  }
  throw lastError ?? new Error('openrouter_all_free_models_failed');
}

export async function callOpenAI(env, prompt) {
  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) throw new Error('openai_not_configured');
  const data = await jsonFetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      input: prompt,
      tools: [{ type: 'web_search', search_context_size: 'low' }],
      include: ['web_search_call.action.sources'],
      max_output_tokens: 1600,
      store: false
    })
  });
  return {
    providerId: 'openai', modelId: data.model ?? env.OPENAI_MODEL,
    sourceClass: 'ai_web_grounded', text: openAIText(data),
    citations: uniqueCanonicalUrls(collectUrlsDeep(data.output ?? [])),
    requestId: data.id ?? null, usage: data.usage ?? null
  };
}

function geminiText(data) {
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map(part => typeof part.text === 'string' ? part.text : '')
    .filter(Boolean).join('\n');
}

export async function callGemini(env, prompt) {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) throw new Error('gemini_not_configured');
  const model = encodeURIComponent(env.GEMINI_MODEL);
  const data = await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 1600, temperature: 0.3 }
    })
  });
  const grounding = data.candidates?.[0]?.groundingMetadata ?? {};
  return {
    providerId: 'google_gemini', modelId: env.GEMINI_MODEL,
    sourceClass: 'ai_web_grounded', text: geminiText(data),
    citations: uniqueCanonicalUrls(collectUrlsDeep(grounding)),
    requestId: null, usage: data.usageMetadata ?? null
  };
}

export async function callPerplexity(env, prompt) {
  if (!env.PERPLEXITY_API_KEY) throw new Error('perplexity_not_configured');
  const model = env.PERPLEXITY_MODEL || 'sonar';
  const data = await jsonFetch('https://api.perplexity.ai/v1/sonar', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1600,
      temperature: 0.3,
      web_search_options: { search_mode: 'web', return_related_questions: false, return_images: false }
    })
  });
  const text = data.choices?.[0]?.message?.content ?? '';
  const urls = [...(data.citations ?? []), ...(data.search_results ?? []).map(x => x?.url).filter(Boolean)];
  return {
    providerId: 'perplexity', modelId: data.model ?? model,
    sourceClass: 'ai_web_grounded', text,
    citations: uniqueCanonicalUrls(urls), requestId: data.id ?? null, usage: data.usage ?? null
  };
}

export async function callAnthropic(env, prompt) {
  if (!env.ANTHROPIC_API_KEY || !env.ANTHROPIC_MODEL) throw new Error('anthropic_not_configured');
  const data = await jsonFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1600,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const text = (data.content ?? []).filter(x => x?.type === 'text').map(x => x.text).join('\n');
  return {
    providerId: 'anthropic', modelId: data.model ?? env.ANTHROPIC_MODEL,
    sourceClass: 'ai_api', text, citations: [], requestId: data.id ?? null, usage: data.usage ?? null
  };
}

export const PROVIDERS = {
  cloudflare_workers_ai: callCloudflareWorkersAI,
  osiris_gateway: callOsirisGateway,
  openrouter: callOpenRouter,
  openai: callOpenAI,
  google_gemini: callGemini,
  perplexity: callPerplexity,
  anthropic: callAnthropic
};

export function configuredProviders(env) {
  const providers = [];
  if (enabled(env.WORKERS_AI_ENABLED) && env.AI && env.WORKERS_AI_MODEL) providers.push('cloudflare_workers_ai');
  if (enabled(env.OSIRIS_GATEWAY_ENABLED) && env.OSIRIS_GATEWAY_API_KEY && env.OSIRIS_GATEWAY_MODEL) providers.push('osiris_gateway');
  if (enabled(env.OPENROUTER_ENABLED) && env.OPENROUTER_API_KEY) {
    try { openRouterZeroCostModels(env); providers.push('openrouter'); } catch {}
  }
  if (enabled(env.OPENAI_ENABLED) && env.OPENAI_API_KEY && env.OPENAI_MODEL) providers.push('openai');
  if (enabled(env.GEMINI_ENABLED) && env.GEMINI_API_KEY && env.GEMINI_MODEL) providers.push('google_gemini');
  if (enabled(env.PERPLEXITY_ENABLED) && env.PERPLEXITY_API_KEY) providers.push('perplexity');
  if (enabled(env.ANTHROPIC_ENABLED) && env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL) providers.push('anthropic');
  return providers;
}

export function configuredZeroCostModelSpecs(env) {
  const specs=[];
  if (enabled(env.OPENROUTER_ENABLED) && env.OPENROUTER_API_KEY) {
    try {
      for (const model of openRouterZeroCostModels(env)) {
        specs.push({key:`openrouter:${model}`,providerId:'openrouter',modelId:model});
      }
    } catch {}
  }
  if (enabled(env.WORKERS_AI_ENABLED) && enabled(env.WORKERS_AI_ZERO_COST) && env.AI && env.WORKERS_AI_MODEL) {
    specs.push({key:`cloudflare_workers_ai:${env.WORKERS_AI_MODEL}`,providerId:'cloudflare_workers_ai',modelId:env.WORKERS_AI_MODEL});
  }
  if (enabled(env.OSIRIS_GATEWAY_ENABLED) && enabled(env.OSIRIS_GATEWAY_ZERO_COST) && env.OSIRIS_GATEWAY_API_KEY && env.OSIRIS_GATEWAY_MODEL) {
    specs.push({key:`osiris_gateway:${env.OSIRIS_GATEWAY_MODEL}`,providerId:'osiris_gateway',modelId:env.OSIRIS_GATEWAY_MODEL});
  }
  if (enabled(env.OPENAI_ENABLED) && enabled(env.OPENAI_ZERO_COST) && env.OPENAI_API_KEY && env.OPENAI_MODEL) {
    specs.push({key:`openai:${env.OPENAI_MODEL}`,providerId:'openai',modelId:env.OPENAI_MODEL});
  }
  if (enabled(env.GEMINI_ENABLED) && enabled(env.GEMINI_ZERO_COST) && env.GEMINI_API_KEY && env.GEMINI_MODEL) {
    specs.push({key:`google_gemini:${env.GEMINI_MODEL}`,providerId:'google_gemini',modelId:env.GEMINI_MODEL});
  }
  if (enabled(env.PERPLEXITY_ENABLED) && enabled(env.PERPLEXITY_ZERO_COST) && env.PERPLEXITY_API_KEY) {
    const model=env.PERPLEXITY_MODEL||'sonar';
    specs.push({key:`perplexity:${model}`,providerId:'perplexity',modelId:model});
  }
  if (enabled(env.ANTHROPIC_ENABLED) && enabled(env.ANTHROPIC_ZERO_COST) && env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL) {
    specs.push({key:`anthropic:${env.ANTHROPIC_MODEL}`,providerId:'anthropic',modelId:env.ANTHROPIC_MODEL});
  }
  return specs;
}

export async function callZeroCostModel(env,spec,prompt) {
  if (!spec?.providerId) throw new Error('zero_cost_model_spec_invalid');
  if (spec.providerId==='openrouter') return await callOpenRouterModel(env,prompt,spec.modelId);
  const caller=PROVIDERS[spec.providerId];
  if(!caller)throw new Error('zero_cost_provider_unknown');
  return await caller(env,prompt);
}
